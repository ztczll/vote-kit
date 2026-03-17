package ai

import (
	"context"
)

// CodeGenerator defines the interface for code generation engines
type CodeGenerator interface {
	// GenerateCode generates code files based on the given prompt
	// Returns a map of file paths (relative to outputDir) to file contents
	GenerateCode(ctx context.Context, prompt string, outputDir string) (map[string]string, error)
}

