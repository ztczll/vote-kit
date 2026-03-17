package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/go-resty/resty/v2"
)

// TaskStatus represents the current status of a task
type TaskStatus string

const (
	StatusPending     TaskStatus = "pending"
	StatusInProgress  TaskStatus = "in_progress"
	StatusCompleted   TaskStatus = "completed"
	StatusFailed      TaskStatus = "failed"
)

// TaskStep represents individual steps in task processing
type TaskStep string

const (
	StepCodeGeneration TaskStep = "code_generation"
	StepGitCommit      TaskStep = "git_commit"
	StepPackageZip     TaskStep = "package_zip"
	StepDockerBuild    TaskStep = "docker_build"
	StepDockerDeploy   TaskStep = "docker_deploy"
	StepCallback       TaskStep = "callback"
)

// Progress represents task progress information
type Progress struct {
	CurrentStep TaskStep `json:"current_step"`
	TotalSteps  int      `json:"total_steps"`
	StepName    string   `json:"step_name"`
}

// Result represents task execution results
type Result struct {
	GitRepositoryURL string `json:"git_repository_url,omitempty"`
	DockerImage      string `json:"docker_image,omitempty"`
	DeploymentURL    string `json:"deployment_url,omitempty"`
	ComposeFilePath  string `json:"compose_file_path,omitempty"`
	SourceZipPath    string `json:"source_zip_path,omitempty"` // Path to the source code zip package
	SourceFileName   string `json:"source_file_name,omitempty"` // Name of the zip file
	TokensUsed       int    `json:"tokens_used,omitempty"`       // AI tokens consumed
	CostCents        int    `json:"cost_cents,omitempty"`        // Cost in cents (e.g., 100 = 1.00)
}

// TaskError represents error information
type TaskError struct {
	Code    string   `json:"code"`
	Message string   `json:"message"`
	Step    TaskStep `json:"step"`
}

// LogEntry represents a log entry
type LogEntry struct {
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// Timestamps represents task timing information
type Timestamps struct {
	StartedAt   time.Time  `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

// Callback represents the callback payload sent to Vote-Kit
type Callback struct {
	TaskID     string      `json:"task_id"`
	Status     TaskStatus  `json:"status"`
	Progress   *Progress   `json:"progress,omitempty"`
	Result     *Result     `json:"result,omitempty"`
	Error      *TaskError  `json:"error,omitempty"`
	Timestamps Timestamps  `json:"timestamps"`
	Logs       []LogEntry  `json:"logs"`
}

// GetProgress returns current progress based on step
func GetProgress(step TaskStep) Progress {
	stepMap := map[TaskStep]struct {
		current int
		name    string
	}{
		StepCodeGeneration: {1, "Generating code"},
		StepGitCommit:      {2, "Committing to Git repository"},
		StepPackageZip:     {3, "Packaging source code"},
		StepDockerBuild:    {4, "Building Docker image"},
		StepDockerDeploy:   {5, "Deploying with Docker Compose"},
		StepCallback:       {6, "Sending completion callback"},
	}

	info := stepMap[step]
	totalSteps := 3 // Default: code generation, git commit, package zip
	if step == StepDockerBuild || step == StepDockerDeploy {
		totalSteps = 6 // Include Docker steps if needed
	}
	
	return Progress{
		CurrentStep: step,
		TotalSteps:  totalSteps,
		StepName:    info.name,
	}
}

type CallbackClient struct {
	client *resty.Client
}

func NewCallbackClient() *CallbackClient {
	client := resty.New()
	client.SetTimeout(30 * time.Second)
	client.SetRetryCount(3)
	client.SetRetryWaitTime(2 * time.Second)
	client.SetRetryMaxWaitTime(10 * time.Second)

	return &CallbackClient{
		client: client,
	}
}

func (c *CallbackClient) SendCallback(ctx context.Context, callbackURL string, callback *Callback) error {
	log.Printf("Sending callback for task %s with status %s to %s", callback.TaskID, callback.Status, callbackURL)

	// Marshal callback to JSON
	jsonData, err := json.Marshal(callback)
	if err != nil {
		return fmt.Errorf("failed to marshal callback: %w", err)
	}

	// Send HTTP POST request
	resp, err := c.client.R().
		SetContext(ctx).
		SetHeader("Content-Type", "application/json").
		SetBody(bytes.NewReader(jsonData)).
		Post(callbackURL)

	if err != nil {
		return fmt.Errorf("failed to send callback: %w", err)
	}

	if resp.StatusCode() < 200 || resp.StatusCode() >= 300 {
		return fmt.Errorf("callback request failed with status %d: %s", resp.StatusCode(), resp.String())
	}

	log.Printf("Callback sent successfully with status code %d", resp.StatusCode())
	return nil
}

func (c *CallbackClient) SendProgressCallback(ctx context.Context, callbackURL string, taskID string, step TaskStep, logs []LogEntry) error {
	progress := GetProgress(step)
	
	callback := &Callback{
		TaskID:   taskID,
		Status:   StatusInProgress,
		Progress: &progress,
		Timestamps: Timestamps{
			StartedAt: time.Now(),
		},
		Logs: logs,
	}

	return c.SendCallback(ctx, callbackURL, callback)
}

func (c *CallbackClient) SendSuccessCallback(ctx context.Context, callbackURL string, taskID string, result *Result, logs []LogEntry, startTime time.Time) error {
	now := time.Now()
	callback := &Callback{
		TaskID: taskID,
		Status: StatusCompleted,
		Result: result,
		Timestamps: Timestamps{
			StartedAt:   startTime,
			CompletedAt: &now,
		},
		Logs: logs,
	}

	return c.SendCallback(ctx, callbackURL, callback)
}

func (c *CallbackClient) SendFailureCallback(ctx context.Context, callbackURL string, taskID string, taskErr *TaskError, logs []LogEntry, startTime time.Time) error {
	now := time.Now()
	callback := &Callback{
		TaskID: taskID,
		Status: StatusFailed,
		Error:  taskErr,
		Timestamps: Timestamps{
			StartedAt:   startTime,
			CompletedAt: &now,
		},
		Logs: logs,
	}

	return c.SendCallback(ctx, callbackURL, callback)
}
