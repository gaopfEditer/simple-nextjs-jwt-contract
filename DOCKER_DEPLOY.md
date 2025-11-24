# Docker 部署指南

本文档说明如何使用 Docker 和 Docker Compose 部署 Next.js JWT 应用。

## 📋 前置要求

- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用磁盘空间

## 🚀 快速开始

### 1. 准备环境变量

复制环境变量示例文件并修改：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置你的配置：

```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=nextjs_user
DB_PASSWORD=your_secure_password
DB_NAME=nextjs_jwt
JWT_SECRET=your-very-secure-secret-key-min-32-characters
JWT_EXPIRES_IN=7d
```

### 2. 构建并启动服务

```bash
# 构建镜像并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 3. 访问应用

- **应用**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080
  - 用户名: `root`
  - 密码: `root_password` (在 docker-compose.yml 中配置)

## 📦 服务说明

### 应用服务 (app)

- **端口**: 3000
- **镜像**: 基于 Dockerfile 构建
- **健康检查**: 自动检查 `/api/auth/me` 端点

### MySQL 服务 (mysql)

- **端口**: 3306
- **镜像**: mysql:8.0
- **数据持久化**: 使用 Docker volume `mysql_data`
- **初始化**: 自动执行 `database/schema.sql` 创建表结构

### phpMyAdmin 服务 (phpmyadmin)

- **端口**: 8080
- **用途**: 数据库管理界面（可选）

## 🔧 常用命令

### 构建镜像

```bash
# 构建所有服务
docker-compose build

# 仅构建应用服务
docker-compose build app

# 强制重新构建（不使用缓存）
docker-compose build --no-cache app
```

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器、卷（⚠️ 会删除数据库数据）
docker-compose down -v
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app
docker-compose logs -f mysql

# 查看最近 100 行日志
docker-compose logs --tail=100 app
```

### 进入容器

```bash
# 进入应用容器
docker-compose exec app sh

# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -proot_password

# 执行数据库命令
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart app
```

## 🔄 更新应用

### 方法 1: 重新构建（推荐用于开发）

```bash
# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 方法 2: 仅重启（代码已更新到镜像）

```bash
docker-compose restart app
```

## 🗄️ 数据库管理

### 备份数据库

```bash
# 导出数据库
docker-compose exec mysql mysqldump -u root -proot_password nextjs_jwt > backup.sql

# 或者使用 docker exec
docker exec nextjs-jwt-mysql mysqldump -u root -proot_password nextjs_jwt > backup.sql
```

### 恢复数据库

```bash
# 恢复数据库
docker-compose exec -T mysql mysql -u root -proot_password nextjs_jwt < backup.sql
```

### 查看数据库

```bash
# 使用命令行
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt

# 或使用 phpMyAdmin
# 访问 http://localhost:8080
```

## 🔒 生产环境配置

### 1. 修改默认密码

编辑 `docker-compose.yml`，修改以下环境变量：

```yaml
mysql:
  environment:
    - MYSQL_ROOT_PASSWORD=your_secure_root_password
    - MYSQL_PASSWORD=your_secure_user_password
```

### 2. 设置强 JWT Secret

在 `.env` 文件中设置强密码：

```env
JWT_SECRET=your-very-long-and-secure-secret-key-at-least-32-characters
```

### 3. 使用外部数据库（可选）

如果使用外部数据库，修改 `docker-compose.yml`：

```yaml
app:
  environment:
    - DB_HOST=your-external-db-host
    - DB_PORT=3306
    - DB_USER=your_db_user
    - DB_PASSWORD=your_db_password
    - DB_NAME=your_db_name
  # 移除 depends_on mysql
```

### 4. 配置反向代理（Nginx）

创建 `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. 启用 HTTPS

使用 Let's Encrypt 或配置 SSL 证书。

## 🐛 故障排查

### 应用无法启动

```bash
# 查看应用日志
docker-compose logs app

# 检查应用健康状态
docker-compose ps
```

### 数据库连接失败

```bash
# 检查 MySQL 是否运行
docker-compose ps mysql

# 查看 MySQL 日志
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password -e "SELECT 1"
```

### 端口冲突

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
app:
  ports:
    - "3001:3000"  # 改为其他端口

mysql:
  ports:
    - "3307:3306"  # 改为其他端口
```

### 清理和重置

```bash
# 停止并删除所有容器、网络
docker-compose down

# 删除所有容器、网络和卷（⚠️ 会删除数据库数据）
docker-compose down -v

# 删除镜像
docker rmi nextjs-jwt-app

# 清理未使用的资源
docker system prune -a
```

## 📊 监控和性能

### 查看资源使用

```bash
# 查看容器资源使用
docker stats

# 查看特定容器
docker stats nextjs-jwt-app
```

### 健康检查

```bash
# 检查服务健康状态
docker-compose ps

# 手动检查应用健康
curl http://localhost:3000/api/auth/me
```

## 🔐 安全建议

1. **更改默认密码**: 修改所有默认密码
2. **使用环境变量**: 不要在代码中硬编码敏感信息
3. **限制网络访问**: 使用防火墙限制数据库端口访问
4. **定期更新**: 保持 Docker 镜像和依赖更新
5. **备份数据**: 定期备份数据库
6. **使用 HTTPS**: 在生产环境启用 HTTPS

## 📝 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | `mysql` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USER` | 数据库用户名 | `nextjs_user` |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | `nextjs_jwt` |
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d` |
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 应用端口 | `3000` |

## 🚢 部署到云平台

### Docker Hub

```bash
# 构建并标记镜像
docker build -t your-username/nextjs-jwt:latest .

# 推送到 Docker Hub
docker push your-username/nextjs-jwt:latest
```

### 阿里云容器服务

```bash
# 登录阿里云容器镜像服务
docker login --username=your-username registry.cn-hangzhou.aliyuncs.com

# 构建并标记
docker build -t registry.cn-hangzhou.aliyuncs.com/your-namespace/nextjs-jwt:latest .

# 推送
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/nextjs-jwt:latest
```

## 📚 更多资源

- [Next.js Docker 部署文档](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [MySQL Docker 镜像](https://hub.docker.com/_/mysql)

