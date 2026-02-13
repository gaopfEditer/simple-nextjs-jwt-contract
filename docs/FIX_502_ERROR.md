# 修复 502 错误 - 登录页面跳转问题

## 问题描述

- ✅ 入口页面（首页）能正常加载
- ❌ 跳转到 `/login` 页面时报 502 错误

## 可能原因

1. **服务监听地址问题**：服务只监听在 IPv6 (`::1`)，而 Nginx 使用 IPv4 (`127.0.0.1`) 连接
2. **PM2 环境变量未生效**：没有使用 `--env production` 启动
3. **Next.js SSR 渲染错误**：服务端渲染时出错

## 解决步骤

### 第一步：检查当前服务状态

```bash
# 1. 检查 PM2 服务状态
pm2 status

# 2. 检查端口监听情况（关键！）
netstat -tlnp | grep 3123
# 或
ss -tlnp | grep 3123
```

**期望结果**：
- 应该看到 `0.0.0.0:3123` 或 `127.0.0.1:3123`（IPv4）
- 如果只看到 `::1:3123`（IPv6），说明服务没有正确监听 IPv4

### 第二步：检查 PM2 环境变量

```bash
# 查看当前 PM2 进程的环境变量
pm2 env nextjs-jwt-app

# 检查 HOSTNAME 和 PORT
# 应该看到：
# HOSTNAME=0.0.0.0
# PORT=3123
```

### 第三步：重启 PM2 服务（使用正确的环境）

```bash
# 1. 停止当前服务
pm2 stop nextjs-jwt-app

# 2. 删除服务（清除旧配置）
pm2 delete nextjs-jwt-app

# 3. 使用生产环境配置重新启动
pm2 start ecosystem.config.js --env production

# 4. 检查状态
pm2 status
pm2 logs nextjs-jwt-app --lines 20
```

### 第四步：验证服务监听地址

```bash
# 应该看到监听在 0.0.0.0:3123（IPv4）
netstat -tlnp | grep 3123

# 期望输出：
# tcp  0  0  0.0.0.0:3123  0.0.0.0:*  LISTEN  xxxxx/node
# tcp6 0  0  :::3123      :::*       LISTEN  xxxxx/node
```

### 第五步：测试后端服务

```bash
# 测试 IPv4 连接
curl http://127.0.0.1:3123

# 测试登录页面路由
curl http://127.0.0.1:3123/login

# 应该返回 HTML 内容，而不是连接错误
```

### 第六步：更新 Nginx 配置并重载

1. **在宝塔面板中**：
   - 进入网站设置 → 配置文件
   - 确保 upstream 配置为：`server 127.0.0.1:3123;`（只有 IPv4）
   - 点击"测试配置"
   - 点击"重载配置"

2. **或使用命令行**：
   ```bash
   # 测试配置
   nginx -t
   
   # 重载配置
   nginx -s reload
   ```

### 第七步：检查 Nginx 错误日志

```bash
# 实时查看错误日志
tail -f /www/wwwlogs/bz.a.gaopf.top.error.log

# 访问网站，查看是否有新的错误信息
```

## 如果问题仍然存在

### 检查 Next.js 构建

```bash
# 确保项目已正确构建
cd /www/wwwroot/bz.a.gaopf.top/simple-nextjs-jwt-contract/
pnpm build

# 检查 .next 目录
ls -la .next/
```

### 检查 PM2 日志

```bash
# 查看错误日志
pm2 logs nextjs-jwt-app --err --lines 50

# 查看所有日志
pm2 logs nextjs-jwt-app --lines 50
```

### 检查数据库连接

```bash
# 如果登录页面需要数据库连接，检查数据库是否正常
# 查看 PM2 日志中是否有数据库连接错误
pm2 logs nextjs-jwt-app | grep -i "database\|mysql\|connection"
```

### 临时调试：直接访问后端

```bash
# 在浏览器中直接访问（如果服务器有公网 IP）
http://your-server-ip:3123/login

# 如果直接访问正常，说明是 Nginx 配置问题
# 如果直接访问也 502，说明是后端服务问题
```

## 常见错误和解决方案

### 错误 1：只监听 IPv6

**现象**：`netstat` 只显示 `::1:3123`

**解决**：
```bash
# 确保 ecosystem.config.js 中 HOSTNAME: '0.0.0.0'
# 然后重启 PM2
pm2 restart nextjs-jwt-app --update-env
```

### 错误 2：PM2 使用错误的环境

**现象**：`pm2 env` 显示 `HOSTNAME=localhost` 而不是 `0.0.0.0`

**解决**：
```bash
# 删除并重新启动，明确指定环境
pm2 delete nextjs-jwt-app
pm2 start ecosystem.config.js --env production
```

### 错误 3：Nginx 连接超时

**现象**：Nginx 错误日志显示 `connect() failed (111: Connection refused)`

**解决**：
1. 检查服务是否运行：`pm2 status`
2. 检查端口是否正确：`netstat -tlnp | grep 3123`
3. 检查防火墙：确保本地连接不被阻止

### 错误 4：Next.js SSR 错误

**现象**：PM2 日志显示 Next.js 渲染错误

**解决**：
```bash
# 重新构建项目
pnpm build

# 重启服务
pm2 restart nextjs-jwt-app
```

## 验证修复

完成以上步骤后，验证：

1. ✅ 首页能正常访问
2. ✅ `/login` 页面能正常访问（不再 502）
3. ✅ 静态资源（CSS/JS）正常加载
4. ✅ API 请求正常（如 `/api/auth/login`）

## 快速检查清单

- [ ] PM2 服务正在运行：`pm2 status`
- [ ] 服务监听在 `0.0.0.0:3123`：`netstat -tlnp | grep 3123`
- [ ] 环境变量正确：`pm2 env nextjs-jwt-app` 显示 `HOSTNAME=0.0.0.0`
- [ ] 后端服务响应：`curl http://127.0.0.1:3123/login` 返回 HTML
- [ ] Nginx 配置正确：upstream 指向 `127.0.0.1:3123`
- [ ] Nginx 配置已重载：`nginx -s reload`

