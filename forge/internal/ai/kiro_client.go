package ai

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"forge-engine/internal/config"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

// Prototype reference path under outputDir (input for Kiro skill, not part of generated code).
const prototypeReferenceDir = "references"
const prototypeHTMLFile = "prototype.html"

// Max size for prototype HTML response body (5MB).
const prototypeMaxBytes = 5 * 1024 * 1024

// chinaMirrorPrompt is appended to every prompt so generated projects use China-region mirrors and avoid external network access issues.
const chinaMirrorPrompt = "\n\n### 镜像源配置（必须遵守）\n" +
	"为了在中国境内快速构建，所有依赖下载必须使用阿里云镜像加速：\n" +
	"- **Go**：在 Dockerfile 中设置环境变量 `ENV GOPROXY=https://goproxy.cn,direct`\n" +
	"- **Node.js**：在项目根目录生成 `.npmrc` 文件，内容为 `registry=https://registry.npmmirror.com`\n" +
	"- **Python**：在 Dockerfile 中使用 `pip install -i https://mirrors.aliyun.com/pypi/simple/` 安装依赖，或在 requirements.txt 后添加 `--index-url` 选项（最佳实践是在 Dockerfile 中配置）"

// Kiro debug artifacts that should not be treated as generated code
var kiroDebugFiles = map[string]bool{
	"kiro_output.txt": true,
	"kiro_prompt.txt": true,
	"kiro_script.sh":  true,
}

type KiroClient struct {
	config *config.KiroConfig
}

func NewKiroClient(cfg *config.KiroConfig) *KiroClient {
	return &KiroClient{
		config: cfg,
	}
}

// parsePrototypeURLFromPrompt extracts the prototype URL from prompt text.
// Vote-Kit appends "原型示例地址：<url>" to the prompt when a prototype exists.
func parsePrototypeURLFromPrompt(prompt string) string {
	const marker = "原型示例地址："
	idx := strings.Index(prompt, marker)
	if idx == -1 {
		return ""
	}
	rest := prompt[idx+len(marker):]
	if newline := strings.IndexAny(rest, "\r\n"); newline != -1 {
		rest = rest[:newline]
	}
	return strings.TrimSpace(rest)
}

// fetchAndWritePrototype GETs the URL and writes the body to outputDir/references/prototype.html.
// Returns true if the file was written successfully.
func (k *KiroClient) fetchAndWritePrototype(ctx context.Context, url string, outputDir string, kiroLogger *zap.Logger) bool {
	if url == "" {
		return false
	}
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		kiroLogger.Warn("Failed to create prototype request", zap.Error(err), zap.String("url", url))
		return false
	}
	resp, err := client.Do(req)
	if err != nil {
		kiroLogger.Warn("Failed to fetch prototype HTML", zap.Error(err), zap.String("url", url))
		return false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		kiroLogger.Warn("Prototype URL returned non-200", zap.Int("status", resp.StatusCode), zap.String("url", url))
		return false
	}
	refDir := filepath.Join(outputDir, prototypeReferenceDir)
	if err := os.MkdirAll(refDir, 0755); err != nil {
		kiroLogger.Warn("Failed to create references dir", zap.Error(err))
		return false
	}
	outPath := filepath.Join(refDir, prototypeHTMLFile)
	f, err := os.Create(outPath)
	if err != nil {
		kiroLogger.Warn("Failed to create prototype file", zap.Error(err), zap.String("path", outPath))
		return false
	}
	defer f.Close()
	limited := io.LimitReader(resp.Body, prototypeMaxBytes)
	n, err := io.Copy(f, limited)
	if err != nil {
		kiroLogger.Warn("Failed to write prototype file", zap.Error(err))
		_ = os.Remove(outPath)
		return false
	}
	kiroLogger.Info("Prototype HTML saved", zap.String("path", outPath), zap.Int64("bytes", n))
	return true
}

