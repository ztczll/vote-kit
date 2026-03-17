#!/bin/bash
set -e

# Forge Engine Installation Script for Ubuntu and CentOS

echo "Installing Forge Engine..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "Cannot detect OS. Supported: Ubuntu, CentOS"
    exit 1
fi

echo "Detected OS: $OS $VERSION"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "Running as root user..."
   SUDO_CMD=""
else
   echo "Running as regular user with sudo..."
   SUDO_CMD="sudo"
fi

# Install dependencies based on OS
echo "Installing dependencies..."

# Check if golang is already installed
if command -v go >/dev/null 2>&1; then
    echo "Go is already installed: $(go version)"
    GOLANG_INSTALLED=true
else
    echo "Go not found, will install via package manager"
    GOLANG_INSTALLED=false
fi

case $OS in
    ubuntu|debian)
        ${SUDO_CMD} apt-get update
        if [ "$GOLANG_INSTALLED" = false ]; then
            ${SUDO_CMD} apt-get install -y cmake build-essential golang-go
        else
            ${SUDO_CMD} apt-get install -y cmake build-essential
        fi
        ;;
    centos|rhel|rocky|almalinux)
        # Enable EPEL for additional packages
        if command -v dnf >/dev/null 2>&1; then
            ${SUDO_CMD} dnf install -y epel-release
          #  ${SUDO_CMD} dnf groupinstall -y "Development Tools"
            if [ "$GOLANG_INSTALLED" = false ]; then
                ${SUDO_CMD} dnf install -y cmake golang
            else
                ${SUDO_CMD} dnf install -y cmake
            fi
        else
            ${SUDO_CMD} yum install -y epel-release
          #  ${SUDO_CMD} yum groupinstall -y "Development Tools"
            if [ "$GOLANG_INSTALLED" = false ]; then
                ${SUDO_CMD} yum install -y cmake golang
            else
                ${SUDO_CMD} yum install -y cmake
            fi
        fi
        ;;
    *)
        echo "Unsupported OS: $OS"
        echo "Supported: Ubuntu, Debian, CentOS, RHEL, Rocky Linux, AlmaLinux"
        exit 1
        ;;
esac

# Create forge user if it doesn't exist
if ! id "forge" &>/dev/null; then
    echo "Creating forge user..."
    ${SUDO_CMD} useradd -r -s /bin/false -d /var/lib/forge forge
fi

# Create build directory
BUILD_DIR="build"
if [ -d "$BUILD_DIR" ]; then
    rm -rf "$BUILD_DIR"
fi
mkdir "$BUILD_DIR"
cd "$BUILD_DIR"

# Configure with CMake
echo "Configuring build..."
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
echo "Building..."
make -j$(nproc)

# Install
echo "Installing..."
${SUDO_CMD} make install

# Set permissions
echo "Setting up permissions..."
${SUDO_CMD} chown -R forge:forge /var/log/forge
${SUDO_CMD} chmod -R 755 /var/log/forge

# Install and enable systemd services
echo "Installing systemd services..."
${SUDO_CMD} systemctl daemon-reload
${SUDO_CMD} systemctl enable forge-engine.service
${SUDO_CMD} systemctl enable forge-export.service

echo "Installation completed!"
echo ""
echo "Note: This forge service requires vote-kit's Redis to be running."
echo ""
echo "To start the services:"
echo "  ${SUDO_CMD} systemctl start forge-engine"
echo "  ${SUDO_CMD} systemctl start forge-export"
echo ""
echo "To check status:"
echo "  ${SUDO_CMD} systemctl status forge-engine"
echo "  ${SUDO_CMD} systemctl status forge-export"
echo ""
echo "Configuration file: /usr/local/etc/forge/config.yaml"
echo "Log files: /var/log/forge/"
