# 🚀 服务器部署指南

本文档说明如何在服务器上构建和运行 Docker 容器。

## 📋 前置检查

### 1. 检查 Docker 是否安装

```bash
# 检查 Docker 版本
docker --version

# 检查 Docker Compose 版本
docker-compose --version
```

如果未安装，请先安装：

```bash
# CentOS/RHEL
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 检查项目文件

确保以下文件已上传到服务器：

```bash
# 进入项目目录
cd /path/to/your/project

# 检查必要文件
ls -la Dockerfile docker-compose.yml package.json
```

## 🔧 部署步骤

### 步骤 1: 准备环境变量（可选）

```bash
# 如果使用外部 .env 文件
cp env.example .env
nano .env  # 编辑环境变量
```

**注意**: 如果使用 `docker-compose.yml` 中已配置的环境变量，可以跳过此步骤。

### 步骤 2: 构建 Docker 镜像

```bash
# 进入项目目录
cd /path/to/your/project

# 构建镜像（这可能需要几分钟）
docker-compose build

# 或者强制重新构建（不使用缓存）
docker-compose build --no-cache
```

### 步骤 3: 启动所有服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看启动日志
docker-compose logs -f
```

### 步骤 4: 检查服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 或者使用 docker 命令
docker ps
```

应该看到三个容器在运行：
- `nextjs-jwt-app` (应用)
- `nextjs-jwt-mysql` (数据库)
- `nextjs-jwt-phpmyadmin` (可选)

### 步骤 5: 验证服务

```bash
# 检查应用是否运行
curl http://localhost:3000

# 或者访问浏览器
# http://your-server-ip:3000
```

## 📊 常用管理命令

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看应用日志
docker-compose logs -f app

# 查看数据库日志
docker-compose logs -f mysql

# 查看最近 100 行日志
docker-compose logs --tail=100 app
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app

# 停止所有服务
docker-compose stop

# 启动已停止的服务
docker-compose start
```

### 更新应用

```bash
# 方法 1: 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d

# 方法 2: 一键更新
docker-compose up -d --build
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入数据库容器
docker-compose exec mysql bash

# 连接数据库
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt
```

## 🔍 故障排查

### 问题 1: 构建失败

```bash
# 查看详细构建日志
docker-compose build --progress=plain

# 检查 Dockerfile 语法
docker build -t test-image .

# 清理构建缓存
docker builder prune -a
```

### 问题 2: 容器无法启动

```bash
# 查看容器日志
docker-compose logs app

# 查看容器状态
docker-compose ps

# 检查端口占用
netstat -tlnp | grep 3000
netstat -tlnp | grep 3306
```

### 问题 3: 数据库连接失败

```bash
# 检查 MySQL 容器是否运行
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u root -proot_password -e "SELECT 1"

# 检查数据库是否初始化
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt -e "SHOW TABLES;"
```

### 问题 4: 应用无法访问

```bash
# 检查应用容器状态
docker-compose ps app

# 查看应用日志
docker-compose logs app

# 检查端口是否监听
netstat -tlnp | grep 3000

# 检查防火墙
sudo firewall-cmd --list-all  # CentOS/RHEL
sudo ufw status                # Ubuntu/Debian
```

### 问题 5: 内存不足

```bash
# 查看容器资源使用
docker stats

# 清理未使用的资源
docker system prune -a

# 清理未使用的卷（⚠️ 会删除未使用的数据卷）
docker volume prune
```

## 🔐 安全配置

### 1. 修改默认密码

编辑 `docker-compose.yml`，修改以下密码：

```yaml
mysql:
  environment:
    - MYSQL_ROOT_PASSWORD=your_secure_root_password
    - MYSQL_PASSWORD=your_secure_user_password

app:
  environment:
    - JWT_SECRET=your-very-secure-secret-key-min-32-characters
```

### 2. 配置防火墙

```bash
# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw allow 3306/tcp
sudo ufw reload
```

### 3. 限制数据库端口访问

如果数据库只供应用使用，可以移除端口映射：

```yaml
mysql:
  # 注释掉这行，数据库只能通过 Docker 网络访问
  # ports:
  #   - "3306:3306"
```

## 📦 数据备份

### 备份数据库

```bash
# 创建备份
docker-compose exec mysql mysqldump -u root -proot_password nextjs_jwt > backup_$(date +%Y%m%d_%H%M%S).sql

# 或者使用 docker 命令
docker exec nextjs-jwt-mysql mysqldump -u root -proot_password nextjs_jwt > backup.sql
```

### 恢复数据库

```bash
# 恢复备份
docker-compose exec -T mysql mysql -u root -proot_password nextjs_jwt < backup.sql
```

## 🚢 生产环境建议

1. **使用环境变量文件**: 创建 `.env` 文件管理敏感信息
2. **配置反向代理**: 使用 Nginx 作为反向代理
3. **启用 HTTPS**: 配置 SSL 证书
4. **设置监控**: 配置日志收集和监控系统
5. **定期备份**: 设置自动备份任务
6. **资源限制**: 在 docker-compose.yml 中设置资源限制

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## 📝 快速参考

```bash
# 一键部署
docker-compose up -d --build

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 完全清理（⚠️ 会删除数据）
docker-compose down -v
```

## 🆘 获取帮助

如果遇到问题：

1. 查看日志: `docker-compose logs -f`
2. 检查状态: `docker-compose ps`
3. 查看文档: `DOCKER_DEPLOY.md`
4. 重启服务: `docker-compose restart`

