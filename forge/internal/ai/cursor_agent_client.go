package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"forge-engine/internal/config"
	"forge-engine/internal/git"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type CursorAgentClient struct {
	config     *config.CursorConfig
	gitManager *git.Manager
	httpClient *http.Client
}

func NewCursorAgentClient(cfg *config.CursorConfig, gitMgr *git.Manager) *CursorAgentClient {
	return &CursorAgentClient{
		config:     cfg,
		gitManager: gitMgr,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GenerateCode implements CodeGenerator interface
func (c *CursorAgentClient) GenerateCode(ctx context.Context, prompt string, outputDir string) (map[string]string, error) {
	cursorLogger := logger.Logger.With(zap.String("component", "cursor_agent_client"))

	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	// Build enhanced prompt with tech stack requirements
	enhancedPrompt := c.buildEnhancedPrompt(prompt)

	// Step 1: Create or use GitHub repository
	var repoURL string
	var repoName string
	if c.config.Repository.CreateTempRepo {
		repoName = c.sanitizeRepoName(fmt.Sprintf("forge-%d", time.Now().Unix()))
		var err error
		repoURL, err = c.gitManager.CreateGitHubRepository(ctx, repoName, true)
		if err != nil {
			cursorLogger.Error("Failed to create GitHub repository", 
				zap.Error(err),
				zap.String("hint", "Please ensure git.token and git.username (or git.organization) are configured in your config file"))
			cursorLogger.Warn("Falling back to template generation")
			return c.generateFromTemplate(prompt, outputDir)
		}
		cursorLogger.Info("Created GitHub repository", zap.String("repo_url", repoURL))
	} else {
		if c.config.Repository.BaseRepository == "" {
			return nil, fmt.Errorf("base_repository is required when create_temp_repo is false")
		}
		repoURL = c.config.Repository.BaseRepository
		cursorLogger.Info("Using existing repository", zap.String("repo_url", repoURL))
	}

	// Step 2: Create Agent with enhanced prompt
	agentID, err := c.createAgent(ctx, repoURL, enhancedPrompt)
	if err != nil {
		cursorLogger.Warn("Failed to create agent, falling back to template generation", zap.Error(err))
		return c.generateFromTemplate(prompt, outputDir)
	}
	cursorLogger.Info("Agent created", zap.String("agent_id", agentID))

	// Step 3: Poll agent status
	agentStatus, err := c.pollAgentStatus(ctx, agentID)
	if err != nil {
		cursorLogger.Warn("Agent polling failed, falling back to template generation", zap.Error(err))
		// Try to cleanup agent
		_ = c.cleanupAgent(ctx, agentID)
		return c.generateFromTemplate(prompt, outputDir)
	}

	if agentStatus.Status == "FAILED" {
		cursorLogger.Error("Agent failed", zap.String("agent_id", agentID))
		_ = c.cleanupAgent(ctx, agentID)
		return c.generateFromTemplate(prompt, outputDir)
	}

	// Step 4: Fetch generated code
	files, err := c.fetchGeneratedCode(ctx, agentID, agentStatus, repoURL, outputDir)
	if err != nil {
		cursorLogger.Warn("Failed to fetch generated code, falling back to template generation", zap.Error(err))
		_ = c.cleanupAgent(ctx, agentID)
		return c.generateFromTemplate(prompt, outputDir)
	}

	// Step 5: Cleanup agent (optional)
	if c.config.Repository.CreateTempRepo {
		_ = c.cleanupAgent(ctx, agentID)
	}

	cursorLogger.Info("Code generation completed", zap.Int("files_count", len(files)))
	return files, nil
}

type AgentCreateRequest struct {
	Source   AgentSource            `json:"source"`
	Target   AgentTarget            `json:"target,omitempty"`
	Prompt   AgentPrompt            `json:"prompt"`
	Model    string                 `json:"model,omitempty"`
}

type AgentSource struct {
	Repository string `json:"repository"`
	Ref        string `json:"ref"`
}

type AgentTarget struct {
	BranchName string `json:"branchName"`
	AutoCreatePr bool `json:"autoCreatePr"`
}

type AgentPrompt struct {
	Text string `json:"text"`
}

type AgentCreateResponse struct {
	ID string `json:"id"`
}

type AgentStatus struct {
	ID      string      `json:"id"`
	Status  string      `json:"status"`
	Target  AgentTarget `json:"target"`
	Summary string      `json:"summary"`
}

func (c *CursorAgentClient) createAgent(ctx context.Context, repoURL string, prompt string) (string, error) {
	// Generate branch name
	branchName := fmt.Sprintf("cursor/forge-%d", time.Now().Unix())

	// Determine default branch (try configured value, then try to detect)
	defaultBranch := c.config.Repository.DefaultBranch
	if defaultBranch == "" {
		defaultBranch = "main" // fallback to main
	}

	// Try to detect the actual default branch from GitHub
	detectedBranch, err := c.detectDefaultBranch(ctx, repoURL)
	if err == nil && detectedBranch != "" {
		defaultBranch = detectedBranch
		cursorLogger := logger.Logger.With(zap.String("component", "cursor_agent_client"))
		cursorLogger.Info("Detected default branch", zap.String("branch", defaultBranch), zap.String("repo", repoURL))
	}

	reqBody := AgentCreateRequest{
		Source: AgentSource{
			Repository: repoURL,
			Ref:        defaultBranch,
		},
		Target: AgentTarget{
			BranchName:  branchName,
			AutoCreatePr: false,
		},
		Prompt: AgentPrompt{
			Text: prompt,
		},
	}

	if c.config.Model != "" {
		reqBody.Model = c.config.Model
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Log request body for debugging (use Info level to ensure it's logged)
	cursorLogger := logger.Logger.With(zap.String("component", "cursor_agent_client"))
	cursorLogger.Info("Creating agent request", 
		zap.String("request_body", string(jsonData)),
		zap.String("repo_url", repoURL))

	url := fmt.Sprintf("%s/v0/agents", c.config.APIBaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Basic Authentication (using API key as username, empty password)
	req.SetBasicAuth(c.config.APIKey, "")
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to create agent: status %d, body: %s", resp.StatusCode, string(body))
	}

	var agentResp AgentCreateResponse
	if err := json.NewDecoder(resp.Body).Decode(&agentResp); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return agentResp.ID, nil
}

// detectDefaultBranch tries to detect the default branch from GitHub API
func (c *CursorAgentClient) detectDefaultBranch(ctx context.Context, repoURL string) (string, error) {
	// Extract owner and repo from URL
	// Format: https://github.com/owner/repo
	parts := strings.Split(strings.TrimPrefix(repoURL, "https://github.com/"), "/")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid repository URL format")
	}
	owner := parts[0]
	repo := parts[1]

	// Try to get repository info from GitHub API
	// Note: This requires git token, but we can try without auth first
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}

	// Try without auth first (works for public repos)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		var repoInfo struct {
			DefaultBranch string `json:"default_branch"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&repoInfo); err == nil && repoInfo.DefaultBranch != "" {
			return repoInfo.DefaultBranch, nil
		}
	}

	return "", fmt.Errorf("failed to detect default branch")
}

func (c *CursorAgentClient) pollAgentStatus(ctx context.Context, agentID string) (*AgentStatus, error) {
	startTime := time.Now()
	ticker := time.NewTicker(c.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ticker.C:
			if time.Since(startTime) > c.config.MaxWaitTime {
				return nil, fmt.Errorf("agent polling timeout after %v", c.config.MaxWaitTime)
			}

			status, err := c.getAgentStatus(ctx, agentID)
			if err != nil {
				return nil, fmt.Errorf("failed to get agent status: %w", err)
			}

			if status.Status == "FINISHED" || status.Status == "FAILED" {
				return status, nil
			}

			logger.Logger.Info("Agent still running", 
				zap.String("agent_id", agentID), 
				zap.String("status", status.Status))
		}
	}
}

func (c *CursorAgentClient) getAgentStatus(ctx context.Context, agentID string) (*AgentStatus, error) {
	url := fmt.Sprintf("%s/v0/agents/%s", c.config.APIBaseURL, agentID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(c.config.APIKey, "")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get agent status: status %d, body: %s", resp.StatusCode, string(body))
	}

	var status AgentStatus
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &status, nil
}

func (c *CursorAgentClient) fetchGeneratedCode(ctx context.Context, agentID string, agentStatus *AgentStatus, repoURL string, outputDir string) (map[string]string, error) {
	// Try to get code from the branch first if we have branch name
	if agentStatus.Target.BranchName != "" && repoURL != "" {
		// Try to clone the branch and extract files
		branchName := agentStatus.Target.BranchName
		
		// Create a temporary directory for cloning
		cloneDir := filepath.Join(outputDir, "clone-temp")
		defer os.RemoveAll(cloneDir)
		
		err := c.gitManager.CloneBranch(ctx, repoURL, branchName, cloneDir)
		if err == nil {
			// Successfully cloned, extract files
			files, err := c.gitManager.GetBranchFiles(cloneDir)
			if err == nil && len(files) > 0 {
				// Write files to output directory
				for filePath, content := range files {
					fullPath := filepath.Join(outputDir, filePath)
					dir := filepath.Dir(fullPath)
					if err := os.MkdirAll(dir, 0755); err != nil {
						continue
					}
					_ = os.WriteFile(fullPath, []byte(content), 0644)
				}
				return files, nil
			}
		}
		// If cloning failed, fall through to conversation API
	}

	// Fallback: Get code from conversation
	return c.fetchCodeFromConversation(ctx, agentID, outputDir)
}

func (c *CursorAgentClient) fetchCodeFromConversation(ctx context.Context, agentID string, outputDir string) (map[string]string, error) {
	url := fmt.Sprintf("%s/v0/agents/%s/conversation", c.config.APIBaseURL, agentID)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(c.config.APIKey, "")
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get conversation: status %d, body: %s", resp.StatusCode, string(body))
	}

	var convResponse struct {
		ID       string `json:"id"`
		Messages []struct {
			ID   string `json:"id"`
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"messages"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&convResponse); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Parse code blocks from assistant messages
	files := make(map[string]string)
	for _, msg := range convResponse.Messages {
		if msg.Type == "assistant_message" {
			parsedFiles := c.parseCodeBlocks(msg.Text)
			for path, content := range parsedFiles {
				files[path] = content
			}
		}
	}

	// If no files found in conversation, fall back to template
	if len(files) == 0 {
		return nil, fmt.Errorf("no code found in conversation")
	}

	// Write files to output directory
	for filePath, content := range files {
		fullPath := filepath.Join(outputDir, filePath)
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}

		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			return nil, fmt.Errorf("failed to write file %s: %w", fullPath, err)
		}
	}

	return files, nil
}

func (c *CursorAgentClient) parseCodeBlocks(text string) map[string]string {
	files := make(map[string]string)
	
	// Look for markdown code blocks with file paths
	// Pattern: ```language:path/to/file
	// or ```path/to/file
	// or just code blocks that might contain file paths in comments
	
	lines := strings.Split(text, "\n")
	var currentBlock []string
	var currentPath string
	inCodeBlock := false
	
	for _, line := range lines {
		if strings.HasPrefix(line, "```") {
			if inCodeBlock {
				// End of code block
				if currentPath != "" && len(currentBlock) > 0 {
					files[currentPath] = strings.Join(currentBlock, "\n")
				}
				currentBlock = nil
				currentPath = ""
				inCodeBlock = false
			} else {
				// Start of code block
				codeBlockHeader := strings.TrimPrefix(line, "```")
				// Try to extract file path
				parts := strings.Fields(codeBlockHeader)
				if len(parts) > 0 {
					// Check if it looks like a file path
					if strings.Contains(parts[0], "/") || strings.Contains(parts[0], ".") {
						currentPath = parts[0]
					} else {
						// Use line number or generate path
						currentPath = fmt.Sprintf("file_%d.txt", len(files)+1)
					}
				} else {
					currentPath = fmt.Sprintf("file_%d.txt", len(files)+1)
				}
				inCodeBlock = true
			}
		} else if inCodeBlock {
			currentBlock = append(currentBlock, line)
		}
	}
	
	// Handle last block if still open
	if inCodeBlock && currentPath != "" && len(currentBlock) > 0 {
		files[currentPath] = strings.Join(currentBlock, "\n")
	}
	
	return files
}

func (c *CursorAgentClient) cleanupAgent(ctx context.Context, agentID string) error {
	url := fmt.Sprintf("%s/v0/agents/%s", c.config.APIBaseURL, agentID)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth(c.config.APIKey, "")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		logger.Logger.Warn("Failed to delete agent", 
			zap.String("agent_id", agentID),
			zap.Int("status", resp.StatusCode),
			zap.String("body", string(body)))
	}

	return nil
}

func (c *CursorAgentClient) sanitizeRepoName(name string) string {
	name = strings.ToLower(name)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")
	
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	
	name = strings.Trim(result.String(), "-")
	if len(name) < 3 {
		name = fmt.Sprintf("repo-%s", name)
	}
	
	return name
}

// generateFromTemplate is a fallback when Cursor API fails
func (c *CursorAgentClient) generateFromTemplate(prompt string, outputDir string) (map[string]string, error) {
	logger.Logger.Info("Generating code from template as fallback")
	
	// Use similar template generation as KiroClient
	files := make(map[string]string)
	promptLower := strings.ToLower(prompt)
	
	if strings.Contains(promptLower, "web") || strings.Contains(promptLower, "http") || strings.Contains(promptLower, "server") {
		files["main.go"] = generateWebServerCode(prompt)
		files["go.mod"] = generateGoMod()
		files["Dockerfile"] = generateDockerfile()
		files["README.md"] = generateReadme(prompt)
	} else if strings.Contains(promptLower, "api") || strings.Contains(promptLower, "rest") {
		files["main.go"] = generateAPIServerCode(prompt)
		files["go.mod"] = generateGoMod()
		files["Dockerfile"] = generateDockerfile()
		files["README.md"] = generateReadme(prompt)
	} else {
		files["main.go"] = generateGenericCode(prompt)
		files["go.mod"] = generateGoMod()
		files["Dockerfile"] = generateDockerfile()
		files["README.md"] = generateReadme(prompt)
	}
	
	// Write files
	for filePath, content := range files {
		fullPath := filepath.Join(outputDir, filePath)
		dir := filepath.Dir(fullPath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
		
		if err := os.WriteFile(fullPath, []byte(content), 0644); err != nil {
			return nil, fmt.Errorf("failed to write file %s: %w", fullPath, err)
		}
	}
	
	return files, nil
}

// Template generation functions (similar to KiroClient)
func generateWebServerCode(prompt string) string {
	return `package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/health", healthHandler)
	
	if _, err := os.Stat("static"); err == nil {
		http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("static"))))
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello World! Generated by Forge Engine\n")
	fmt.Fprintf(w, "Request: %s %s\n", r.Method, r.URL.Path)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "{\"status\":\"ok\",\"service\":\"generated-app\"}")
}
`
}

func generateAPIServerCode(prompt string) string {
	return `package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/api/users", usersHandler)
	http.HandleFunc("/api/health", healthHandler)

	log.Printf("API Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	switch r.Method {
	case "GET":
		json.NewEncoder(w).Encode(map[string]interface{}{
			"users": []map[string]string{
				{"id": "1", "name": "John Doe", "email": "john@example.com"},
				{"id": "2", "name": "Jane Smith", "email": "jane@example.com"},
			},
		})
	case "POST":
		json.NewEncoder(w).Encode(map[string]string{
			"message": "User created successfully",
			"id": "3",
		})
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"service": "api-server",
	})
}
`
}

func generateGenericCode(prompt string) string {
	return fmt.Sprintf(`package main

import (
	"fmt"
	"log"
)

func main() {
	log.Println("Starting generated application...")
	fmt.Println("Hello from Forge Engine generated application!")
	
	fmt.Printf("Generated based on prompt: %s\n", %q)
}
`, prompt)
}

func generateGoMod() string {
	return `module generated-app

go 1.21

require (
	// Add dependencies as needed
)
`
}

func generateDockerfile() string {
	return `FROM golang:1.21-alpine AS builder

WORKDIR /app

# 设置Go代理
ENV GOPROXY=https://goproxy.cn

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
`
}

func generateReadme(prompt string) string {
	return fmt.Sprintf(`# Generated Application

This application was generated by Forge Engine based on the following prompt:

> %s

## Getting Started

### Prerequisites
- Go 1.21 or later
- Docker (optional)

### Running Locally
`+"```bash\n"+`
go mod tidy
go run main.go
`+"```\n\n"+`
### Running with Docker
`+"```bash\n"+`
docker build -t generated-app .
docker run -p 8080:8080 generated-app
`+"```\n\n"+`
## Generated by Forge Engine
This code was automatically generated and may need customization for production use.
`, prompt)
}

// buildEnhancedPrompt constructs a prompt with tech stack requirements and templates
func (c *CursorAgentClient) buildEnhancedPrompt(userPrompt string) string {
	techStackPrompt := "你是一个资深全栈工程师，专门使用以下固定技术栈开发可立即部署的生产级应用。\n\n" +
		"## 强制技术栈与版本\n\n" +
		"- **前端**：Vue 3 (组合式API) + Vite + Element Plus 组件库 + Axios\n" +
		"- **后端**：Node.js + Express.js + MySQL 2 驱动\n" +
		"- **部署**：Docker + Docker Compose\n\n" +
		"## 项目结构要求\n\n" +
		"你必须严格按照以下目录树生成文件，并填充内容。项目根目录必须包含给定的 `docker-compose.yml` 文件。\n\n" +
		"```\n" +
		"template-vue-express-mysql/\n" +
		"├── backend/                      # Express 后端\n" +
		"│   ├── src/\n" +
		"│   │   ├── config/\n" +
		"│   │   │   └── database.js       # MySQL连接配置（使用环境变量）\n" +
		"│   │   ├── models/\n" +
		"│   │   │   └── {{modelName}}.js  # 核心数据模型，根据用户需求生成\n" +
		"│   │   ├── routes/\n" +
		"│   │   │   └── {{modelName}}Routes.js # 核心CRUD路由\n" +
		"│   │   ├── controllers/\n" +
		"│   │   │   └── {{modelName}}Controller.js # 业务逻辑\n" +
		"│   │   ├── utils/\n" +
		"│   │   │   └── apiResponse.js    # 统一API响应格式\n" +
		"│   │   └── app.js                # Express应用主文件\n" +
		"│   ├── package.json              # 依赖项：express, mysql2, cors, dotenv等\n" +
		"│   ├── .env.example              # 环境变量示例：DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT\n" +
		"│   └── Dockerfile                # 后端Docker镜像构建文件\n" +
		"├── frontend/                     # Vue 3 前端\n" +
		"│   ├── src/\n" +
		"│   │   ├── api/\n" +
		"│   │   │   └── index.js          # 封装Axios实例，baseURL指向后端\n" +
		"│   │   ├── views/\n" +
		"│   │   │   └── {{ModelName}}View.vue # 主视图页面，包含CRUD表格和表单\n" +
		"│   │   ├── components/\n" +
		"│   │   │   └── {{ModelName}}Form.vue # 可复用的表单组件\n" +
		"│   │   ├── router/\n" +
		"│   │   │   └── index.js          # 路由配置，自动导入{{ModelName}}View\n" +
		"│   │   └── main.js               # 应用入口，导入Element Plus\n" +
		"│   ├── package.json              # 依赖项：vue, vue-router, element-plus, axios\n" +
		"│   ├── vite.config.js            # Vite配置，设置代理指向后端\n" +
		"│   └── Dockerfile                # 前端静态文件构建镜像\n" +
		"├── docker-compose.yml            # **核心：一键编排所有服务的配置文件**\n" +
		"├── .gitignore\n" +
		"└── README.md                     # 项目说明，强调\"运行 `docker-compose up -d`\"\n" +
		"```\n\n" +
		"## 各文件核心规范\n\n" +
		"1. **`backend/src/config/database.js`**：必须使用从环境变量(`process.env.DB_*`)读取的配置来创建MySQL连接池。\n\n" +
		"2. **`backend/src/models/{{modelName}}.js`**：根据用户需求定义数据模型，字段类型必须与需求匹配。\n\n" +
		"3. **`backend/src/routes/{{modelName}}Routes.js`**：实现标准的RESTful端点 (GET /, POST /, PUT /:id, DELETE /:id)。\n\n" +
		"4. **`frontend/src/api/index.js`**：Axios实例的`baseURL`必须设置为 `'http://localhost:3000/api'` 或相对路径 `/api`。\n\n" +
		"5. **`frontend/src/views/{{ModelName}}View.vue`**：使用Element Plus的 `<el-table>` 和 `<el-form>` 组件实现数据的展示、查询、新增和编辑。\n\n" +
		"6. **`docker-compose.yml`**：**严禁修改此文件的服务定义结构**（`db`, `backend`, `frontend`）。只允许根据用户需求，替换或添加环境变量的`默认值`（例如 `${DB_NAME:-appdb}` 中的 `appdb`）。\n\n" +
		"## docker-compose.yml 模板\n\n" +
		"必须使用以下 `docker-compose.yml` 结构（数据库密码默认：changeme）：\n\n" +
		"```yaml\n" +
		"version: '3.8'\n" +
		"services:\n" +
		"  # MySQL 数据库服务\n" +
		"  db:\n" +
		"    image: mysql:8\n" +
		"    container_name: ${APP_NAME:-app}_db\n" +
		"    restart: unless-stopped\n" +
		"    environment:\n" +
		"      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-changeme}\n" +
		"      MYSQL_DATABASE: ${DB_NAME:-appdb}\n" +
		"    volumes:\n" +
		"      - db_data:/var/lib/mysql\n" +
		"      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql # 可选：初始化脚本\n" +
		"    networks:\n" +
		"      - app-network\n" +
		"    healthcheck:\n" +
		"      test: [\"CMD\", \"mysqladmin\", \"ping\", \"-h\", \"localhost\"]\n" +
		"      timeout: 10s\n" +
		"      retries: 5\n\n" +
		"  # Node.js 后端服务\n" +
		"  backend:\n" +
		"    build: ./backend\n" +
		"    container_name: ${APP_NAME:-app}_backend\n" +
		"    restart: unless-stopped\n" +
		"    depends_on:\n" +
		"      db:\n" +
		"        condition: service_healthy\n" +
		"    environment:\n" +
		"      DB_HOST: db\n" +
		"      DB_USER: ${DB_USER:-root}\n" +
		"      DB_PASSWORD: ${DB_PASSWORD:-changeme}\n" +
		"      DB_NAME: ${DB_NAME:-appdb}\n" +
		"      NODE_ENV: production\n" +
		"    ports:\n" +
		"      - \"${BACKEND_PORT:-3000}:3000\"\n" +
		"    networks:\n" +
		"      - app-network\n" +
		"    volumes:\n" +
		"      - ./backend:/usr/src/app\n" +
		"      - /usr/src/app/node_modules\n\n" +
		"  # Vue 前端服务 (通过Nginx提供)\n" +
		"  frontend:\n" +
		"    build: ./frontend\n" +
		"    container_name: ${APP_NAME:-app}_frontend\n" +
		"    restart: unless-stopped\n" +
		"    depends_on:\n" +
		"      - backend\n" +
		"    ports:\n" +
		"      - \"${FRONTEND_PORT:-80}:80\"\n" +
		"    networks:\n" +
		"      - app-network\n\n" +
		"networks:\n" +
		"  app-network:\n" +
		"    driver: bridge\n\n" +
		"volumes:\n" +
		"  db_data:\n" +
		"```\n\n" +
		"## 用户需求与变量替换\n\n" +
		"用户的需求描述是：\"%s\"\n\n" +
		"请根据上述需求，确定核心实体名为 `{{modelName}}`，并将其转换为合适的格式（如单数、复数、大小写），填充到所有 `{{modelName}}` 和 `{{ModelName}}` 占位符中。\n\n" +
		"## 最终输出\n\n" +
		"生成一个完整、可运行的项目。确保在项目根目录执行 `docker-compose up --build -d` 后，可通过浏览器访问前端，并正常操作数据。"

	return fmt.Sprintf(techStackPrompt, userPrompt)
}

