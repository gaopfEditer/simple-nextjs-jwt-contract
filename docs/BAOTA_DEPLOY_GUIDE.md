# 宝塔面板部署 Next.js 项目完整指南

## ⚠️ 重要说明

**Next.js 不是传统的静态网站！**

- ❌ **不要**选择 `.next` 目录作为网站根目录
- ❌ **不要**选择项目目录作为网站根目录
- ✅ **必须**使用 Nginx 反向代理到 Node.js 服务器
- ✅ **必须**使用 PM2 运行 Node.js 服务

## 🔍 502 错误原因分析

502 Bad Gateway 错误通常由以下原因导致：

1. **后端服务未运行** - PM2 服务没有启动
2. **端口配置错误** - Nginx 代理的端口与 PM2 服务端口不一致
3. **Nginx 配置错误** - 代理配置不正确
4. **防火墙阻止** - 端口未开放

## 📋 部署步骤

### 第一步：准备项目文件

1. **上传项目到服务器**
   ```bash
   # 建议上传到 /www/wwwroot/your-domain.com/ 目录
   # 或者自定义目录，例如：/www/wwwroot/nextjs-jwt/
   ```

2. **安装依赖**
   ```bash
   cd /www/wwwroot/your-domain.com/
   pnpm install
   # 或
   npm install
   ```

3. **配置环境变量**
   ```bash
   # 创建 .env.local 文件
   cp env.example .env.local
   nano .env.local
   ```

   配置内容：
   ```env
   NODE_ENV=production
   PORT=3000
   HOSTNAME=0.0.0.0
   
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=nextjs_jwt
   
   JWT_SECRET=your-secret-key
   JWT_EXPIRES_IN=7d
   ```

4. **构建项目**
   ```bash
   pnpm build
   # 或
   npm run build
   ```

### 第二步：使用 PM2 启动后端服务

1. **安装 PM2（如果未安装）**
   ```bash
   npm install -g pm2
   ```

2. **创建日志目录**
   ```bash
   mkdir -p logs
   ```

3. **启动服务**
   ```bash
   cd /www/wwwroot/your-domain.com/
   
   # 使用 ecosystem.config.js 启动（推荐）
   pm2 start ecosystem.config.js --env production
   
   # 或直接启动
   pm2 start server.js --name nextjs-jwt-app --env production
   ```

4. **检查服务状态**
   ```bash
   # 查看状态
   pm2 status
   
   # 查看日志
   pm2 logs nextjs-jwt-app
   
   # 检查端口是否监听
   netstat -tlnp | grep 3000
   # 应该看到类似：tcp 0 0 0.0.0.0:3000 0.0.0.0:* LISTEN
   ```

5. **设置开机自启**
   ```bash
   pm2 startup
   pm2 save
   ```

### 第三步：在宝塔面板配置网站

#### 方法 1：使用宝塔面板创建网站（推荐）

1. **登录宝塔面板** → **网站** → **添加站点**

2. **填写信息**：
   - **域名**：填写你的域名（如：example.com）
   - **备注**：Next.js 应用
   - **根目录**：**选择项目目录**（例如：`/www/wwwroot/your-domain.com/`）
     - ⚠️ **注意**：这里选择项目根目录，但**不是**用来存放静态文件的
     - 这个目录只是用来存放 Nginx 配置文件

3. **PHP 版本**：选择"纯静态"（因为不需要 PHP）

4. **点击提交**

#### 方法 2：手动配置（如果已有网站）

1. **进入网站设置** → **设置** → **配置文件**

2. **清空现有配置**，替换为以下配置：

```nginx
upstream nextjs_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;  # 修改为你的域名
    
    # ⚠️ 重要：不要设置 root，让所有请求都代理到 Next.js
    # root /www/wwwroot/your-domain.com/;  # 注释掉或删除这行
    
    index index.html index.htm;
    
    # SSL 证书配置（如果使用 HTTPS）
    #CERT-APPLY-CHECK--START
    include /www/server/panel/vhost/nginx/well-known/your-domain.com.conf;
    #CERT-APPLY-CHECK--END
    include /www/server/panel/vhost/nginx/extension/your-domain.com/*.conf;
    
    #SSL-START
    ssl_certificate    /www/server/panel/vhost/cert/your-domain.com/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    error_page 497  https://$host$request_uri;
    #SSL-END

    # 禁止访问敏感文件
    location ~ ^/(\.user.ini|\.htaccess|\.git|\.env|\.svn|\.project|LICENSE|README.md) {
        return 404;
    }

    # Next.js 静态文件
    location ^~ /_next/static/ {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Next.js 其他资源
    location ^~ /_next/ {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 路由
    location = /api/ws {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
    }

    # API 路由
    location /api/ {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # 所有其他请求（包括页面路由）
    location / {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # 日志配置
    access_log  /www/wwwlogs/your-domain.com.log;
    error_log  /www/wwwlogs/your-domain.com.error.log;
}
```

3. **保存配置**

4. **测试配置**
   ```bash
   # 在宝塔面板中点击"测试配置"
   # 或使用命令行
   nginx -t
   ```

