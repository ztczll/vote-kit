package docker

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"forge-engine/internal/config"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type Builder struct {
	client *client.Client
	config *config.DockerConfig
}

type BuildResult struct {
	ImageID   string
	ImageName string
	Tags      []string
}

func NewBuilder(cfg *config.DockerConfig) (*Builder, error) {
	var opts []client.Opt
	opts = append(opts, client.FromEnv)
	
	if cfg.SocketPath != "" {
		opts = append(opts, client.WithHost("unix://"+cfg.SocketPath))
	}
	
	opts = append(opts, client.WithAPIVersionNegotiation())
	
	cli, err := client.NewClientWithOpts(opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	return &Builder{
		client: cli,
		config: cfg,
	}, nil
}

func (b *Builder) BuildImage(ctx context.Context, appName, repoDir string) (*BuildResult, error) {
	builderLogger := logger.Logger.With(zap.String("component", "docker_builder"), zap.String("app_name", appName))
	
	// Generate Dockerfile if not present
	dockerfilePath := filepath.Join(repoDir, "Dockerfile")
	if _, err := os.Stat(dockerfilePath); os.IsNotExist(err) {
		if err := b.generateDockerfile(dockerfilePath, appName); err != nil {
			return nil, fmt.Errorf("failed to generate Dockerfile: %w", err)
		}
		builderLogger.Info("Generated Dockerfile")
	}

	// Create build context
	buildCtx, cancel := context.WithTimeout(ctx, b.config.BuildTimeout)
	defer cancel()

	// Prepare image name and tags
	imageName := b.sanitizeImageName(appName)
	imageTag := fmt.Sprintf("%s:latest", imageName)
	if b.config.Registry != "" {
		imageTag = fmt.Sprintf("%s/%s", b.config.Registry, imageTag)
	}

	builderLogger.Info("Building Docker image", zap.String("image_tag", imageTag), zap.String("context_dir", repoDir))

	// Create tar archive for build context
	buildContext, err := b.createBuildContext(repoDir)
	if err != nil {
		return nil, fmt.Errorf("failed to create build context: %w", err)
	}
	defer buildContext.Close()

	// Build image
	buildResponse, err := b.client.ImageBuild(buildCtx, buildContext, types.ImageBuildOptions{
		Tags:       []string{imageTag},
		Dockerfile: "Dockerfile",
		Remove:     true,
		ForceRemove: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to build Docker image: %w", err)
	}
	defer buildResponse.Body.Close()

	// Read build output
	buildOutput, err := io.ReadAll(buildResponse.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read build output: %w", err)
	}

	builderLogger.Info("Docker build completed", zap.Int("output_length", len(buildOutput)))
	
	// Log build output for debugging
	buildOutputStr := string(buildOutput)
	if strings.Contains(buildOutputStr, "ERROR") || strings.Contains(buildOutputStr, "failed") {
		builderLogger.Warn("Docker build output contains errors", zap.String("output", buildOutputStr))
	}

	// Wait a moment for Docker to finalize the image
	time.Sleep(2 * time.Second)

	// Get image ID
	images, err := b.client.ImageList(buildCtx, types.ImageListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	var imageID string
	builderLogger.Info("Searching for built image", zap.String("target_tag", imageTag), zap.Int("total_images", len(images)))
	
	for _, image := range images {
		builderLogger.Info("Checking image", zap.String("image_id", image.ID), zap.Strings("tags", image.RepoTags))
		for _, tag := range image.RepoTags {
			if tag == imageTag {
				imageID = image.ID
				break
			}
		}
		if imageID != "" {
			break
		}
	}

	if imageID == "" {
		// Try to find by partial match or recent creation
		builderLogger.Warn("Exact tag match not found, searching by creation time")
		for _, image := range images {
			// Check if this is a recent image (within last 5 minutes)
			if time.Since(time.Unix(image.Created, 0)) < 5*time.Minute {
				if len(image.RepoTags) == 0 || (len(image.RepoTags) == 1 && image.RepoTags[0] == "<none>:<none>") {
					// This might be our image, tag it properly
					err := b.client.ImageTag(buildCtx, image.ID, imageTag)
					if err == nil {
						imageID = image.ID
						builderLogger.Info("Tagged untagged image", zap.String("image_id", imageID), zap.String("new_tag", imageTag))
						break
					}
				}
			}
		}
	}

	if imageID == "" {
		return nil, fmt.Errorf("built image not found in image list, build output: %s", buildOutputStr)
	}

	result := &BuildResult{
		ImageID:   imageID,
		ImageName: imageName,
		Tags:      []string{imageTag},
	}

	builderLogger.Info("Docker image built successfully", zap.String("image_id", imageID), zap.String("image_tag", imageTag))
	return result, nil
}

func (b *Builder) generateDockerfile(dockerfilePath, appName string) error {
	// Detect project type based on files in directory
	contextDir := filepath.Dir(dockerfilePath)
	
	builderLogger := logger.Logger.With(zap.String("component", "docker_builder"), zap.String("app_name", appName))
	
	// Check for existing Dockerfile generated by Cursor
	if b.hasDockerfile(contextDir) {
		builderLogger.Info("Dockerfile already exists, using it")
		return nil
	}
	
	// Check for Go application
	if b.hasGoFiles(contextDir) {
		builderLogger.Info("Detected Go application")
		dockerfile := `# Multi-stage build for Go application
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
`
		return os.WriteFile(dockerfilePath, []byte(dockerfile), 0644)
	}
	
	// Check for Node.js application
	if b.hasNodeJSFiles(contextDir) {
		builderLogger.Info("Detected Node.js application")
		dockerfile := `# Node.js application
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production || npm install

# Copy application code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
`
		return os.WriteFile(dockerfilePath, []byte(dockerfile), 0644)
	}
	
	// Check for Python application
	if b.hasPythonFiles(contextDir) {
		builderLogger.Info("Detected Python application")
		dockerfile := `# Python application
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt* ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt || true

# Copy application code
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the application
CMD ["python", "app.py"]
`
		return os.WriteFile(dockerfilePath, []byte(dockerfile), 0644)
	}
	
	// Check for HTML/CSS/JS files (static web app)
	if b.hasHTMLFiles(contextDir) {
		builderLogger.Info("Detected static web application")
		dockerfile := `# Static web application
FROM nginx:alpine

# Copy static files to nginx html directory
COPY . /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`
		return os.WriteFile(dockerfilePath, []byte(dockerfile), 0644)
	}
	
	// Default to generic Dockerfile
	builderLogger.Warn("Could not detect project type, using generic Dockerfile")
	dockerfile := `# Generic application
FROM alpine:latest

WORKDIR /app

# Copy all files
COPY . .

# Expose default port
EXPOSE 8080

# Default command - you may need to customize this
CMD ["/bin/sh"]
`
	return os.WriteFile(dockerfilePath, []byte(dockerfile), 0644)
}

func (b *Builder) hasDockerfile(dir string) bool {
	dockerfilePath := filepath.Join(dir, "Dockerfile")
	if _, err := os.Stat(dockerfilePath); err == nil {
		return true
	}
	return false
}

func (b *Builder) hasGoFiles(dir string) bool {
	// Check for go.mod
	goModPath := filepath.Join(dir, "go.mod")
	if _, err := os.Stat(goModPath); err == nil {
		return true
	}
	
	// Check for .go files
	files, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	
	for _, file := range files {
		if !file.IsDir() {
			name := strings.ToLower(file.Name())
			if strings.HasSuffix(name, ".go") {
				return true
			}
		}
	}
	return false
}

func (b *Builder) hasNodeJSFiles(dir string) bool {
	// Check for package.json
	packageJsonPath := filepath.Join(dir, "package.json")
	if _, err := os.Stat(packageJsonPath); err == nil {
		return true
	}
	return false
}

func (b *Builder) hasPythonFiles(dir string) bool {
	// Check for requirements.txt
	requirementsPath := filepath.Join(dir, "requirements.txt")
	if _, err := os.Stat(requirementsPath); err == nil {
		return true
	}
	
	// Check for .py files
	files, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	
	for _, file := range files {
		if !file.IsDir() {
			name := strings.ToLower(file.Name())
			if strings.HasSuffix(name, ".py") {
				return true
			}
		}
	}
	return false
}

func (b *Builder) hasHTMLFiles(dir string) bool {
	files, err := os.ReadDir(dir)
	if err != nil {
		return false
	}
	
	for _, file := range files {
		if !file.IsDir() {
			name := strings.ToLower(file.Name())
			if strings.HasSuffix(name, ".html") {
				return true
			}
		}
	}
	return false
}

func (b *Builder) createBuildContext(contextDir string) (io.ReadCloser, error) {
	// Create tar archive from directory
	tarPath := filepath.Join(os.TempDir(), fmt.Sprintf("build-context-%d.tar", time.Now().UnixNano()))
	
	// Create tar file
	tarFile, err := os.Create(tarPath)
	if err != nil {
		return nil, fmt.Errorf("failed to create tar file: %w", err)
	}
	defer tarFile.Close()

	// Create tar writer
	tarWriter := tar.NewWriter(tarFile)
	defer tarWriter.Close()

	// Walk directory and add files to tar
	err = filepath.Walk(contextDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Get relative path
		relPath, err := filepath.Rel(contextDir, path)
		if err != nil {
			return err
		}

		// Skip root directory
		if relPath == "." {
			return nil
		}

		// Create tar header
		header, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		header.Name = relPath

		// Write header
		if err := tarWriter.WriteHeader(header); err != nil {
			return err
		}

		// Write file content if it's a regular file
		if info.Mode().IsRegular() {
			file, err := os.Open(path)
			if err != nil {
				return err
			}
			defer file.Close()

			_, err = io.Copy(tarWriter, file)
			if err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		os.Remove(tarPath)
		return nil, fmt.Errorf("failed to create tar archive: %w", err)
	}

	// Open tar file for reading
	return os.Open(tarPath)
}

func (b *Builder) sanitizeImageName(appName string) string {
	// Convert to lowercase and replace invalid characters
	name := strings.ToLower(appName)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")
	
	// Remove invalid characters for Docker image names
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '.' {
			result.WriteRune(r)
		}
	}
	
	name = result.String()
	name = strings.Trim(name, "-.")
	
	if len(name) < 2 {
		name = "forge-app-default"
	}
	
	// Ensure name doesn't end with dash or dot
	name = strings.TrimRight(name, "-.")
	if name == "" {
		name = "forge-app-default"
	}
	
	return name
}

func (b *Builder) RemoveImage(ctx context.Context, imageID string) error {
	_, err := b.client.ImageRemove(ctx, imageID, types.ImageRemoveOptions{
		Force:         true,
		PruneChildren: true,
	})
	if err != nil {
		return fmt.Errorf("failed to remove image %s: %w", imageID, err)
	}
	
	logger.Logger.Info("Docker image removed", zap.String("image_id", imageID))
	return nil
}

func (b *Builder) Close() error {
	return b.client.Close()
}