func (k *KiroClient) GenerateCode(ctx context.Context, prompt string, outputDir string) (map[string]string, error) {
	kiroLogger := logger.Logger.With(zap.String("component", "kiro_client"))
	
	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	// Retry logic with exponential backoff
	var lastErr error
	delay := 1 * time.Second

	for attempt := 0; attempt <= k.config.MaxRetries; attempt++ {
		if attempt > 0 {
			kiroLogger.Info("Retrying Kiro call", zap.Int("attempt", attempt), zap.Duration("delay", delay))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
			delay *= 2
		}

		result, err := k.executeKiroCommand(ctx, prompt, outputDir, kiroLogger)
		if err != nil {
			lastErr = err
			kiroLogger.Warn("Kiro command failed", zap.Int("attempt", attempt), zap.Error(err))
			continue
		}

		return result, nil
	}

	return nil, fmt.Errorf("kiro command failed after %d attempts: %w", k.config.MaxRetries+1, lastErr)
}

func (k *KiroClient) executeKiroCommand(ctx context.Context, prompt string, outputDir string, kiroLogger *zap.Logger) (map[string]string, error) {
	// Create context with timeout
	cmdCtx, cancel := context.WithTimeout(ctx, k.config.Timeout)
	defer cancel()

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		kiroLogger.Warn("Failed to create output directory", zap.Error(err))
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	// Parse prototype URL from prompt (Vote-Kit appends "原型示例地址：<url>") and fetch HTML to references/prototype.html
	finalPrompt := prompt
	if prototypeURL := parsePrototypeURLFromPrompt(prompt); prototypeURL != "" {
		if k.fetchAndWritePrototype(ctx, prototypeURL, outputDir, kiroLogger) {
			enhancement := "\n\n## 原型文件说明\n原型 HTML 已保存至 references/prototype.html，请作为界面布局与风格参考（勿直接复制代码），结合小商家代码生成器 Skill 与元模板要求生成可部署代码。"
			finalPrompt = prompt + enhancement
		}
	}
	// Always append China-region mirror requirements so generated projects build reliably in China
	finalPrompt = finalPrompt + chinaMirrorPrompt

	kiroLogger.Info("Executing kiro-cli command", zap.Int("prompt_length", len(finalPrompt)), zap.String("output_dir", outputDir), zap.String("prompt", finalPrompt))

	// Save the prompt for debugging
	promptPath := filepath.Join(outputDir, "kiro_prompt.txt")
	_ = os.WriteFile(promptPath, []byte(finalPrompt), 0644)

	// Run kiro-cli in non-interactive mode: first response to stdout then exit (no blocking).
	// --trust-all-tools must be set so tool use (e.g. read file) does not block; order may matter for some CLI versions.
	// Prompt is passed via stdin to avoid shell escaping and ARG_MAX limits.
	cmd := exec.CommandContext(cmdCtx, k.config.BinaryPath, "chat", "--trust-all-tools", "--no-interactive")
	cmd.Dir = outputDir
	cmd.Stdin = strings.NewReader(finalPrompt)
	output, err := cmd.CombinedOutput()

	outputPath := filepath.Join(outputDir, "kiro_output.txt")
	_ = os.WriteFile(outputPath, output, 0644)

	if err != nil {
		kiroLogger.Warn("Kiro CLI execution had issues, proceeding with template generation", zap.Error(err), zap.String("output", string(output)))
	} else {
		kiroLogger.Info("Kiro command completed", zap.Int("output_length", len(output)))
	}

	// Check if kiro-cli generated files successfully
	generatedFiles, err := k.parseGeneratedFiles(outputDir)
	if err == nil && len(generatedFiles) > 0 {
		generatedFiles = postProcessFiles(generatedFiles)
		kiroLogger.Info("Using kiro-cli generated files", zap.Int("files_count", len(generatedFiles)))
		return generatedFiles, nil
	}

	kiroLogger.Info("Kiro-cli did not generate files, using template generation")

	// Generate files based on the prompt
	files := make(map[string]string)
	
	// Analyze prompt to determine application type
	promptLower := strings.ToLower(prompt)
	
	if strings.Contains(promptLower, "web") || strings.Contains(promptLower, "http") || strings.Contains(promptLower, "server") {
		// Web server application
		files["main.go"] = k.generateWebServerCode(prompt)
		files["go.mod"] = k.generateGoMod()
		files["Dockerfile"] = k.generateDockerfile()
		files["README.md"] = k.generateReadme(prompt)
		
		if strings.Contains(promptLower, "static") {
			files["static/index.html"] = k.generateIndexHTML()
			files["static/style.css"] = k.generateCSS()
		}
		
	} else if strings.Contains(promptLower, "api") || strings.Contains(promptLower, "rest") {
		// REST API application
		files["main.go"] = k.generateAPIServerCode(prompt)
		files["go.mod"] = k.generateGoMod()
		files["Dockerfile"] = k.generateDockerfile()
		files["README.md"] = k.generateReadme(prompt)
		
	} else {
		// Generic application
		files["main.go"] = k.generateGenericCode(prompt)
		files["go.mod"] = k.generateGoMod()
		files["Dockerfile"] = k.generateDockerfile()
		files["README.md"] = k.generateReadme(prompt)
	}

	files = postProcessFiles(files)

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

	kiroLogger.Info("Code generation completed", zap.Int("files_count", len(files)))
	return files, nil
}

