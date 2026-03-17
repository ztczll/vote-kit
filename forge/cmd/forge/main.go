package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"forge-engine/internal/config"
	"forge-engine/internal/server"
	"forge-engine/internal/task"
	"forge-engine/pkg/logger"
	"forge-engine/pkg/queue"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize zap logger
	if err := logger.InitWithService(cfg.Logging.Level, cfg.Logging.Format, "forge-engine"); err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Logger.Info("Starting Forge Engine", zap.String("version", "1.0.0"))

	// Initialize task processor
	processor, err := task.NewProcessor(cfg)
	if err != nil {
		logger.Logger.Error("Failed to create task processor", zap.Error(err))
		os.Exit(1)
	}
	defer func() {
		if err := processor.Close(); err != nil {
			logger.Logger.Error("Failed to close task processor", zap.Error(err))
		}
	}()

	// Initialize Redis worker
	worker, err := queue.NewRedisWorker(cfg, processor)
	if err != nil {
		logger.Logger.Error("Failed to create Redis worker", zap.Error(err))
		os.Exit(1)
	}

	// Start worker pool
	if err := worker.Start(); err != nil {
		logger.Logger.Error("Failed to start worker pool", zap.Error(err))
		os.Exit(1)
	}

	// Start HTTP server
	httpServer := server.NewServer(cfg)
	var wg sync.WaitGroup
	
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := httpServer.Start(); err != nil {
			logger.Logger.Error("HTTP server error", zap.Error(err))
		}
	}()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	logger.Logger.Info("Forge Engine started successfully", 
		zap.Int("worker_pool_size", cfg.Worker.PoolSize),
		zap.String("redis_addr", cfg.Redis.Addr),
		zap.String("queue_name", cfg.Redis.QueueName),
		zap.String("http_server", fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)))

	// Wait for shutdown signal
	<-sigChan
	logger.Logger.Info("Shutdown signal received, starting graceful shutdown")

	// Create shutdown context with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer shutdownCancel()

	// Stop HTTP server
	if err := httpServer.Stop(shutdownCtx); err != nil {
		logger.Logger.Error("Error during HTTP server shutdown", zap.Error(err))
	}

	// Stop worker pool
	if err := worker.Stop(); err != nil {
		logger.Logger.Error("Error during worker shutdown", zap.Error(err))
	}

	// Wait for HTTP server to finish
	wg.Wait()

	// Wait for shutdown to complete or timeout
	done := make(chan struct{})
	go func() {
		defer close(done)
		// Additional cleanup can be added here
	}()

	select {
	case <-done:
		logger.Logger.Info("Graceful shutdown completed")
	case <-shutdownCtx.Done():
		logger.Logger.Warn("Shutdown timeout exceeded, forcing exit")
	}

	logger.Logger.Info("Forge Engine stopped")
}


