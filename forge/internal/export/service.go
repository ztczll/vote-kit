package export

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type ExportService struct {
	baseDir string
}

// GetBaseDir returns the base directory for exports
func (e *ExportService) GetBaseDir() string {
	return e.baseDir
}

type ExportOptions struct {
	TaskID      string
	AppName     string
	IncludeReadme bool
}

func NewExportService(baseDir string) *ExportService {
	return &ExportService{
		baseDir: baseDir,
	}
}

func (e *ExportService) ExportSourceCode(options ExportOptions) (string, error) {
	// 查找任务的生成目录
	sourceDir := filepath.Join(e.baseDir, options.TaskID)
	if _, err := os.Stat(sourceDir); os.IsNotExist(err) {
		return "", fmt.Errorf("source code not found for task %s", options.TaskID)
	}

	// 创建临时导出目录
	exportDir := filepath.Join(os.TempDir(), fmt.Sprintf("export-%s-%d", options.TaskID, time.Now().Unix()))
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create export directory: %w", err)
	}
	defer os.RemoveAll(exportDir)

	// 复制源码文件（排除不需要的文件）
	if err := e.copySourceFiles(sourceDir, exportDir, options); err != nil {
		return "", fmt.Errorf("failed to copy source files: %w", err)
	}

	// 创建 ZIP 文件
	zipPath := filepath.Join(os.TempDir(), fmt.Sprintf("%s-source-%d.zip", options.AppName, time.Now().Unix()))
	if err := e.createZipArchive(exportDir, zipPath); err != nil {
		return "", fmt.Errorf("failed to create zip archive: %w", err)
	}

	return zipPath, nil
}

func (e *ExportService) copySourceFiles(sourceDir, exportDir string, options ExportOptions) error {
	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 获取相对路径
		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}

		// 跳过根目录
		if relPath == "." {
			return nil
		}

		// 跳过不需要的文件和目录
		if e.shouldSkipFile(relPath, info, options) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		destPath := filepath.Join(exportDir, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, info.Mode())
		}

		// 复制文件
		return e.copyFile(path, destPath)
	})
}

func (e *ExportService) shouldSkipFile(relPath string, info os.FileInfo, options ExportOptions) bool {
	// 跳过 .git 目录和所有内容
	if strings.Contains(relPath, ".git") || strings.HasPrefix(relPath, ".git/") {
		return true
	}

	// 跳过 .cursor 目录和所有内容
	if strings.Contains(relPath, ".cursor") || strings.HasPrefix(relPath, ".cursor/") {
		return true
	}

	// 跳过其他隐藏文件和目录（但保留 .env.example 等有用的隐藏文件）
	baseName := filepath.Base(relPath)
	if strings.HasPrefix(baseName, ".") && baseName != ".env.example" && baseName != ".gitignore" {
		// 检查是否是隐藏目录
		if info.IsDir() {
			return true
		}
		// 对于隐藏文件，只跳过特定的
		skipHiddenFiles := []string{".DS_Store", ".vscode", ".idea"}
		for _, skipFile := range skipHiddenFiles {
			if strings.Contains(relPath, skipFile) {
				return true
			}
		}
	}

	// 跳过 Kiro 相关文件
	kiroFiles := []string{
		"kiro_output.txt",
		"kiro_script.sh",
		"prompt.txt",
	}
	for _, kiroFile := range kiroFiles {
		if strings.Contains(relPath, kiroFile) {
			return true
		}
	}

	// 跳过临时文件
	if strings.HasSuffix(relPath, ".tmp") || strings.HasSuffix(relPath, ".log") {
		return true
	}

	// 可选跳过 README.md
	if !options.IncludeReadme && strings.ToLower(filepath.Base(relPath)) == "readme.md" {
		return true
	}

	return false
}

func (e *ExportService) copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	// 创建目标目录
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

func (e *ExportService) createZipArchive(sourceDir, zipPath string) error {
	zipFile, err := os.Create(zipPath)
	if err != nil {
		return err
	}
	defer zipFile.Close()

	zipWriter := zip.NewWriter(zipFile)
	defer zipWriter.Close()

	return filepath.Walk(sourceDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}

		// 创建 ZIP 文件条目
		zipEntry, err := zipWriter.Create(relPath)
		if err != nil {
			return err
		}

		// 复制文件内容
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(zipEntry, file)
		return err
	})
}

// ExportFromDirectory exports source code from a given directory (e.g., Git repository)
func (e *ExportService) ExportFromDirectory(sourceDir string, appName string, includeReadme bool) (string, error) {
	if _, err := os.Stat(sourceDir); os.IsNotExist(err) {
		return "", fmt.Errorf("source directory not found: %s", sourceDir)
	}

	// 创建临时导出目录
	exportDir := filepath.Join(os.TempDir(), fmt.Sprintf("export-%s-%d", appName, time.Now().Unix()))
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create export directory: %w", err)
	}
	defer os.RemoveAll(exportDir)

	// 复制源码文件（排除不需要的文件）
	options := ExportOptions{
		AppName:       appName,
		IncludeReadme: includeReadme,
	}
	if err := e.copySourceFiles(sourceDir, exportDir, options); err != nil {
		return "", fmt.Errorf("failed to copy source files: %w", err)
	}

	// 创建 ZIP 文件保存目录（如果配置了 baseDir，使用它；否则使用临时目录）
	zipDir := e.baseDir
	if zipDir == "" {
		zipDir = os.TempDir()
	} else {
		// 确保目录存在
		if err := os.MkdirAll(zipDir, 0755); err != nil {
			return "", fmt.Errorf("failed to create zip directory: %w", err)
		}
	}

	// Sanitize app name for filename (remove invalid characters, limit length)
	sanitizedName := e.sanitizeFileName(appName)
	
	// 创建 ZIP 文件
	zipPath := filepath.Join(zipDir, fmt.Sprintf("%s-source-%d.zip", sanitizedName, time.Now().Unix()))
	if err := e.createZipArchive(exportDir, zipPath); err != nil {
		return "", fmt.Errorf("failed to create zip archive: %w", err)
	}

	return zipPath, nil
}

// sanitizeFileName sanitizes a string to be safe for use in filenames
func (e *ExportService) sanitizeFileName(name string) string {
	// Remove or replace invalid characters for filenames
	sanitized := strings.ReplaceAll(name, " ", "-")
	sanitized = strings.ReplaceAll(sanitized, "_", "-")
	
	// Remove all non-alphanumeric characters except dash
	var result strings.Builder
	for _, r := range sanitized {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	
	sanitized = result.String()
	
	// Remove consecutive dashes
	for strings.Contains(sanitized, "--") {
		sanitized = strings.ReplaceAll(sanitized, "--", "-")
	}
	
	// Trim dashes from start and end
	sanitized = strings.Trim(sanitized, "-")
	
	// Ensure minimum length (if empty or too short, use a default)
	if len(sanitized) < 3 {
		sanitized = "app"
	}
	
	// Limit length to 50 characters
	if len(sanitized) > 50 {
		sanitized = sanitized[:50]
	}
	
	return sanitized
}

func (e *ExportService) CleanupExportFile(filePath string) error {
	return os.Remove(filePath)
}