// postProcessFiles applies China-region mirror fixes and Jenkins/build fixes: optimize Dockerfiles (apk/npm/Go), add .npmrc if missing, and unify backend port to 3000.
func postProcessFiles(files map[string]string) map[string]string {
	processed := make(map[string]string, len(files)+1)
	for name, content := range files {
		if filepath.Base(name) == "Dockerfile" {
			processed[name] = ensureDockerfileMirrors(content)
		} else if strings.HasSuffix(name, ".go") {
			// Unify backend listen port to 3000 for Caddy / Jenkins (replace :8080 with :3000)
			processed[name] = strings.ReplaceAll(content, ":8080", ":3000")
		} else {
			processed[name] = content
		}
	}
	if hasPackageJSON(files) && !hasNpmrc(files) {
		processed[".npmrc"] = "registry=https://registry.npmmirror.com\n"
	}
	return processed
}

func hasPackageJSON(files map[string]string) bool {
	for name := range files {
		if filepath.Base(name) == "package.json" {
			return true
		}
	}
	return false
}

func hasNpmrc(files map[string]string) bool {
	for name := range files {
		if filepath.Base(name) == ".npmrc" {
			return true
		}
	}
	return false
}

// ensureDockerfileMirrors inserts apk/npm/Go mirror config and build fixes (go mod tidy, EXPOSE 3000) so builds work in China and align with Caddy/Jenkins port 3000.
func ensureDockerfileMirrors(content string) string {
	lines := strings.Split(content, "\n")
	var newLines []string
	apkMirrorAdded := false
	npmConfigAdded := false
	goproxyAdded := false
	goModTidyAdded := false

	for _, line := range lines {
		// Go: insert GOPROXY before first RUN go mod download or go build (skip if already set)
		if !goproxyAdded && !strings.Contains(content, "GOPROXY=") && strings.Contains(line, "RUN ") && (strings.Contains(line, "go mod download") || strings.Contains(line, "go build")) {
			newLines = append(newLines, "ENV GOPROXY=https://goproxy.cn,direct")
			goproxyAdded = true
		}
		// Go: insert go mod tidy before first RUN ... go build (fixes missing go.sum entries)
		if !goModTidyAdded && strings.Contains(content, "go mod download") && !strings.Contains(content, "go mod tidy") && strings.Contains(line, "RUN ") && strings.Contains(line, "go build") {
			newLines = append(newLines, "RUN go mod tidy")
			goModTidyAdded = true
		}
		if !apkMirrorAdded && strings.Contains(line, "RUN apk add") {
			newLines = append(newLines, "RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories")
			apkMirrorAdded = true
		}
		if !npmConfigAdded && (strings.Contains(line, "RUN npm") || strings.Contains(line, "RUN yarn")) {
			newLines = append(newLines, "RUN npm config set registry https://registry.npmmirror.com")
			npmConfigAdded = true
		}
		newLines = append(newLines, line)
	}

	if !apkMirrorAdded && strings.Contains(content, "FROM node") {
		var finalLines []string
		for _, line := range newLines {
			finalLines = append(finalLines, line)
			if strings.HasPrefix(strings.TrimSpace(line), "FROM ") && strings.Contains(line, "node") && !apkMirrorAdded {
				finalLines = append(finalLines, "RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories")
				apkMirrorAdded = true
			}
		}
		newLines = finalLines
	}

	out := strings.Join(newLines, "\n")
	// Unify backend port to 3000 for Caddy/Jenkins (image and Dockerfile EXPOSE)
	out = strings.ReplaceAll(out, "EXPOSE 8080", "EXPOSE 3000")
	return out
}

