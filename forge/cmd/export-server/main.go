package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"forge-engine/internal/config"
	"forge-engine/internal/server"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

func main() {
	// Setup logging
	if err := logger.InitWithService("info", "json", "forge-export"); err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Logger.Info("Starting Forge Engine Export Server", zap.String("version", "1.0.0"))

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Logger.Error("Failed to load configuration", zap.Error(err))
		os.Exit(1)
	}

	// Use different port for export server
	cfg.Server.Port = 8081

	// Start HTTP server
	httpServer := server.NewServer(cfg)
	
	go func() {
		if err := httpServer.Start(); err != nil {
			logger.Logger.Error("HTTP server error", zap.Error(err))
		}
	}()

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	logger.Logger.Info("Export server started successfully", 
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

	logger.Logger.Info("Export server stopped")
}
