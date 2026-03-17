#!/bin/bash
set -e

# Forge Engine Uninstallation Script for Ubuntu and CentOS

echo "Uninstalling Forge Engine..."

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
   SUDO_CMD=""
else
   SUDO_CMD="sudo"
fi

# Stop and disable services
echo "Stopping services..."
${SUDO_CMD} systemctl stop forge-engine.service || true
${SUDO_CMD} systemctl stop forge-export.service || true
${SUDO_CMD} systemctl disable forge-engine.service || true
${SUDO_CMD} systemctl disable forge-export.service || true

# Remove systemd service files
echo "Removing systemd services..."
${SUDO_CMD} rm -f /etc/systemd/system/forge-engine.service
${SUDO_CMD} rm -f /etc/systemd/system/forge-export.service
${SUDO_CMD} systemctl daemon-reload

# Remove binaries
echo "Removing binaries..."
${SUDO_CMD} rm -f /usr/local/bin/forge
${SUDO_CMD} rm -f /usr/local/bin/export-server
${SUDO_CMD} rm -f /usr/local/bin/demo

# Remove configuration (ask user)
read -p "Remove configuration files? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${SUDO_CMD} rm -rf /etc/forge
    ${SUDO_CMD} rm -rf /usr/local/etc/forge
fi

# Remove logs (ask user)
read -p "Remove log files? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${SUDO_CMD} rm -rf /var/log/forge
fi

# Remove user (ask user)
read -p "Remove forge user? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${SUDO_CMD} userdel forge || true
fi

# Optional: Remove development dependencies
read -p "Remove development dependencies (cmake, build tools)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    case $OS in
        ubuntu|debian)
            echo "Note: Use 'apt autoremove' to clean up unused packages"
            ;;
        centos|rhel|rocky|almalinux)
            echo "Note: Development tools will remain installed"
            ;;
    esac
fi

echo "Uninstallation completed!"
