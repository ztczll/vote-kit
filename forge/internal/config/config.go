package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
	"forge-engine/pkg/logger"
)

type Config struct {
	Server        ServerConfig        `mapstructure:"server"`
	Redis         RedisConfig         `mapstructure:"redis"`
	Worker        WorkerConfig        `mapstructure:"worker"`
	AI            AIConfig            `mapstructure:"ai"`
	Git           GitConfig           `mapstructure:"git"`
	Docker        DockerConfig        `mapstructure:"docker"`
	Logging       LoggingConfig       `mapstructure:"logging"`
	CircuitBreaker CircuitBreakerConfig `mapstructure:"circuit_breaker"`
}

type ServerConfig struct {
	Port            int           `mapstructure:"port"`
	Host            string        `mapstructure:"host"`
	ShutdownTimeout time.Duration `mapstructure:"shutdown_timeout"`
}

type RedisConfig struct {
	Addr            string `mapstructure:"addr"`
	Password        string `mapstructure:"password"`
	DB              int    `mapstructure:"db"`
	PoolSize        int    `mapstructure:"pool_size"`
	QueueName       string `mapstructure:"queue_name"`
	DeadLetterQueue string `mapstructure:"dead_letter_queue"`
	MaxRetries      int    `mapstructure:"max_retries"`
}

type WorkerConfig struct {
	PoolSize           int           `mapstructure:"pool_size"`
	MaxConcurrentTasks int           `mapstructure:"max_concurrent_tasks"`
	TaskTimeout        time.Duration `mapstructure:"task_timeout"`
	RetryDelay         time.Duration `mapstructure:"retry_delay"`
	MaxRetryDelay      time.Duration `mapstructure:"max_retry_delay"`
}

type AIConfig struct {
	Engine      string       `mapstructure:"engine"`
	Kiro        KiroConfig   `mapstructure:"kiro"`
	Cursor      CursorConfig `mapstructure:"cursor"`
	ExportDir   string       `mapstructure:"export_dir"` // Directory for storing zip packages
}

type KiroConfig struct {
	BinaryPath string        `mapstructure:"binary_path"`
	Timeout    time.Duration `mapstructure:"timeout"`
	OutputDir  string        `mapstructure:"output_dir"`
	MaxRetries int           `mapstructure:"max_retries"`
}

type CursorConfig struct {
	APIKey      string                `mapstructure:"api_key"`
	APIBaseURL  string                `mapstructure:"api_base_url"`
	Model       string                `mapstructure:"model"`
	PollInterval time.Duration        `mapstructure:"poll_interval"`
	MaxWaitTime time.Duration         `mapstructure:"max_wait_time"`
	Repository  CursorRepositoryConfig `mapstructure:"repository"`
}

type CursorRepositoryConfig struct {
	BaseRepository string `mapstructure:"base_repository"`
	Organization   string `mapstructure:"organization"`
	CreateTempRepo bool   `mapstructure:"create_temp_repo"`
	DefaultBranch  string `mapstructure:"default_branch"` // Default branch name (main, master, etc.)
}

type GitConfig struct {
	BaseURL      string        `mapstructure:"base_url"`
	Username     string        `mapstructure:"username"`
	Token        string        `mapstructure:"token"`
	Organization string        `mapstructure:"organization"`
	CloneTimeout time.Duration `mapstructure:"clone_timeout"`
}

type DockerConfig struct {
	SocketPath     string        `mapstructure:"socket_path"`
	APIVersion     string        `mapstructure:"api_version"`
	BuildTimeout   time.Duration `mapstructure:"build_timeout"`
	DeployTimeout  time.Duration `mapstructure:"deploy_timeout"`
	Registry       string        `mapstructure:"registry"`
}

type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

type CircuitBreakerConfig struct {
	MaxRequests      uint32        `mapstructure:"max_requests"`
	Interval         time.Duration `mapstructure:"interval"`
	Timeout          time.Duration `mapstructure:"timeout"`
	FailureThreshold uint32        `mapstructure:"failure_threshold"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("/usr/local/etc/forge")
	viper.AddConfigPath("./configs")
	viper.AddConfigPath(".")

	// Environment variable support
	viper.AutomaticEnv()
	viper.SetEnvPrefix("FORGE")

	// Set defaults
	setDefaults()

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
		logger.Logger.Warn("No config file found, using defaults and environment variables")
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if err := validate(&config); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return &config, nil
}

func setDefaults() {
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.shutdown_timeout", "30s")
	
	viper.SetDefault("redis.addr", "localhost:6379")
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("redis.pool_size", 10)
	viper.SetDefault("redis.queue_name", "forge_tasks")
	viper.SetDefault("redis.dead_letter_queue", "forge_tasks_failed")
	viper.SetDefault("redis.max_retries", 3)
	
	viper.SetDefault("worker.pool_size", 20)
	viper.SetDefault("worker.max_concurrent_tasks", 50)
	viper.SetDefault("worker.task_timeout", "1800s")
	viper.SetDefault("worker.retry_delay", "5s")
	viper.SetDefault("worker.max_retry_delay", "300s")
	
	viper.SetDefault("ai.engine", "kiro")
	viper.SetDefault("ai.kiro.binary_path", "kiro-cli")
	viper.SetDefault("ai.kiro.timeout", "600s")
	viper.SetDefault("ai.kiro.output_dir", "/tmp/forge-generated")
	viper.SetDefault("ai.kiro.max_retries", 3)
	viper.SetDefault("ai.export_dir", "/tmp/forge-exports") // Directory for zip packages
	
	viper.SetDefault("ai.cursor.api_base_url", "https://api.cursor.com")
	viper.SetDefault("ai.cursor.model", "")
	viper.SetDefault("ai.cursor.poll_interval", "5s")
	viper.SetDefault("ai.cursor.max_wait_time", "30m")
	viper.SetDefault("ai.cursor.repository.create_temp_repo", true)
	viper.SetDefault("ai.cursor.repository.default_branch", "main")
	
	viper.SetDefault("logging.level", "info")
	viper.SetDefault("logging.format", "json")
	
	viper.SetDefault("docker.socket_path", "/var/run/docker.sock")
	viper.SetDefault("docker.build_timeout", "20m")
	viper.SetDefault("docker.registry", "")
	
	viper.SetDefault("git.base_dir", "/tmp/forge_repos")
	viper.SetDefault("git.cleanup_after", "24h")
	viper.SetDefault("git.token", "")
	viper.SetDefault("logging.output", "stdout")
	
	viper.SetDefault("circuit_breaker.max_requests", 3)
	viper.SetDefault("circuit_breaker.interval", "60s")
	viper.SetDefault("circuit_breaker.timeout", "30s")
	viper.SetDefault("circuit_breaker.failure_threshold", 5)
}

func validate(config *Config) error {
	if config.Redis.Addr == "" {
		return fmt.Errorf("redis address is required")
	}
	if config.Worker.PoolSize <= 0 {
		return fmt.Errorf("worker pool size must be positive")
	}
	if config.AI.Engine != "kiro" && config.AI.Engine != "cursor" {
		return fmt.Errorf("ai engine must be either 'kiro' or 'cursor'")
	}
	if config.AI.Engine == "cursor" && config.AI.Cursor.APIKey == "" {
		return fmt.Errorf("cursor api_key is required when using cursor engine")
	}
	return nil
}
