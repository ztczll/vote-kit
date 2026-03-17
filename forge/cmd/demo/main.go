package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-redis/redis/v8"
	"forge-engine/internal/config"
	"forge-engine/internal/notify"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

// Simplified Task for testing
type Task struct {
	TaskID      string            `json:"task_id"`
	AppName     string            `json:"app_name"`
	Prompt      string            `json:"prompt"`
	CallbackURL string            `json:"callback_url"`
	CreatedAt   time.Time         `json:"created_at"`
	Metadata    map[string]string `json:"metadata"`
}

func main() {
	// Setup logging
	if err := logger.InitWithService("info", "json", "forge-engine"); err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Logger.Info("Starting Forge Engine Demo")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Logger.Error("Failed to load configuration", zap.Error(err))
		os.Exit(1)
	}

	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx := context.Background()

	// Test Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Logger.Error("Failed to connect to Redis", zap.Error(err))
		os.Exit(1)
	}
	logger.Logger.Info("Connected to Redis successfully")

	// Create callback client
	callbackClient := notify.NewCallbackClient()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start worker
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				if err := processNextTask(ctx, rdb, callbackClient, cfg); err != nil {
					logger.Logger.Error("Error processing task", zap.Error(err))
					time.Sleep(5 * time.Second)
				}
			}
		}
	}()

	logger.Logger.Info("Forge Engine Demo started - waiting for tasks")

	// Wait for shutdown signal
	<-sigChan
	logger.Logger.Info("Shutdown signal received")
}

func processNextTask(ctx context.Context, rdb *redis.Client, callbackClient *notify.CallbackClient, cfg *config.Config) error {
	// Block for up to 5 seconds waiting for a task
	result, err := rdb.BRPop(ctx, 5*time.Second, cfg.Redis.QueueName).Result()
	if err != nil {
		if err == redis.Nil {
			return nil // No task available
		}
		return fmt.Errorf("failed to pop task from queue: %w", err)
	}

	if len(result) < 2 {
		return fmt.Errorf("invalid task format from queue")
	}

	taskData := result[1]
	var task Task
	if err := json.Unmarshal([]byte(taskData), &task); err != nil {
		logger.Logger.Error("Failed to unmarshal task", zap.Error(err), zap.String("data", taskData))
		return err
	}

	logger.Logger.Info("Processing task", zap.String("task_id", task.TaskID), zap.String("app_name", task.AppName))

	// Simulate task processing
	startTime := time.Now()
	
	// Step 1: Code Generation
	logger.Logger.Info("Step 1: Code Generation", zap.String("task_id", task.TaskID))
	if err := callbackClient.SendProgressCallback(ctx, task.CallbackURL, task.TaskID, notify.StepCodeGeneration, []notify.LogEntry{
		{Level: "info", Message: "Starting code generation", Timestamp: time.Now()},
	}); err != nil {
		logger.Logger.Warn("Failed to send progress callback", zap.Error(err))
	}
	time.Sleep(2 * time.Second) // Simulate work

	// Step 2: Git Repository
	logger.Logger.Info("Step 2: Git Repository", zap.String("task_id", task.TaskID))
	if err := callbackClient.SendProgressCallback(ctx, task.CallbackURL, task.TaskID, notify.StepGitCommit, []notify.LogEntry{
		{Level: "info", Message: "Creating Git repository", Timestamp: time.Now()},
	}); err != nil {
		logger.Logger.Warn("Failed to send progress callback", zap.Error(err))
	}
	time.Sleep(2 * time.Second) // Simulate work

	// Step 3: Docker Build
	logger.Logger.Info("Step 3: Docker Build", zap.String("task_id", task.TaskID))
	if err := callbackClient.SendProgressCallback(ctx, task.CallbackURL, task.TaskID, notify.StepDockerBuild, []notify.LogEntry{
		{Level: "info", Message: "Building Docker image", Timestamp: time.Now()},
	}); err != nil {
		logger.Logger.Warn("Failed to send progress callback", zap.Error(err))
	}
	time.Sleep(3 * time.Second) // Simulate work

	// Step 4: Deployment
	logger.Logger.Info("Step 4: Deployment", zap.String("task_id", task.TaskID))
	if err := callbackClient.SendProgressCallback(ctx, task.CallbackURL, task.TaskID, notify.StepDockerDeploy, []notify.LogEntry{
		{Level: "info", Message: "Deploying application", Timestamp: time.Now()},
	}); err != nil {
		logger.Logger.Warn("Failed to send progress callback", zap.Error(err))
	}
	time.Sleep(2 * time.Second) // Simulate work

	// Success callback
	resultData := &notify.Result{
		GitRepositoryURL: fmt.Sprintf("https://github.com/forge/%s", task.AppName),
		DockerImage:      fmt.Sprintf("forge/%s:latest", task.AppName),
		DeploymentURL:    "http://localhost:8080",
		ComposeFilePath:  fmt.Sprintf("/deployments/%s/docker-compose.yml", task.AppName),
	}

	logs := []notify.LogEntry{
		{Level: "info", Message: "Code generation completed", Timestamp: time.Now()},
		{Level: "info", Message: "Git repository created", Timestamp: time.Now()},
		{Level: "info", Message: "Docker image built", Timestamp: time.Now()},
		{Level: "info", Message: "Application deployed", Timestamp: time.Now()},
	}

	if err := callbackClient.SendSuccessCallback(ctx, task.CallbackURL, task.TaskID, resultData, logs, startTime); err != nil {
		logger.Logger.Error("Failed to send success callback", zap.Error(err))
		return err
	}

	logger.Logger.Info("Task completed successfully", zap.String("task_id", task.TaskID), zap.Duration("duration", time.Since(startTime)))
	return nil
}
