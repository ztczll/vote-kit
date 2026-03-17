package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"forge-engine/internal/config"
	"forge-engine/internal/task"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type RedisWorker struct {
	client    *redis.Client
	config    *config.Config
	processor TaskProcessor
	workers   sync.WaitGroup
	ctx       context.Context
	cancel    context.CancelFunc
}

type TaskProcessor interface {
	ProcessTask(ctx context.Context, task *task.Task) error
}

func NewRedisWorker(cfg *config.Config, processor TaskProcessor) (*RedisWorker, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
		PoolSize: cfg.Redis.PoolSize,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	workerCtx, workerCancel := context.WithCancel(context.Background())

	return &RedisWorker{
		client:    client,
		config:    cfg,
		processor: processor,
		ctx:       workerCtx,
		cancel:    workerCancel,
	}, nil
}

func (w *RedisWorker) Start() error {
	logger.Logger.Info("Starting Redis worker pool", zap.Int("pool_size", w.config.Worker.PoolSize))

	for i := 0; i < w.config.Worker.PoolSize; i++ {
		w.workers.Add(1)
		go w.worker(i)
	}

	return nil
}

func (w *RedisWorker) Stop() error {
	logger.Logger.Info("Stopping Redis worker pool")
	w.cancel()
	w.workers.Wait()
	return w.client.Close()
}

func (w *RedisWorker) worker(id int) {
	defer w.workers.Done()
	
	workerLogger := logger.Logger.With(zap.Int("worker_id", id))
	workerLogger.Info("Worker started")

	for {
		select {
		case <-w.ctx.Done():
			workerLogger.Info("Worker stopping")
			return
		default:
			if err := w.processNextTask(workerLogger); err != nil {
				workerLogger.Error("Error processing task", zap.Error(err))
				time.Sleep(w.config.Worker.RetryDelay)
			}
		}
	}
}

func (w *RedisWorker) processNextTask(workerLogger *zap.Logger) error {
	// Block for up to 5 seconds waiting for a task from priority queues
	// BRPOP checks queues in order: dedicated -> priority -> normal
	queueName := w.config.Redis.QueueName
	queues := []string{
		queueName + ":dedicated",
		queueName + ":priority",
		queueName + ":normal",
	}
	result, err := w.client.BRPop(w.ctx, 5*time.Second, queues...).Result()
	if err != nil {
		if err == redis.Nil {
			return nil // No task available, continue
		}
		return fmt.Errorf("failed to pop task from queue: %w", err)
	}

	if len(result) < 2 {
		return fmt.Errorf("invalid task format from queue")
	}

	taskData := result[1]
	var t task.Task
	if err := json.Unmarshal([]byte(taskData), &t); err != nil {
		workerLogger.Error("Failed to unmarshal task", zap.Error(err), zap.String("data", taskData))
		return w.moveToDeadLetterQueue(taskData, err)
	}

	workerLogger = workerLogger.With(zap.String("task_id", t.TaskID), zap.String("app_name", t.AppName))
	workerLogger.Info("Processing task")

	// Create task context with timeout
	taskCtx, cancel := context.WithTimeout(w.ctx, w.config.Worker.TaskTimeout)
	defer cancel()

	// Process task with retry logic
	if err := w.processTaskWithRetry(taskCtx, &t, workerLogger); err != nil {
		workerLogger.Error("Task processing failed", zap.Error(err))
		return w.moveToDeadLetterQueue(taskData, err)
	}

	workerLogger.Info("Task completed successfully")
	return nil
}

func (w *RedisWorker) processTaskWithRetry(ctx context.Context, t *task.Task, workerLogger *zap.Logger) error {
	var lastErr error
	delay := w.config.Worker.RetryDelay

	for attempt := 0; attempt <= w.config.Redis.MaxRetries; attempt++ {
		if attempt > 0 {
			workerLogger.Info("Retrying task", zap.Int("attempt", attempt), zap.Duration("delay", delay))
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
			
			// Exponential backoff
			delay *= 2
			if delay > w.config.Worker.MaxRetryDelay {
				delay = w.config.Worker.MaxRetryDelay
			}
		}

		if err := w.processor.ProcessTask(ctx, t); err != nil {
			lastErr = err
			workerLogger.Warn("Task attempt failed", zap.Int("attempt", attempt), zap.Error(err))
			continue
		}

		return nil
	}

	return fmt.Errorf("task failed after %d attempts: %w", w.config.Redis.MaxRetries+1, lastErr)
}

func (w *RedisWorker) moveToDeadLetterQueue(taskData string, err error) error {
	deadLetterData := map[string]interface{}{
		"original_task": taskData,
		"error":         err.Error(),
		"failed_at":     time.Now(),
	}

	data, marshalErr := json.Marshal(deadLetterData)
	if marshalErr != nil {
		logger.Logger.Error("Failed to marshal dead letter data", zap.Error(marshalErr))
		return marshalErr
	}

	if err := w.client.LPush(w.ctx, w.config.Redis.DeadLetterQueue, data).Err(); err != nil {
		logger.Logger.Error("Failed to move task to dead letter queue", zap.Error(err))
		return err
	}

	logger.Logger.Warn("Task moved to dead letter queue", zap.Error(err))
	return nil
}

// EnqueueTask adds a task to the queue (for testing purposes)
func (w *RedisWorker) EnqueueTask(t *task.Task) error {
	data, err := json.Marshal(t)
	if err != nil {
		return fmt.Errorf("failed to marshal task: %w", err)
	}

	return w.client.LPush(w.ctx, w.config.Redis.QueueName, data).Err()
}
