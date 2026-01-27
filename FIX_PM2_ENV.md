# PM2 环境变量和配置修复

## 🔴 问题分析

### 问题 1: Standalone 模式警告

```
⚠ "next start" does not work with "output: standalone" configuration. 
Use "node .next/standalone/server.js" instead.
```

**原因**：
- `next.config.js` 在生产环境启用了 `standalone` 模式
- 但 `server.js` 是自定义服务器，不是 standalone 模式
- 两者冲突

**解决**：禁用 standalone 模式（已修复）

### 问题 2: 数据库连接失败

```
[数据库] ❌ 连接失败: connect ECONNREFUSED ::1:3306
```

**原因**：
- `localhost` 在某些系统上解析为 IPv6 地址 `::1`
- MySQL 可能只监听 IPv4 地址 `127.0.0.1`
- 导致连接失败

**解决**：使用 `127.0.0.1` 而不是 `localhost`（已修复）

## ✅ 已修复的配置

### 1. next.config.js

已禁用 standalone 模式：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 standalone 模式（因为使用自定义 server.js）
  // standalone 模式用于 Docker 等容器环境，PM2 部署不需要
}

module.exports = nextConfig
```

### 2. server.js

已修改默认数据库主机为 `127.0.0.1`：

```javascript
const dbConfig = {
  // 使用 127.0.0.1 而不是 localhost，避免 IPv6 连接问题
  host: process.env.DB_HOST || '127.0.0.1',
  // ...
}
```

## 📝 环境变量配置

### PM2 如何读取环境变量

1. **server.js 会自动读取**：
   - 优先读取 `.env.local`
   - 如果不存在，读取 `.env`
   - 代码在 `server.js` 开头已实现

2. **PM2 环境变量优先级**：
   - PM2 的 `env_production` 中的变量会覆盖 `.env` 文件
   - 但 `server.js` 在启动时已经加载了 `.env.local`，所以 `.env.local` 优先级最高

### 创建 .env.local 文件

在项目根目录创建 `.env.local` 文件：

```bash
# 数据库配置（使用 127.0.0.1 避免 IPv6 问题）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=nextjs_jwt

# JWT 配置
JWT_SECRET=your-very-secure-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# Next.js 配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

**重要**：
- 使用 `127.0.0.1` 而不是 `localhost`
- 确保 MySQL 服务正在运行
- 确保数据库用户和密码正确

## 🚀 修复步骤

### 1. 重新构建项目

```bash
# 清理旧的构建
rm -rf .next

# 重新构建（现在不会使用 standalone 模式）
pnpm build
# 或
npm run build
```

### 2. 创建/更新 .env.local

```bash
# 如果不存在，从 env.example 创建
cp env.example .env.local

# 编辑配置
nano .env.local
# 或
vi .env.local
```

**确保配置**：
```env
DB_HOST=127.0.0.1  # 重要：使用 127.0.0.1
DB_PORT=3306
DB_USER=your_actual_user
DB_PASSWORD=your_actual_password
DB_NAME=nextjs_jwt
```

### 3. 检查 MySQL 服务

```bash
# 检查 MySQL 是否运行
systemctl status mysql
# 或
systemctl status mysqld

# 测试连接
mysql -h 127.0.0.1 -u your_user -p -e "SELECT 1;"
```

### 4. 重启 PM2

```bash
# 停止旧进程
pm2 stop nextjs-jwt-app
pm2 delete nextjs-jwt-app

# 启动新进程
pm2 start ecosystem.config.js --env production

# 查看日志
pm2 logs nextjs-jwt-app --lines 50
```

## 🔍 验证

### 检查环境变量

```bash
# 查看 PM2 环境变量
pm2 env nextjs-jwt-app

# 查看进程信息
pm2 show nextjs-jwt-app
```

### 检查数据库连接

查看 PM2 日志，应该看到：

```
[数据库] ✅ 连接池创建成功
```

而不是：

```
[数据库] ❌ 连接失败
```

### 测试应用

```bash
# 测试后端
curl http://localhost:3000

# 应该返回 HTML 而不是错误
```

## 🐛 常见问题

### 问题 1: 仍然连接失败

**检查**：
1. MySQL 服务是否运行：`systemctl status mysql`
2. 数据库用户是否存在：`mysql -u root -p -e "SELECT user, host FROM mysql.user;"`
3. 数据库是否存在：`mysql -u root -p -e "SHOW DATABASES;"`
4. 防火墙是否阻止：`netstat -tlnp | grep 3306`

### 问题 2: 环境变量未加载

**检查**：
1. `.env.local` 文件是否存在：`ls -la .env.local`
2. 文件权限是否正确：`chmod 600 .env.local`
3. PM2 工作目录是否正确：`pm2 show nextjs-jwt-app | grep "exec cwd"`

### 问题 3: Standalone 警告仍然出现

**解决**：
1. 确保已修改 `next.config.js`（禁用 standalone）
2. 清理并重新构建：`rm -rf .next && pnpm build`
3. 重启 PM2：`pm2 restart nextjs-jwt-app`

## 📋 检查清单

- [ ] `next.config.js` 已禁用 standalone 模式
- [ ] `server.js` 默认使用 `127.0.0.1` 而不是 `localhost`
- [ ] `.env.local` 文件存在且配置正确
- [ ] `.env.local` 中 `DB_HOST=127.0.0.1`
- [ ] MySQL 服务正在运行
- [ ] 数据库用户和密码正确
- [ ] 已重新构建项目（`pnpm build`）
- [ ] PM2 已重启
- [ ] PM2 日志显示数据库连接成功

## 💡 最佳实践

1. **使用 .env.local**：不要提交到 Git，包含敏感信息
2. **使用 127.0.0.1**：避免 IPv6 连接问题
3. **禁用 standalone**：PM2 部署不需要 standalone 模式
4. **检查日志**：定期查看 PM2 日志，及时发现问题