func (k *KiroClient) parseGeneratedFiles(outputDir string) (map[string]string, error) {
	files := make(map[string]string)

	err := filepath.Walk(outputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories and hidden files
		if info.IsDir() || strings.HasPrefix(info.Name(), ".") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read file %s: %w", path, err)
		}

		// Use relative path as key
		relPath, err := filepath.Rel(outputDir, path)
		if err != nil {
			return fmt.Errorf("failed to get relative path for %s: %w", path, err)
		}

		// Skip Kiro debug artifacts
		if kiroDebugFiles[filepath.Base(relPath)] {
			return nil
		}

		// Skip prototype reference (input for Kiro skill, not generated code)
		if filepath.ToSlash(relPath) == filepath.ToSlash(filepath.Join(prototypeReferenceDir, prototypeHTMLFile)) {
			return nil
		}

		files[relPath] = string(content)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to walk output directory: %w", err)
	}

	return files, nil
}

// ValidateKiroInstallation checks if kiro-cli is available and working
func (k *KiroClient) ValidateKiroInstallation(ctx context.Context) error {
	cmdCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, k.config.BinaryPath, "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("kiro-cli not available or not working: %w, output: %s", err, string(output))
	}

	logger.Logger.Info("Kiro CLI validation successful", zap.String("version_output", string(output)))
	return nil
}

// CleanupOutputDir removes the output directory
func (k *KiroClient) CleanupOutputDir(outputDir string) error {
	if err := os.RemoveAll(outputDir); err != nil {
		return fmt.Errorf("failed to cleanup output directory %s: %w", outputDir, err)
	}
	return nil
}

// Code generation helper methods
func (k *KiroClient) generateWebServerCode(prompt string) string {
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
	
	// Serve static files if directory exists
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

func (k *KiroClient) generateAPIServerCode(prompt string) string {
	return `package main

import (
	"encoding/json"
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

func (k *KiroClient) generateGenericCode(prompt string) string {
	return fmt.Sprintf(`package main

import (
	"fmt"
	"log"
)

func main() {
	log.Println("Starting generated application...")
	fmt.Println("Hello from Forge Engine generated application!")
	
	// Application logic based on prompt would go here
	fmt.Printf("Generated based on prompt: %%s\n", %q)
}
`, prompt)
}

func (k *KiroClient) generateGoMod() string {
	return `module generated-app

go 1.21
`
}

func (k *KiroClient) generateDockerfile() string {
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

# 设置时区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
`
}

func (k *KiroClient) generateReadme(prompt string) string {
	return fmt.Sprintf(`# Generated Application

This application was generated by Forge Engine based on the following prompt:

> %s

## Getting Started

### Prerequisites
- Go 1.21 or later
- Docker (optional)

### Running Locally
%s
go mod tidy
go run main.go
%s

### Running with Docker
%s
docker build -t generated-app .
docker run -p 8080:8080 generated-app
%s

### API Endpoints
- GET / - Home page
- GET /health - Health check
- GET /api/* - API endpoints (if applicable)

## Generated by Forge Engine
This code was automatically generated and may need customization for production use.
`, prompt, "```bash", "```", "```bash", "```")
}

func (k *KiroClient) generateIndexHTML() string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to Generated App</h1>
        <p>This application was generated by Forge Engine.</p>
        <div class="status">
            <a href="/health">Health Check</a>
        </div>
    </div>
</body>
</html>
`
}

func (k *KiroClient) generateCSS() string {
	return `body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
    color: #333;
    text-align: center;
}

.status {
    text-align: center;
    margin-top: 20px;
}

.status a {
    display: inline-block;
    padding: 10px 20px;
    background-color: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 4px;
}

.status a:hover {
    background-color: #0056b3;
}
`
}
