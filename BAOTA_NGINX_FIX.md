# 宝塔面板 Nginx 配置修复指南

## 问题描述

使用宝塔面板配置 Nginx 后，访问网站时页面内容正常，但样式和 JavaScript 资源文件无法正确加载。

**错误示例**：
```
https://bz.a.gaopf.top/_next/static/chunks/framework-74b3d7ec4c6a0d52.js
```

## 问题原因

1. **root 设置冲突**：宝塔面板默认设置了 `root` 目录，导致 Nginx 尝试从文件系统直接提供静态文件，而不是代理到 Next.js 服务器
2. **静态文件路径错误**：Next.js 的静态文件应该由 Next.js 服务器提供，而不是由 Nginx 从文件系统读取

## 解决方案

### 方法 1：使用优化后的配置（推荐）

1. **备份当前配置**
   ```bash
   # 在宝塔面板中，先备份当前站点配置
   # 或者手动备份配置文件
   cp /www/server/panel/vhost/nginx/bz.a.gaopf.top.conf /www/server/panel/vhost/nginx/bz.a.gaopf.top.conf.bak
   ```

2. **使用新的配置文件**
   - 将 `nginx-baota.conf` 文件中的配置复制到宝塔面板的站点配置中
   - 或者直接替换配置文件：
     ```bash
     # 注意：请先备份原配置！
     cp nginx-baota.conf /www/server/panel/vhost/nginx/bz.a.gaopf.top.conf
     ```

3. **关键修改点**：
   - ✅ **删除或注释掉 `root` 设置**（最重要！）
   - ✅ 确保所有 `location` 都正确代理到 `http://nextjs_backend`
   - ✅ 确保 `/_next/static/` 路径也代理到后端
   - ✅ 添加正确的代理头设置

### 方法 2：手动修改现有配置

在宝塔面板的站点配置中，进行以下修改：

#### 1. 删除或注释 root 设置

**找到这一行**：
```nginx
root /www/wwwroot/bz.a.gaopf.top/simple-nextjs-jwt-contract/.next/static;
```

**改为**（注释掉）：
```nginx
# root /www/wwwroot/bz.a.gaopf.top/simple-nextjs-jwt-contract/.next/static;
```

#### 2. 修改 `location /_next/static/` 配置

**确保配置如下**：
```nginx
location /_next/static/ {
    proxy_pass http://nextjs_backend;
    proxy_http_version 1.1;
    
    # WebSocket 支持
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 传递真实 IP 和主机信息
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 缓存设置
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}
```

#### 3. 确保 `location /` 配置正确

```nginx
location / {
    proxy_pass http://nextjs_backend;
    proxy_http_version 1.1;
    
    # WebSocket 支持
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 传递真实 IP 和主机信息
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 缓冲设置
    proxy_buffering off;
    proxy_request_buffering off;
}
```

## 验证步骤

### 1. 测试 Nginx 配置

```bash
# 测试配置文件语法
nginx -t

# 如果测试通过，重载配置
nginx -s reload
# 或者在宝塔面板中点击"重载配置"
```

### 2. 检查 PM2 服务

```bash
# 检查 PM2 服务是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000
```

### 3. 测试访问

```bash
# 测试后端服务（直接访问）
curl http://localhost:3000/_next/static/chunks/framework-*.js

# 测试通过 Nginx 访问
curl https://bz.a.gaopf.top/_next/static/chunks/framework-*.js
```

### 4. 浏览器检查

1. 打开浏览器开发者工具（F12）
2. 访问网站：`https://bz.a.gaopf.top`
3. 查看 Network 标签页
4. 检查静态资源（JS、CSS）是否正常加载
5. 如果 404 或 502，检查请求 URL 和响应头

## 常见问题排查

### 问题 1：静态资源返回 404

**原因**：Nginx 仍然尝试从文件系统读取，而不是代理到后端

**解决**：
- 确认已删除或注释 `root` 设置
- 确认 `location /_next/static/` 使用 `proxy_pass` 而不是 `try_files`

### 问题 2：静态资源返回 502 Bad Gateway

**原因**：后端服务未运行或无法连接

**解决**：
```bash
# 检查 PM2 服务
pm2 status

# 检查后端服务
curl http://localhost:3000

# 检查 Nginx 错误日志
tail -f /www/wwwlogs/bz.a.gaopf.top.error.log
```

### 问题 3：静态资源加载但样式不生效

**原因**：可能是缓存问题或 MIME 类型问题

**解决**：
```bash
# 清除浏览器缓存
# 或在 Nginx 配置中添加 MIME 类型
# 但通常 Next.js 会正确处理
```

### 问题 4：WebSocket 连接失败

**原因**：缺少 WebSocket 代理头

**解决**：确保所有 `location` 块都包含：
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## 完整配置示例

参考 `nginx-baota.conf` 文件，这是针对宝塔面板优化的完整配置。

## 注意事项

1. **不要设置 root**：Next.js 应用的所有请求都应该代理到后端
2. **保持 upstream 配置**：确保 `upstream nextjs_backend` 指向正确的后端地址
3. **WebSocket 支持**：所有 location 都应该包含 WebSocket 头
4. **日志监控**：定期检查 Nginx 错误日志，及时发现问题

## 相关文件

- `nginx-baota.conf` - 宝塔面板优化配置
- `nginx.conf` - 通用 Nginx 配置
- `PM2_NGINX_DEPLOY.md` - 完整部署指南

