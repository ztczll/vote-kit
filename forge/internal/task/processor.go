package task

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"forge-engine/internal/ai"
	"forge-engine/internal/config"
	"forge-engine/internal/export"
	"forge-engine/internal/git"
	"forge-engine/internal/notify"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type Processor struct {
	config         *config.Config
	codeGenerator  ai.CodeGenerator
	gitManager     *git.Manager
	exportService  *export.ExportService
	callbackClient *notify.CallbackClient
}

func NewProcessor(cfg *config.Config) (*Processor, error) {
	var codeGenerator ai.CodeGenerator
	
	gitManager := git.NewManager(&cfg.Git)
	
	// Select AI engine based on configuration
	if cfg.AI.Engine == "cursor" {
		codeGenerator = ai.NewCursorAgentClient(&cfg.AI.Cursor, gitManager)
	} else {
		// Default to Kiro
		codeGenerator = ai.NewKiroClient(&cfg.AI.Kiro)
	}
	
	callbackClient := notify.NewCallbackClient()

	// Create export service for packaging source code
	exportDir := cfg.AI.ExportDir
	if exportDir == "" {
		exportDir = "/tmp/forge-exports"
	}
	exportService := export.NewExportService(exportDir)

	return &Processor{
		config:         cfg,
		codeGenerator:  codeGenerator,
		gitManager:     gitManager,
		exportService:  exportService,
		callbackClient: callbackClient,
	}, nil
}

func (p *Processor) ProcessTask(ctx context.Context, t *Task) error {
	taskLogger := logger.Logger.With(zap.String("task_id", t.TaskID), zap.String("app_name", t.AppName))
	taskLogger.Info("Starting task processing")

	// Create task context
	taskCtx := &TaskContext{
		Task:      t,
		StartTime: time.Now(),
		Logs:      make([]notify.LogEntry, 0),
	}

	// Send initial progress callback
	if err := p.sendProgressCallback(ctx, taskCtx, notify.StepCodeGeneration); err != nil {
		taskLogger.Warn("Failed to send initial progress callback", zap.Error(err))
	}

	// Execute processing steps
	if err := p.executeProcessingSteps(ctx, taskCtx, taskLogger); err != nil {
		// Send failure callback
		taskErr := &notify.TaskError{
			Code:    "PROCESSING_FAILED",
			Message: err.Error(),
			Step:    notify.StepCodeGeneration, // Will be updated by individual steps
		}
		
		if callbackErr := p.callbackClient.SendFailureCallback(ctx, t.CallbackURL, t.TaskID, taskErr, taskCtx.Logs, taskCtx.StartTime); callbackErr != nil {
			taskLogger.Error("Failed to send failure callback", zap.Error(callbackErr))
		}
		
		return err
	}

	taskLogger.Info("Task processing completed successfully")
	return nil
}

