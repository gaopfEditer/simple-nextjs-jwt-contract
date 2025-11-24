# 🚀 Docker 快速启动指南

## 一键启动

```bash
# 1. 复制环境变量文件
cp env.example .env

# 2. 编辑 .env 文件（可选，docker-compose.yml 中已有默认值）
# 修改 JWT_SECRET 等配置

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

## 使用 Makefile（推荐）

```bash
# 查看所有可用命令
make help

# 构建并启动
make build
make up

# 查看日志
make logs-app

# 停止服务
make down
```

## 访问应用

- **应用**: http://localhost:3000
- **phpMyAdmin**: http://localhost:8080
  - 用户名: `root`
  - 密码: `root_password`

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart app

# 进入应用容器
docker-compose exec app sh

# 进入数据库
docker-compose exec mysql mysql -u nextjs_user -pnextjs_password nextjs_jwt
```

## 开发模式

```bash
# 使用开发配置（支持热重载）
docker-compose -f docker-compose.dev.yml up
```

## 故障排查

如果遇到问题：

1. 查看日志: `docker-compose logs -f`
2. 检查服务状态: `docker-compose ps`
3. 重启服务: `docker-compose restart`
4. 清理并重新构建: `docker-compose down -v && docker-compose up -d --build`

更多详细信息请查看 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

