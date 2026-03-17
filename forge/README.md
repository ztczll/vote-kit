# Forge Engine

AI-powered application generator with CMake build system support.

## Quick Installation (Ubuntu)

```bash
# Clone the repository
git clone <repository-url>
cd forge

# Run the installation script
./install.sh
```

## Manual Build with CMake

### Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- CMake 3.16+
- Go 1.24+
- vote-kit Redis service (external dependency)

### Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y cmake build-essential golang-go
```

**Note**: Redis is provided by the parent vote-kit project.

### Build

```bash
# Create build directory
mkdir build && cd build

# Configure
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
make -j$(nproc)

# Install (optional)
sudo make install
```

### Custom Installation Paths

```bash
cmake .. \
  -DCMAKE_INSTALL_PREFIX=/opt/forge \
  -DINSTALL_LOGDIR=/opt/forge/logs \
  -DINSTALL_CONFIGDIR=/opt/forge/etc
```

## Package Creation

### DEB Package

```bash
cd build
make package
# Creates forge-engine-1.0.0-Linux.deb
```

### Install DEB Package

```bash
sudo dpkg -i forge-engine-1.0.0-Linux.deb
sudo apt-get install -f  # Fix dependencies if needed
```

## Service Management

### Start Services

```bash
sudo systemctl start forge-engine
sudo systemctl start forge-export
```

### Enable Auto-start

```bash
sudo systemctl enable forge-engine
sudo systemctl enable forge-export
```

### Check Status

```bash
sudo systemctl status forge-engine
sudo systemctl status forge-export
```

### View Logs

```bash
# Service logs
sudo journalctl -u forge-engine -f
sudo journalctl -u forge-export -f

# Application logs
sudo tail -f /var/log/forge/forge-engine/forge-engine.log
sudo tail -f /var/log/forge/forge-export/forge-export.log
```

## Configuration

Edit `/etc/forge/config.yaml` to customize settings:

- Redis connection
- Server ports
- Worker pool size
- Logging levels
- AI service configuration

When using the **Kiro** AI engine, code generation runs `kiro-cli chat --no-interactive --trust-all-tools` with the prompt on stdin, so the CLI exits after the first response and does not block. Configure `ai.kiro.binary_path` to point to your Kiro CLI binary.

## Uninstallation

```bash
./uninstall.sh
```

## Development

### Build Only (without install)

```bash
mkdir build && cd build
cmake ..
make
```

### Run from Build Directory

```bash
cd build
./forge &
./export-server &
```

## Troubleshooting

### Check Redis Connection

```bash
redis-cli ping
```

### Check Port Usage

```bash
sudo netstat -tlnp | grep :8080
sudo netstat -tlnp | grep :8081
```

### Reset Services

```bash
sudo systemctl restart forge-engine
sudo systemctl restart forge-export
```