func (p *Processor) executeProcessingSteps(ctx context.Context, taskCtx *TaskContext, taskLogger *zap.Logger) (finalErr error) {
	var repo *git.Repository
	var zipPath string

	// Cleanup function - preserve Git repositories and zip files
	defer func() {
		// Git repositories are preserved for inspection
		if repo != nil {
			taskLogger.Info("Git repository preserved", zap.String("local_path", repo.LocalDir))
		}
		// Zip files are preserved for download
		if zipPath != "" {
			taskLogger.Info("Source zip package preserved", zap.String("zip_path", zipPath))
		}
	}()

	// Step 1: Code Generation
	engineName := p.config.AI.Engine
	if engineName == "" {
		engineName = "kiro"
	}
	taskCtx.AddLog("info", fmt.Sprintf("Starting code generation with %s", engineName))
	if err := p.sendProgressCallback(ctx, taskCtx, notify.StepCodeGeneration); err != nil {
		taskLogger.Warn("Failed to send progress callback", zap.Error(err))
	}

	// Determine output directory based on engine
	var outputDir string
	if p.config.AI.Engine == "cursor" {
		outputDir = filepath.Join("/tmp/forge-generated", taskCtx.Task.TaskID)
	} else {
		outputDir = filepath.Join(p.config.AI.Kiro.OutputDir, taskCtx.Task.TaskID)
	}
	files, err := p.codeGenerator.GenerateCode(ctx, taskCtx.Task.Prompt, outputDir)
	if err != nil {
		taskCtx.AddLog("error", fmt.Sprintf("Code generation failed: %v", err))
		return fmt.Errorf("code generation failed: %w", err)
	}
	taskCtx.AddLog("info", fmt.Sprintf("Generated %d files", len(files)))

	// Step 2: Git Repository Creation
	taskCtx.AddLog("info", "Creating Git repository")
	if err := p.sendProgressCallback(ctx, taskCtx, notify.StepGitCommit); err != nil {
		taskLogger.Warn("Failed to send progress callback", zap.Error(err))
	}

	repo, err = p.gitManager.CreateRepository(ctx, taskCtx.Task.AppName, files)
	if err != nil {
		taskCtx.AddLog("error", fmt.Sprintf("Git repository creation failed: %v", err))
		return fmt.Errorf("git repository creation failed: %w", err)
	}
	taskCtx.GitRepoPath = repo.LocalDir
	taskCtx.AddLog("info", fmt.Sprintf("Repository created: %s", repo.URL))

	// Step 3: Package Source Code as ZIP
	taskCtx.AddLog("info", "Packaging source code as ZIP")
	if err := p.sendProgressCallback(ctx, taskCtx, notify.StepPackageZip); err != nil {
		taskLogger.Warn("Failed to send progress callback", zap.Error(err))
	}

	zipPath, err = p.exportService.ExportFromDirectory(repo.LocalDir, taskCtx.Task.AppName, true)
	if err != nil {
		taskCtx.AddLog("error", fmt.Sprintf("ZIP packaging failed: %v", err))
		return fmt.Errorf("zip packaging failed: %w", err)
	}
	
	zipFileName := filepath.Base(zipPath)
	taskCtx.AddLog("info", fmt.Sprintf("Source code packaged: %s", zipFileName))

	// Step 4: Build Complete
	taskCtx.AddLog("info", "Build completed, source code ready for download")
	if err := p.sendProgressCallback(ctx, taskCtx, notify.StepCallback); err != nil {
		taskLogger.Warn("Failed to send progress callback", zap.Error(err))
	}

	// Calculate tokens and cost
	// Simple estimation: prompt tokens + generated code tokens
	promptTokens := len([]rune(taskCtx.Task.Prompt)) / 4 // Rough estimation: 1 token ≈ 4 characters
	generatedTokens := len(files) * 100 // Rough estimation: each file ≈ 100 tokens
	totalTokens := promptTokens + generatedTokens
	
	// Calculate cost: $0.01 per 1000 tokens (example pricing, adjust as needed)
	// Cost in cents: tokens / 1000 * 100 cents
	costCents := (totalTokens / 1000) * 100
	if totalTokens%1000 > 0 {
		costCents += 100 // Round up
	}

	result := &notify.Result{
		GitRepositoryURL: repo.URL,
		SourceZipPath:    zipPath,
		SourceFileName:   zipFileName,
		DeploymentURL:    "", // Not deploying, just providing source code
		ComposeFilePath:  "",
		TokensUsed:       totalTokens,
		CostCents:        costCents,
	}

	if err := p.callbackClient.SendSuccessCallback(ctx, taskCtx.Task.CallbackURL, taskCtx.Task.TaskID, result, taskCtx.Logs, taskCtx.StartTime); err != nil {
		taskCtx.AddLog("error", fmt.Sprintf("Failed to send success callback: %v", err))
		return fmt.Errorf("failed to send success callback: %w", err)
	}

	taskCtx.AddLog("info", "Task completed successfully")
	
	// Cleanup output directory - files are already copied to Git repository
	if err := os.RemoveAll(outputDir); err != nil {
		taskLogger.Warn("Failed to cleanup output directory", zap.Error(err))
	} else {
		taskLogger.Info("Cleaned up output directory", zap.String("output_dir", outputDir))
	}

	return nil
}

func (p *Processor) sendProgressCallback(ctx context.Context, taskCtx *TaskContext, step notify.TaskStep) error {
	return p.callbackClient.SendProgressCallback(ctx, taskCtx.Task.CallbackURL, taskCtx.Task.TaskID, step, taskCtx.Logs)
}

func (p *Processor) Close() error {
	// No resources to close
	return nil
}
