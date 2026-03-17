# Forge Engine 多系统安装指南

## 🎯 支持的操作系统

现在 `install.sh` 和 `uninstall.sh` 脚本支持以下操作系统：

### Ubuntu/Debian 系列
- Ubuntu 18.04+
- Ubuntu 20.04+  
- Ubuntu 22.04+
- Debian 10+

### CentOS/RHEL 系列
- CentOS 7+
- CentOS 8+
- RHEL 7+
- RHEL 8+
- Rocky Linux 8+
- AlmaLinux 8+

## 📦 依赖包对照表

| 系统类型 | 包管理器 | 依赖包 |
|---------|---------|--------|
| Ubuntu/Debian | apt-get | cmake, build-essential, golang-go |
| CentOS/RHEL | yum/dnf | cmake, golang, Development Tools |

## 🚀 安装步骤

### 1. 检查系统兼容性
```bash
cd /root/code/vote-kit/forge
./install.sh --check  # 可选：检查系统信息
```

### 2. 运行安装脚本
```bash
# 使用sudo权限安装
./install.sh

# 或者以root用户安装
sudo ./install.sh
```

### 3. 验证安装
```bash
# 检查服务状态
sudo systemctl status forge-engine
sudo systemctl status forge-export

# 检查二进制文件
which forge
which export-server
```

## 🗑️ 卸载步骤

```bash
# 运行卸载脚本
./uninstall.sh

# 脚本会询问是否删除：
# - 配置文件
# - 日志文件  
# - forge用户
# - 开发依赖包
```

## 🔧 系统特定说明

### Ubuntu/Debian
- 使用 `apt-get` 安装依赖
- 自动更新包索引
- 支持所有LTS版本

### CentOS/RHEL
- 自动启用 EPEL 仓库
- 使用 `dnf`（CentOS 8+）或 `yum`（CentOS 7）
- 安装 "Development Tools" 组

## 🚨 注意事项

1. **权限要求**: 需要sudo权限或root用户
2. **网络连接**: 需要互联网连接下载依赖包
3. **磁盘空间**: 至少需要500MB可用空间
4. **Redis依赖**: Forge服务需要vote-kit的Redis运行

## 🐛 故障排除

### 依赖安装失败
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -f

# CentOS/RHEL  
sudo yum clean all
sudo yum update
```

### 服务启动失败
```bash
# 查看日志
sudo journalctl -u forge-engine -f
sudo journalctl -u forge-export -f

# 检查配置
sudo cat /usr/local/etc/forge/config.yaml
```

### 权限问题
```bash
# 重新设置权限
sudo chown -R forge:forge /var/log/forge
sudo chmod -R 755 /var/log/forge
```

## ✅ 测试安装

安装完成后，可以运行以下命令测试：

```bash
# 检查版本
forge --version

# 测试配置
forge --config-test

# 启动服务
sudo systemctl start forge-engine
sudo systemctl start forge-export
```

现在你的Forge Engine安装脚本已经支持Ubuntu和CentOS系统了！🎉
