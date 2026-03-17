package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"forge-engine/internal/config"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type Server struct {
	httpServer    *http.Server
	exportHandler *ExportHandler
}

func NewServer(cfg *config.Config) *Server {
	exportHandler := NewExportHandler(cfg.AI.Kiro.OutputDir)
	
	mux := http.NewServeMux()
	
	// 导出接口
	mux.HandleFunc("/api/export", exportHandler.ExportSourceCode)
	
	// 下载接口
	mux.HandleFunc("/api/download/", exportHandler.DownloadSourceCode)
	
	// 健康检查
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","service":"forge-engine-export"}`))
	})
	
	// 根路径
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message":"Forge Engine Export API","version":"1.0.0","endpoints":["/api/export","/api/download/{filename}","/health"]}`))
	})

	server := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port),
		Handler:      loggingMiddleware(mux),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return &Server{
		httpServer:    server,
		exportHandler: exportHandler,
	}
}

func (s *Server) Start() error {
	logger.Logger.Info("Starting HTTP server", zap.String("addr", s.httpServer.Addr))
	return s.httpServer.ListenAndServe()
}

func (s *Server) Stop(ctx context.Context) error {
	logger.Logger.Info("Stopping HTTP server")
	return s.httpServer.Shutdown(ctx)
}

// 日志中间件
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// 创建响应记录器
		recorder := &responseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}
		
		// 处理请求
		next.ServeHTTP(recorder, r)
		
		// 记录日志
		duration := time.Since(start)
		logger.Logger.Info("HTTP request",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", recorder.statusCode),
			zap.Duration("duration", duration),
			zap.String("remote_addr", getClientIP(r)),
		)
	})
}

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func getClientIP(r *http.Request) string {
	// 检查 X-Forwarded-For 头
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	
	// 检查 X-Real-IP 头
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	
	// 使用远程地址
	return r.RemoteAddr
}
