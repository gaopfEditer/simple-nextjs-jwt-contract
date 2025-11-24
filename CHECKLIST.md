# ✅ 服务器部署检查清单

## 📋 部署前检查

### 1. 服务器环境
- [ ] Docker 已安装 (`docker --version`)
- [ ] Docker Compose 已安装 (`docker-compose --version`)
- [ ] 有足够的磁盘空间（至少 2GB）
- [ ] 端口 3000, 3306, 8080 未被占用

### 2. 项目文件
- [ ] `Dockerfile` 存在
- [ ] `docker-compose.yml` 存在
- [ ] `package.json` 存在
- [ ] `database/schema.sql` 存在
- [ ] `next.config.js` 已配置 `output: 'standalone'`

### 3. 配置文件（可选）
- [ ] `.env` 文件已创建（如果需要）
- [ ] 已修改默认密码（生产环境）

## 🚀 部署步骤

### 步骤 1: 进入项目目录
```bash
cd /path/to/your/project
```

### 步骤 2: 构建镜像
```bash
docker-compose build
```

### 步骤 3: 启动服务
```bash
docker-compose up -d
```

### 步骤 4: 验证部署
- [ ] 检查容器状态: `docker-compose ps`
- [ ] 查看日志: `docker-compose logs -f`
- [ ] 访问应用: http://localhost:3000
- [ ] 访问 phpMyAdmin: http://localhost:8080

## 🔍 部署后验证

### 应用检查
- [ ] 应用可以访问
- [ ] 注册功能正常
- [ ] 登录功能正常
- [ ] JWT 认证正常

### 数据库检查
- [ ] MySQL 容器运行正常
- [ ] 数据库表已创建
- [ ] 可以连接数据库

### 日志检查
- [ ] 应用日志无错误
- [ ] 数据库日志无错误

## 🔐 安全配置（生产环境）

- [ ] 已修改 MySQL root 密码
- [ ] 已修改 MySQL 用户密码
- [ ] 已设置强 JWT_SECRET（至少 32 字符）
- [ ] 已配置防火墙规则
- [ ] 已限制数据库端口访问（如需要）
- [ ] 已配置 HTTPS（如需要）

## 📊 监控和维护

- [ ] 已设置日志轮转
- [ ] 已配置数据库备份
- [ ] 已设置监控告警（可选）
- [ ] 已配置自动重启（docker-compose.yml 中已配置）

## 🆘 故障排查

如果遇到问题，按以下顺序检查：

1. [ ] 查看容器状态: `docker-compose ps`
2. [ ] 查看应用日志: `docker-compose logs app`
3. [ ] 查看数据库日志: `docker-compose logs mysql`
4. [ ] 检查端口占用: `netstat -tlnp | grep 3000`
5. [ ] 检查防火墙: `sudo firewall-cmd --list-all`
6. [ ] 重启服务: `docker-compose restart`

## 📝 常用命令速查

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 更新应用
docker-compose up -d --build

# 进入容器
docker-compose exec app sh

# 备份数据库
docker-compose exec mysql mysqldump -u root -proot_password nextjs_jwt > backup.sql
```

## ✅ 完成检查

- [ ] 所有服务正常运行
- [ ] 应用功能测试通过
- [ ] 安全配置已完成
- [ ] 备份策略已设置
- [ ] 文档已阅读并理解

---

**提示**: 完成所有检查项后，你的应用应该可以正常运行了！

如有问题，请查看 [SERVER_DEPLOY.md](./SERVER_DEPLOY.md) 获取详细帮助。

