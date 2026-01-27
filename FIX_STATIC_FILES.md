# 修复静态文件 404 问题 - 完整指南

## 🔍 问题诊断

首先运行测试脚本确认问题位置：

```bash
# 测试特定文件
chmod +x test-specific-file.sh
./test-specific-file.sh /_next/static/css/0dc348ae691a14b9.css

# 或测试所有静态文件
chmod +x test-backend-static.sh
./test-backend-static.sh
```

## 📋 可能的原因和解决方案

### 情况 1: 后端可以访问，但 Nginx 不行

**症状**：直接访问 `http://localhost:3000/_next/static/...` 返回 200，但通过 Nginx 访问返回 404

**解决方案**：

1. **检查 Nginx 配置中的 `proxy_pass` 是否正确**：
   ```nginx
   location ^~ /_next/static/ {
       proxy_pass http://nextjs_backend;  # 注意：不要加斜杠
       # ...
   }
   ```

2. **确保 `upstream` 配置正确**：
   ```nginx
   upstream nextjs_backend {
       server 127.0.0.1:3000;
       keepalive 64;
   }
   ```

3. **检查是否有其他 location 块干扰**：
   - 确保 `/_next/static/` 使用 `^~` 前缀
   - 确保没有其他正则 location 优先匹配

4. **检查 Nginx 错误日志**：
   ```bash
   tail -f /www/wwwlogs/bz.a.gaopf.top.error.log
   ```

### 情况 2: 后端也无法访问静态文件

**症状**：直接访问 `http://localhost:3000/_next/static/...` 也返回 404

**可能原因**：

#### 原因 A: Next.js standalone 模式问题

如果使用 `standalone` 模式，需要确保静态文件被正确复制。

**检查**：
```bash
# 检查 standalone 目录
ls -la .next/standalone/.next/static/

# 检查当前目录的 .next/static
ls -la .next/static/
```

**解决方案 1: 禁用 standalone 模式（推荐用于 PM2 部署）**

修改 `next.config.js`：
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 standalone 模式（PM2 部署不需要）
  // ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig
```

然后重新构建：
```bash
pnpm build
# 或
npm run build
```

**解决方案 2: 保持 standalone 模式但确保静态文件正确**

如果必须使用 standalone 模式，确保：
1. `.next/static` 目录存在
2. 运行目录包含 `.next/static`

检查 `server.js` 的工作目录：
```bash
# 查看 PM2 运行目录
pm2 show nextjs-jwt-app | grep "exec cwd"
```

#### 原因 B: 构建不完整

**检查**：
```bash
# 检查 .next 目录
ls -la .next/

# 检查静态文件
find .next/static -name "*.css" | head -5
find .next/static -name "*.js" | head -5
```

**解决方案**：
```bash
# 清理并重新构建
rm -rf .next
pnpm build
# 或
npm run build
```

#### 原因 C: 工作目录不正确

**检查**：
```bash
# 查看 PM2 的工作目录
pm2 show nextjs-jwt-app

# 检查当前目录
pwd
```

**解决方案**：
确保 PM2 在项目根目录运行：
```bash
cd /path/to/your/project
pm2 restart nextjs-jwt-app
```

### 情况 3: 路径不匹配

**症状**：文件存在但路径不对

**检查**：
```bash
# 查看页面源码中的实际路径
curl -s http://localhost:3000 | grep -oP 'href="[^"]*\.css[^"]*"'

# 检查文件系统中的实际路径
find .next -name "0dc348ae691a14b9.css"
```

## 🔧 完整修复步骤

### 步骤 1: 禁用 standalone 模式（推荐）

```bash
# 1. 编辑 next.config.js
# 注释掉 standalone 配置

# 2. 重新构建
pnpm build

# 3. 重启 PM2
pm2 restart nextjs-jwt-app
```

### 步骤 2: 更新 Nginx 配置

使用最新的 `nginx-baota.conf`，确保：
- 使用 `^~` 前缀
- 正确的 `proxy_pass` 配置
- 包含所有必要的代理头

### 步骤 3: 测试

```bash
# 测试后端
curl -I http://localhost:3000/_next/static/css/0dc348ae691a14b9.css

# 测试 Nginx
curl -I -H "Host: bz.a.gaopf.top" https://bz.a.gaopf.top/_next/static/css/0dc348ae691a14b9.css
```

## 🎯 快速修复（如果使用 standalone 模式）

如果必须使用 standalone 模式，可以尝试以下方法：

### 方法 1: 修改 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 只在 Docker 等容器环境使用 standalone
  // 对于 PM2 直接部署，不使用 standalone
  output: process.env.USE_STANDALONE === 'true' ? 'standalone' : undefined,
}

module.exports = nextConfig
```

然后构建时：
```bash
# 不使用 standalone
NODE_ENV=production pnpm build
```

### 方法 2: 确保静态文件在正确位置

如果使用 standalone 模式，Next.js 会将静态文件放在 `.next/standalone/.next/static`，但运行时需要 `.next/static`。

可以创建符号链接或复制文件：
```bash
# 在项目根目录
ln -s .next/standalone/.next/static .next/static
# 或
cp -r .next/standalone/.next/static .next/static
```

## 📝 检查清单

- [ ] PM2 服务正在运行
- [ ] 后端服务监听在 3000 端口
- [ ] `.next/static` 目录存在且有文件
- [ ] 直接访问 `http://localhost:3000/_next/static/...` 返回 200
- [ ] Nginx 配置使用 `^~ /_next/static/`
- [ ] Nginx 配置中 `upstream nextjs_backend` 正确
- [ ] Nginx 配置中没有冲突的 `root` 设置
- [ ] Nginx 配置语法正确（`nginx -t` 通过）
- [ ] Nginx 已重载配置

## 🐛 调试技巧

1. **查看完整请求头**：
   ```bash
   curl -v https://bz.a.gaopf.top/_next/static/css/0dc348ae691a14b9.css
   ```

2. **查看 Nginx 访问日志**：
   ```bash
   tail -f /www/wwwlogs/bz.a.gaopf.top.log | grep "_next/static"
   ```

3. **查看 PM2 日志**：
   ```bash
   pm2 logs nextjs-jwt-app --lines 100
   ```

4. **检查浏览器网络面板**：
   - 打开开发者工具 (F12)
   - 查看 Network 标签
   - 检查失败的请求的完整信息

## 💡 推荐配置

对于 PM2 + Nginx 部署，**推荐禁用 standalone 模式**：

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PM2 部署不需要 standalone 模式
  // standalone 模式主要用于 Docker 等容器环境
}

module.exports = nextConfig
```

这样可以避免静态文件路径问题，并且更简单直接。