5. **重载 Nginx**
   - 在宝塔面板中点击"重载配置"
   - 或使用命令行：`nginx -s reload`

### 第四步：检查防火墙

1. **在宝塔面板中** → **安全** → **防火墙**

2. **确保以下端口已开放**：
   - **80** (HTTP)
   - **443** (HTTPS)
   - **3000** (可选，如果不需要外部直接访问)

3. **如果使用云服务器**，还需要在云服务商控制台配置安全组规则

## 🔧 故障排查

### 问题 1：502 Bad Gateway

**检查步骤：**

1. **检查 PM2 服务是否运行**
   ```bash
   pm2 status
   # 应该看到 nextjs-jwt-app 状态为 online
   ```

2. **检查端口是否监听**
   ```bash
   netstat -tlnp | grep 3000
   # 或
   ss -tlnp | grep 3000
   # 应该看到 0.0.0.0:3000 或 127.0.0.1:3000
   ```

3. **检查后端服务是否正常**
   ```bash
   curl http://localhost:3000
   # 应该返回 HTML 内容，而不是连接错误
   ```

4. **检查 Nginx 错误日志**
   ```bash
   tail -f /www/wwwlogs/your-domain.com.error.log
   # 查看具体错误信息
   ```

5. **检查 Nginx 配置中的 upstream**
   ```bash
   # 确保 upstream nextjs_backend 中的端口是 3000
   # 确保 server 地址是 127.0.0.1:3000
   ```

**常见原因和解决方案：**

- **PM2 服务未启动**
  ```bash
  pm2 start ecosystem.config.js --env production
  ```

- **端口被占用**
  ```bash
  # 检查端口占用
   lsof -i :3000
   # 或修改 ecosystem.config.js 中的端口
  ```

- **环境变量未设置**
  ```bash
  # 检查 .env.local 文件是否存在
  # 检查环境变量是否正确
  pm2 env nextjs-jwt-app
  ```

### 问题 2：静态资源 404

**原因**：Nginx 配置中设置了 `root`，导致 Nginx 尝试从文件系统读取静态文件

**解决方案**：
1. 删除或注释掉 Nginx 配置中的 `root` 设置
2. 确保所有 `location` 都使用 `proxy_pass http://nextjs_backend`

### 问题 3：WebSocket 连接失败

**解决方案**：
确保 Nginx 配置中包含：
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 问题 4：页面显示但样式丢失

**原因**：静态资源路径错误或缓存问题

**解决方案**：
1. 清除浏览器缓存
2. 检查 `/_next/static/` 路径是否正确代理
3. 检查 Nginx 配置中的 `location ^~ /_next/static/` 配置

## ✅ 验证部署

### 1. 检查服务状态

```bash
# PM2 状态
pm2 status

# 端口监听
netstat -tlnp | grep 3000

# 后端服务测试
curl http://localhost:3000
```

### 2. 测试访问

- 在浏览器中访问你的域名
- 检查页面是否正常显示
- 检查浏览器控制台是否有错误
- 检查 Network 标签页，确认静态资源正常加载

### 3. 测试 API

```bash
# 测试 API 路由
curl https://your-domain.com/api/auth/me
```

## 📝 重要提示

1. **不要选择 `.next` 目录作为网站根目录**
   - `.next` 是 Next.js 构建输出目录
   - 它不包含 `index.html`（Next.js 是服务端渲染）
   - 所有请求必须通过 Node.js 服务器处理

2. **必须使用 PM2 运行后端服务**
   - Next.js 需要 Node.js 服务器运行
   - PM2 可以保证服务稳定运行和自动重启

3. **必须使用 Nginx 反向代理**
   - Nginx 作为反向代理，将请求转发到 Node.js 服务器
   - 所有请求（包括静态资源）都应该代理到后端

4. **环境变量配置**
   - 生产环境必须配置正确的环境变量
   - 数据库连接、JWT Secret 等敏感信息不要硬编码

5. **日志监控**
   - 定期检查 PM2 日志：`pm2 logs nextjs-jwt-app`
   - 定期检查 Nginx 错误日志：`tail -f /www/wwwlogs/your-domain.com.error.log`

## 🎯 快速检查清单

- [ ] 项目已构建（`pnpm build`）
- [ ] 环境变量已配置（`.env.local`）
- [ ] PM2 服务已启动（`pm2 status`）
- [ ] 端口 3000 正在监听（`netstat -tlnp | grep 3000`）
- [ ] Nginx 配置正确（无 `root` 设置，所有请求代理到后端）
- [ ] 防火墙已开放 80 和 443 端口
- [ ] 域名已解析到服务器 IP
- [ ] SSL 证书已配置（如果使用 HTTPS）

## 📚 相关文件

- `ecosystem.config.js` - PM2 配置文件
- `nginx-baota.conf` - 宝塔面板 Nginx 配置示例
- `server.js` - Next.js 自定义服务器（支持 WebSocket）
- `BAOTA_NGINX_FIX.md` - 宝塔 Nginx 配置修复指南

