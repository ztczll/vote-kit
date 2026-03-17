package docker

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"forge-engine/internal/config"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type Deployer struct {
	config *config.DockerConfig
}

type DeploymentResult struct {
	ComposeFilePath string
	ServiceName     string
	DeploymentURL   string
	ContainerID     string
}

func NewDeployer(cfg *config.DockerConfig) *Deployer {
	return &Deployer{
		config: cfg,
	}
}

func (d *Deployer) Deploy(ctx context.Context, appName, imageName, repoDir string) (*DeploymentResult, error) {
	deployLogger := logger.Logger.With(zap.String("component", "docker_deployer"), zap.String("app_name", appName))
	
	// Find available port
	availablePort, err := d.findAvailablePort()
	if err != nil {
		return nil, fmt.Errorf("failed to find available port: %w", err)
	}
	
	// Generate docker-compose.yml
	composeFilePath := filepath.Join(repoDir, "docker-compose.yml")
	serviceName := d.sanitizeServiceName(appName)
	
	if err := d.generateComposeFile(composeFilePath, serviceName, imageName, availablePort); err != nil {
		return nil, fmt.Errorf("failed to generate docker-compose.yml: %w", err)
	}
	
	deployLogger.Info("Generated docker-compose.yml", zap.String("compose_file", composeFilePath))

	// Deploy with docker-compose
	deployCtx, cancel := context.WithTimeout(ctx, d.config.DeployTimeout)
	defer cancel()

	if err := d.deployWithCompose(deployCtx, repoDir, deployLogger); err != nil {
		return nil, fmt.Errorf("failed to deploy with docker-compose: %w", err)
	}

	// Get deployment URL
	deploymentURL := fmt.Sprintf("http://localhost:%d", availablePort)
	
	// Get container ID
	containerID, err := d.getContainerID(deployCtx, serviceName)
	if err != nil {
		deployLogger.Warn("Failed to get container ID", zap.Error(err))
		containerID = "unknown"
	}

	result := &DeploymentResult{
		ComposeFilePath: composeFilePath,
		ServiceName:     serviceName,
		DeploymentURL:   deploymentURL,
		ContainerID:     containerID,
	}

	deployLogger.Info("Deployment completed", zap.String("service_name", serviceName), zap.String("url", deploymentURL))
	return result, nil
}

func (d *Deployer) generateComposeFile(composeFilePath, serviceName, imageName string, port int) error {
	composeContent := fmt.Sprintf(`version: '3.8'

services:
  %s:
    image: %s
    ports:
      - "%d:8080"
    environment:
      - ENV=production
      - TZ=Asia/Shanghai
    volumes:
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - forge-network

networks:
  forge-network:
    driver: bridge
`, serviceName, imageName, port)

	return os.WriteFile(composeFilePath, []byte(composeContent), 0644)
}

func (d *Deployer) findAvailablePort() (int, error) {
	// Start from 8082 and find first available port
	for port := 8082; port <= 9000; port++ {
		// Check if port is available by trying to bind to it
		if d.isPortAvailable(port) {
			return port, nil
		}
	}
	return 0, fmt.Errorf("no available ports found in range 8082-9000")
}

func (d *Deployer) isPortAvailable(port int) bool {
	// Use docker command to check if port is in use
	cmd := exec.Command("docker", "ps", "--format", "{{.Ports}}")
	output, err := cmd.Output()
	if err != nil {
		return true // If we can't check, assume available
	}
	
	portStr := fmt.Sprintf(":%d->", port)
	return !strings.Contains(string(output), portStr)
}

func (d *Deployer) deployWithCompose(ctx context.Context, repoDir string, deployLogger *zap.Logger) error {
	// Stop any existing deployment
	stopCmd := exec.CommandContext(ctx, "docker", "compose", "down")
	stopCmd.Dir = repoDir
	if output, err := stopCmd.CombinedOutput(); err != nil {
		deployLogger.Warn("Failed to stop existing deployment", zap.Error(err), zap.String("output", string(output)))
	}

	// Deploy with docker compose up
	upCmd := exec.CommandContext(ctx, "docker", "compose", "up", "-d", "--build")
	upCmd.Dir = repoDir
	
	output, err := upCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("docker compose up failed: %w, output: %s", err, string(output))
	}

	deployLogger.Info("Docker Compose deployment successful", zap.String("output", string(output)))

	// Wait for services to be ready
	if err := d.waitForServices(ctx, repoDir, deployLogger); err != nil {
		return fmt.Errorf("services failed to become ready: %w", err)
	}

	return nil
}

func (d *Deployer) waitForServices(ctx context.Context, repoDir string, deployLogger *zap.Logger) error {
	// Wait up to 60 seconds for services to be ready
	waitCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-waitCtx.Done():
			return fmt.Errorf("timeout waiting for services to be ready")
		case <-ticker.C:
			// Check service status
			psCmd := exec.CommandContext(waitCtx, "docker", "compose", "ps", "--services", "--filter", "status=running")
			psCmd.Dir = repoDir
			
			output, err := psCmd.CombinedOutput()
			if err != nil {
				deployLogger.Warn("Failed to check service status", zap.Error(err))
				continue
			}

			runningServices := strings.TrimSpace(string(output))
			if runningServices != "" {
				deployLogger.Info("Services are running", zap.String("services", runningServices))
				return nil
			}
		}
	}
}

func (d *Deployer) getContainerID(ctx context.Context, serviceName string) (string, error) {
	cmd := exec.CommandContext(ctx, "docker", "ps", "-q", "--filter", fmt.Sprintf("name=%s", serviceName))
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get container ID: %w", err)
	}

	containerID := strings.TrimSpace(string(output))
	if containerID == "" {
		return "", fmt.Errorf("no container found for service %s", serviceName)
	}

	return containerID, nil
}

func (d *Deployer) sanitizeServiceName(appName string) string {
	// Convert to lowercase and replace invalid characters
	name := strings.ToLower(appName)
	name = strings.ReplaceAll(name, " ", "-")
	name = strings.ReplaceAll(name, "_", "-")
	
	// Remove invalid characters
	var result strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	
	name = result.String()
	name = strings.Trim(name, "-")
	
	if len(name) < 2 {
		name = fmt.Sprintf("forge-service-%s", name)
	}
	
	return name
}

func (d *Deployer) Stop(ctx context.Context, repoDir string) error {
	deployLogger := logger.Logger.With(zap.String("component", "docker_deployer"), zap.String("repo_dir", repoDir))
	
	stopCmd := exec.CommandContext(ctx, "docker", "compose", "down", "--volumes", "--remove-orphans")
	stopCmd.Dir = repoDir
	
	output, err := stopCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stop deployment: %w, output: %s", err, string(output))
	}

	deployLogger.Info("Deployment stopped", zap.String("output", string(output)))
	return nil
}

func (d *Deployer) GetLogs(ctx context.Context, repoDir string) (string, error) {
	logsCmd := exec.CommandContext(ctx, "docker", "compose", "logs", "--tail=100")
	logsCmd.Dir = repoDir
	
	output, err := logsCmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get logs: %w", err)
	}

	return string(output), nil
}
