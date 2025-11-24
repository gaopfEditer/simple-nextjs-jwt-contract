# 🔧 Docker 网络问题解决方案

## 问题描述

运行 `docker-compose up -d` 时出现错误：
```
Error response from daemon: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
```

这是 Docker Hub 连接超时的问题，常见于国内服务器。

## 🚀 解决方案

### 方案 1: 配置 Docker 镜像加速器（推荐）

#### 方法 A: 使用自动配置脚本

```bash
# 给脚本添加执行权限
chmod +x fix-docker-mirror.sh

# 运行脚本（需要 root 权限）
sudo bash fix-docker-mirror.sh
```

#### 方法 B: 手动配置

1. 编辑 Docker 配置文件：

```bash
sudo nano /etc/docker/daemon.json
```

2. 添加以下内容（如果文件已存在，添加 `registry-mirrors` 字段）：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

3. 重启 Docker 服务：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

4. 验证配置：

```bash
docker info | grep -A 10 "Registry Mirrors"
```

5. 重新运行：

```bash
docker-compose up -d
```

### 方案 2: 临时禁用 phpMyAdmin（快速解决）

phpMyAdmin 是可选的，如果不需要可以暂时禁用：

```bash
# 使用不包含 phpMyAdmin 的配置
docker-compose -f docker-compose.without-phpmyadmin.yml up -d
```

或者编辑 `docker-compose.yml`，注释掉 phpMyAdmin 服务：

```yaml
#  # (可选) phpMyAdmin - 数据库管理工具
#  phpmyadmin:
#    image: phpmyadmin/phpmyadmin
#    ...
```

### 方案 3: 使用国内镜像源

修改 `docker-compose.yml`，将 phpMyAdmin 镜像改为国内镜像：

```yaml
phpmyadmin:
  # 使用阿里云镜像
  image: registry.cn-hangzhou.aliyuncs.com/acs/phpmyadmin:latest
  # 或者使用其他国内镜像
  # image: dockerhub.azk8s.cn/library/phpmyadmin:latest
```

### 方案 4: 手动拉取镜像

如果镜像加速器配置后仍然失败，可以手动拉取：

```bash
# 配置镜像加速器后
docker pull phpmyadmin/phpmyadmin

# 或者使用国内镜像
docker pull registry.cn-hangzhou.aliyuncs.com/acs/phpmyadmin:latest
```

## 📋 常用镜像加速器地址

### 国内镜像源

- **中科大镜像**: `https://docker.mirrors.ustc.edu.cn`
- **网易镜像**: `https://hub-mirror.c.163.com`
- **百度云镜像**: `https://mirror.baidubce.com`
- **阿里云镜像**: `https://<your-id>.mirror.aliyuncs.com` (需要登录阿里云获取)

### 阿里云镜像加速器（推荐）

1. 登录阿里云控制台
2. 进入 **容器镜像服务** → **镜像加速器**
3. 复制你的专属加速地址
4. 添加到 `/etc/docker/daemon.json`

## 🔍 验证和测试

### 检查 Docker 配置

```bash
# 查看 Docker 信息
docker info

# 查看镜像加速器配置
cat /etc/docker/daemon.json
```

### 测试镜像拉取

```bash
# 测试拉取镜像
docker pull hello-world

# 如果成功，说明镜像加速器配置正确
```

### 重新部署

```bash
# 清理之前的错误
docker-compose down

# 重新启动
docker-compose up -d
```

## 🆘 其他网络问题

### 问题 1: 仍然无法连接

```bash
# 检查网络连接
ping docker.mirrors.ustc.edu.cn

# 检查 DNS
nslookup docker.mirrors.ustc.edu.cn

# 检查防火墙
sudo firewall-cmd --list-all
```

### 问题 2: 部分镜像仍然失败

可以尝试：
1. 使用多个镜像加速器（配置多个地址）
2. 使用代理服务器
3. 手动下载镜像并导入

### 问题 3: 代理配置

如果服务器使用代理：

```bash
# 创建 Docker 服务配置目录
sudo mkdir -p /etc/systemd/system/docker.service.d

# 创建代理配置文件
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf
```

添加内容：
```ini
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"
```

重启 Docker：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## ✅ 推荐流程

1. **首先尝试方案 1**（配置镜像加速器）- 最彻底的解决方案
2. **如果急需启动**，使用方案 2（禁用 phpMyAdmin）- 快速解决
3. **验证服务**：`docker-compose ps` 和 `docker-compose logs -f`

## 📝 注意事项

- 配置镜像加速器后需要重启 Docker 服务
- 某些镜像可能在某些加速器上不可用，可以配置多个加速器
- phpMyAdmin 不是必需的，可以稍后单独安装
- 生产环境建议使用私有镜像仓库

## 🔗 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [阿里云容器镜像服务](https://cr.console.aliyun.com/)
- [中科大镜像站](https://mirrors.ustc.edu.cn/)

