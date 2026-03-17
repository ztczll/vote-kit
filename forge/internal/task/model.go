package task

import (
	"time"
	"forge-engine/internal/notify"
)

// Task represents a build task from Vote-Kit
type Task struct {
	TaskID         string            `json:"task_id"`
	AppName        string            `json:"app_name"`
	Prompt         string            `json:"prompt"`
	CallbackURL    string            `json:"callback_url"`
	CreatedAt      time.Time         `json:"created_at"`
	Priority       string            `json:"priority"`
	TimeoutSeconds int               `json:"timeout_seconds"`
	Metadata       map[string]string `json:"metadata"`
}

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

// TaskContext holds runtime context for task processing
type TaskContext struct {
	Task        *Task
	WorkDir     string
	GitRepoPath string
	DockerImage string
	Logs        []notify.LogEntry
	StartTime   time.Time
}

// AddLog adds a log entry to the task context
func (tc *TaskContext) AddLog(level, message string) {
	tc.Logs = append(tc.Logs, notify.LogEntry{
		Level:     level,
		Message:   message,
		Timestamp: time.Now(),
	})
}

// GetProgress returns current progress based on step
func GetProgress(step TaskStep) Progress {
	stepMap := map[TaskStep]struct {
		current int
		name    string
	}{
		StepCodeGeneration: {1, "Generating code with Kiro"},
		StepGitCommit:      {2, "Committing to Git repository"},
		StepDockerBuild:    {3, "Building Docker image"},
		StepDockerDeploy:   {4, "Deploying with Docker Compose"},
		StepCallback:       {5, "Sending completion callback"},
	}

	info := stepMap[step]
	return Progress{
		CurrentStep: step,
		TotalSteps:  5,
		StepName:    info.name,
	}
}
