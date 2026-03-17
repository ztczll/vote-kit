package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"forge-engine/internal/export"
	"forge-engine/pkg/logger"
	"go.uber.org/zap"
)

type ExportHandler struct {
	exportService *export.ExportService
}

type ExportRequest struct {
	TaskID        string `json:"task_id"`
	AppName       string `json:"app_name"`
	IncludeReadme bool   `json:"include_readme"`
}

type ExportResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message"`
	DownloadURL string `json:"download_url,omitempty"`
	FileName    string `json:"file_name,omitempty"`
}

func NewExportHandler(generatedCodeDir string) *ExportHandler {
	return &ExportHandler{
		exportService: export.NewExportService(generatedCodeDir),
	}
}

func (h *ExportHandler) ExportSourceCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.sendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendErrorResponse(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// 验证必需字段
	if req.TaskID == "" || req.AppName == "" {
		h.sendErrorResponse(w, http.StatusBadRequest, "task_id and app_name are required")
		return
	}

	logger.Logger.Info("Exporting source code", zap.String("task_id", req.TaskID), zap.String("app_name", req.AppName))

	// 导出源码
	zipPath, err := h.exportService.ExportSourceCode(export.ExportOptions{
		TaskID:        req.TaskID,
		AppName:       req.AppName,
		IncludeReadme: req.IncludeReadme,
	})
	if err != nil {
		logger.Logger.Error("Failed to export source code", zap.Error(err), zap.String("task_id", req.TaskID))
		h.sendErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Export failed: %v", err))
		return
	}

	// 生成下载 URL
	fileName := filepath.Base(zipPath)
	downloadURL := fmt.Sprintf("/api/download/%s", fileName)

	// 存储文件路径供下载使用（简单实现，生产环境应使用数据库或缓存）
	// 这里我们将在下载处理器中处理

	response := ExportResponse{
		Success:     true,
		Message:     "Source code exported successfully",
		DownloadURL: downloadURL,
		FileName:    fileName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	logger.Logger.Info("Source code exported successfully", zap.String("task_id", req.TaskID), zap.String("file", fileName))
}

func (h *ExportHandler) DownloadSourceCode(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		h.sendErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// 从 URL 路径获取文件名
	fileName := filepath.Base(r.URL.Path)
	if fileName == "" || fileName == "." {
		h.sendErrorResponse(w, http.StatusBadRequest, "Invalid file name")
		return
	}

	// 构建文件路径（先尝试配置的导出目录，再尝试临时目录）
	baseDir := h.exportService.GetBaseDir()
	filePath := filepath.Join(baseDir, fileName)
	if baseDir == "" {
		filePath = filepath.Join(os.TempDir(), fileName)
	}
	
	// 如果文件不存在，尝试临时目录
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		filePath = filepath.Join(os.TempDir(), fileName)
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		h.sendErrorResponse(w, http.StatusNotFound, "File not found")
		return
	}

	logger.Logger.Info("Downloading source code", zap.String("file", fileName))

	// 设置下载响应头
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))

	// 发送文件
	http.ServeFile(w, r, filePath)

	// Note: Files are preserved for download from app store, not auto-cleaned
}

func (h *ExportHandler) sendErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	response := ExportResponse{
		Success: false,
		Message: message,
	}
	
	json.NewEncoder(w).Encode(response)
}
