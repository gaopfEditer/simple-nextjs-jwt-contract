# 修复 IPv6/IPv4 导致的 502 错误

## 问题现象

- ❌ **不加 IPv6 配置**：直接访问 `https://bz.a.gaopf.top` 就 502
- ⚠️ **加上 IPv6 配置**：能访问首页，但跳转到 `/login` 后又 502

## 问题原因

服务只监听在 IPv6 的 `::1:3123`，而 Nginx 默认尝试 IPv4 连接。

## 解决方案

### 方案 1：确保服务同时监听 IPv4 和 IPv6（推荐）

让服务监听在 `0.0.0.0`，这样会同时监听 IPv4 和 IPv6。

#### 步骤 1：检查当前监听状态

```bash
# 查看服务监听情况
netstat -tlnp | grep 3123
# 或
ss -tlnp | grep 3123
```

**期望结果**：
```
tcp  0  0  0.0.0.0:3123  0.0.0.0:*  LISTEN  xxxxx/node
tcp6 0  0  :::3123      :::*       LISTEN  xxxxx/node
```

如果只看到 `::1:3123`，说明只监听在 IPv6。

#### 步骤 2：检查 PM2 环境变量

```bash
# 查看当前环境变量
pm2 env nextjs-jwt-app | grep HOSTNAME

# 应该显示：HOSTNAME=0.0.0.0
# 如果显示 HOSTNAME=localhost 或其他值，需要修复
```

#### 步骤 3：重启 PM2 服务（使用生产环境）

```bash
# 停止服务
pm2 stop nextjs-jwt-app

# 删除服务（清除旧配置）
pm2 delete nextjs-jwt-app

# 使用生产环境配置重新启动
pm2 start ecosystem.config.js --env production

# 检查状态
pm2 status

# 查看启动日志，确认监听地址
pm2 logs nextjs-jwt-app --lines 20
```

**期望日志**：
```
> ✅ 服务器已启动: http://0.0.0.0:3123
```

#### 步骤 4：验证监听地址

```bash
# 应该看到同时监听 IPv4 和 IPv6
netstat -tlnp | grep 3123

# 期望输出：
# tcp  0  0  0.0.0.0:3123  0.0.0.0:*  LISTEN  xxxxx/node
# tcp6 0  0  :::3123      :::*       LISTEN  xxxxx/node
```

#### 步骤 5：测试连接

```bash
# 测试 IPv4 连接
curl http://127.0.0.1:3123/login

# 测试 IPv6 连接
curl http://[::1]:3123/login

# 都应该返回 HTML 内容
```

### 方案 2：优化 Nginx 配置（临时方案）

如果服务确实只能监听在 IPv6，使用以下 Nginx 配置：

```nginx
upstream nextjs_backend {
    # 优先使用 IPv4，如果失败则尝试 IPv6
    server 127.0.0.1:3123 max_fails=3 fail_timeout=30s;
    server [::1]:3123 backup;
    
    # 保持连接
    keepalive 64;
}
```

**注意**：这个方案不是最优的，因为：
- 如果 IPv4 连接失败，会尝试 IPv6，但可能有延迟
- 某些请求可能仍然失败

## 排查步骤

### 1. 检查服务是否正常运行

```bash
# PM2 状态
pm2 status

# 应该显示：online
```

### 2. 检查端口监听

```bash
netstat -tlnp | grep 3123
```

### 3. 检查 PM2 日志

```bash
# 查看错误日志
pm2 logs nextjs-jwt-app --err --lines 50

# 查看所有日志
pm2 logs nextjs-jwt-app --lines 50
```

### 4. 检查 Nginx 错误日志

```bash
# 实时查看错误日志
tail -f /www/wwwlogs/bz.a.gaopf.top.error.log

# 访问网站，查看具体错误信息
```

### 5. 测试后端服务

```bash
# 直接访问后端（应该能正常返回）
curl http://127.0.0.1:3123
curl http://127.0.0.1:3123/login
curl http://[::1]:3123
curl http://[::1]:3123/login
```

## 常见问题

### Q1: 为什么配置了 `HOSTNAME: '0.0.0.0'` 还是只监听 IPv6？

**可能原因**：
1. PM2 没有使用 `--env production` 启动
2. 环境变量被 `.env.local` 覆盖
3. Next.js 的 hostname 参数处理问题

**解决**：
```bash
# 检查实际使用的环境变量
pm2 env nextjs-jwt-app

# 如果 HOSTNAME 不是 0.0.0.0，检查 .env.local 文件
cat .env.local | grep HOSTNAME

# 确保 .env.local 中不覆盖 HOSTNAME，或设置为 0.0.0.0
```

### Q2: 为什么首页能访问，但 login 页面 502？

**可能原因**：
1. Next.js SSR 渲染时出错
2. 数据库连接问题
3. 某些 API 调用失败

**排查**：
```bash
# 查看 PM2 日志，看是否有错误
pm2 logs nextjs-jwt-app --err

# 检查数据库连接
# 查看日志中是否有数据库相关错误
pm2 logs nextjs-jwt-app | grep -i "database\|mysql\|connection"
```

### Q3: 如何确保服务始终监听在 0.0.0.0？

**方法 1**：在 `server.js` 中硬编码（不推荐）

**方法 2**：确保环境变量正确（推荐）
```bash
# 在 .env.local 中设置
HOSTNAME=0.0.0.0
PORT=3123

# 或在 ecosystem.config.js 中设置
env_production: {
  HOSTNAME: '0.0.0.0',
  PORT: 3123,
}
```

**方法 3**：修改 `server.js` 默认值
```javascript
const hostname = process.env.HOSTNAME || '0.0.0.0';
```

## 验证修复

完成修复后，验证：

1. ✅ 服务监听在 `0.0.0.0:3123`（同时支持 IPv4 和 IPv6）
2. ✅ 首页能正常访问
3. ✅ `/login` 页面能正常访问（不再 502）
4. ✅ 静态资源正常加载
5. ✅ API 请求正常

## 快速修复命令

```bash
# 1. 停止并删除旧服务
pm2 stop nextjs-jwt-app
pm2 delete nextjs-jwt-app

# 2. 使用生产环境重新启动
pm2 start ecosystem.config.js --env production

# 3. 检查监听地址
netstat -tlnp | grep 3123

# 4. 测试连接
curl http://127.0.0.1:3123/login
curl http://[::1]:3123/login

# 5. 重载 Nginx
nginx -t && nginx -s reload
```

