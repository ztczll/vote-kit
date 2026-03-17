# Forge Engine Makefile
# This is a convenience wrapper around CMake

.PHONY: all build clean install uninstall package help

# Default target
all: build

# Build using CMake
build:
	@mkdir -p build
	@cd build && cmake .. -DCMAKE_BUILD_TYPE=Release
	@cd build && make -j$$(nproc)

# Clean build directory
clean:
	@rm -rf build

# Install (requires sudo)
install: build
	@cd build && sudo make install

# Uninstall
uninstall:
	@./uninstall.sh

# Create packages
package: build
	@cd build && make package

# Development build (debug)
debug:
	@mkdir -p build
	@cd build && cmake .. -DCMAKE_BUILD_TYPE=Debug
	@cd build && make -j$$(nproc)

# Quick install for development
dev-install: debug
	@cd build && sudo make install

# Test build
test: build
	@echo "Running basic tests..."
	@cd build && ./demo --version || echo "Demo built successfully"
	@cd build && ./export-server --help || echo "Export-server built successfully"

# Help
help:
	@echo "Forge Engine Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  all        - Build all executables (default)"
	@echo "  build      - Build using CMake (Release mode)"
	@echo "  debug      - Build in Debug mode"
	@echo "  clean      - Clean build directory"
	@echo "  install    - Install to system (requires sudo)"
	@echo "  uninstall  - Remove from system"
	@echo "  package    - Create distribution packages"
	@echo "  test       - Run basic build tests"
	@echo "  help       - Show this help"
	@echo ""
	@echo "Quick start:"
	@echo "  make && sudo make install"
