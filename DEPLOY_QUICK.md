# ⚡ 快速部署指南

## 🚀 一键部署（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x deploy.sh

# 2. 运行部署脚本
./deploy.sh
```

## 📝 手动部署步骤

### 1. 进入项目目录

```bash
cd /path/to/your/project
```

### 2. 构建镜像

```bash
docker-compose build
```

### 3. 启动服务

```bash
docker-compose up -d
```

### 4. 查看日志

```bash
docker-compose logs -f
```

### 5. 检查状态

```bash
docker-compose ps
```

## ✅ 验证部署

```bash
# 检查应用是否运行
curl http://localhost:3000

# 或者访问浏览器
# http://your-server-ip:3000
```

## 🔧 常用命令

```bash
# 查看日志
docker-compose logs -f app

# 重启服务
docker-compose restart

# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 更新应用（重新构建）
docker-compose up -d --build
```

## 🆘 遇到问题？

1. **查看日志**: `docker-compose logs -f`
2. **检查状态**: `docker-compose ps`
3. **重启服务**: `docker-compose restart`
4. **查看详细文档**: `SERVER_DEPLOY.md`

## 📦 完整部署流程

```bash
# 1. 检查 Docker
docker --version
docker-compose --version

# 2. 进入项目目录
cd /path/to/project

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# http://localhost:3000
```

## 🔐 首次部署后

1. **修改默认密码**: 编辑 `docker-compose.yml` 中的密码
2. **设置 JWT_SECRET**: 使用强密码（至少 32 个字符）
3. **配置防火墙**: 开放必要端口
4. **设置备份**: 配置数据库自动备份

更多详细信息请查看 [SERVER_DEPLOY.md](./SERVER_DEPLOY.md)

