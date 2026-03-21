# 🚀 PM2 + Nginx 部署指南

本指南说明如何在服务器上使用 PM2 运行后端服务，使用 Nginx 作为反向代理提供前端服务。

## 📋 前置要求

1. **Node.js** (推荐 v18+)
2. **PM2** (进程管理器)
3. **Nginx** (Web 服务器)
4. **MySQL** (数据库，如果使用)

## 🔧 安装步骤

### 1. 安装 Node.js 和 PM2

```bash
# 安装 Node.js (使用 nvm 推荐)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 安装 PM2
npm install -g pm2
```

### 2. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3. 安装 MySQL (如果未安装)

```bash
# Ubuntu/Debian
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# CentOS/RHEL
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

## 📦 项目部署

### 1. 克隆或上传项目到服务器

```bash
# 创建项目目录
sudo mkdir -p /var/www/nextjs-jwt
sudo chown $USER:$USER /var/www/nextjs-jwt

# 进入项目目录
cd /var/www/nextjs-jwt

# 如果使用 git
git clone <your-repo-url> .

# 或者上传项目文件到此目录
```

### 2. 安装依赖

```bash
cd /var/www/nextjs-jwt

# 使用 pnpm (推荐，根据 package.json)
npm install -g pnpm
pnpm install

# 或使用 npm
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量示例文件
cp env.example .env.local

# 编辑环境变量
nano .env.local
```

在 `.env.local` 中配置：

```env
# 数据库配置
DB_HOST=localhost
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

# 域名配置（如果使用域名）
PUBLIC_DOMAIN=your-domain.com
```

### 4. 构建项目

```bash
# 构建 Next.js 应用
pnpm build
# 或
npm run build
```

### 5. 创建日志目录

```bash
mkdir -p logs
```

## 🚀 使用 PM2 启动后端服务

### 1. 使用 PM2 启动应用

```bash
# 使用生产环境配置启动
pm2 start ecosystem.config.js --env production

# 或者直接启动
pm2 start server.js --name nextjs-jwt-app --env production
```

### 2. 查看 PM2 状态

```bash
# 查看运行状态
pm2 status

# 查看日志
pm2 logs nextjs-jwt-app

# 查看详细信息
pm2 show nextjs-jwt-app
```

### 3. 设置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save
```

### 4. PM2 常用命令

```bash
一般需要先构建 pnpm build 
# 重启应用
pm2 restart nextjs-jwt-app

# 停止应用
pm2 stop nextjs-jwt-app

# 删除应用
pm2 delete nextjs-jwt-app

# 查看监控
pm2 monit

# 查看日志
pm2 logs nextjs-jwt-app --lines 100
```

## 🌐 配置 Nginx

### 1. 复制 Nginx 配置文件

```bash
# 复制配置文件到 Nginx 配置目录
sudo cp nginx.conf /etc/nginx/sites-available/nextjs-jwt

# 创建符号链接（Ubuntu/Debian）
sudo ln -s /etc/nginx/sites-available/nextjs-jwt /etc/nginx/sites-enabled/

# CentOS/RHEL 使用以下方式
sudo cp nginx.conf /etc/nginx/conf.d/nextjs-jwt.conf
```

### 2. 编辑配置文件

```bash
# Ubuntu/Debian
sudo nano /etc/nginx/sites-available/nextjs-jwt

# CentOS/RHEL
sudo nano /etc/nginx/conf.d/nextjs-jwt.conf
```

**重要修改**：
- 将 `your-domain.com` 替换为您的域名或 IP
- 如果使用 IP 访问，可以注释掉 `server_name` 或使用 `_` 通配符

### 3. 测试 Nginx 配置

```bash
# 测试配置文件语法
sudo nginx -t
```

### 4. 重载 Nginx

```bash
# 重载配置（不中断服务）
sudo nginx -s reload

# 或重启 Nginx
sudo systemctl restart nginx
```

## 🔥 配置防火墙

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 或者直接开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## ✅ 验证部署

### 1. 检查 PM2 服务

```bash
# 检查服务是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000
# 或
ss -tlnp | grep 3000
```

### 2. 检查 Nginx 服务

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查端口是否监听
netstat -tlnp | grep :80
```

### 3. 测试访问

```bash
# 测试本地访问
curl http://localhost

# 测试后端 API（直接访问 PM2 服务）
curl http://localhost:3000/api/auth/me

# 测试通过 Nginx 访问
curl http://your-domain.com
# 或
curl http://your-server-ip
```

## 🔐 配置 HTTPS (可选但推荐)

### 使用 Let's Encrypt (免费 SSL 证书)

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install -y certbot python3-certbot-nginx   # CentOS/RHEL

# 获取证书（需要域名已解析到服务器 IP）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

获取证书后，编辑 Nginx 配置文件，取消 HTTPS 部分的注释。

## 📊 监控和维护

### 1. 查看日志

```bash
# PM2 日志
pm2 logs nextjs-jwt-app

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 2. 性能监控

```bash
# PM2 监控
pm2 monit

# 系统资源
htop
# 或
top
```

### 3. 更新应用

```bash
# 1. 停止应用
pm2 stop nextjs-jwt-app

# 2. 拉取最新代码
git pull

# 3. 安装新依赖
pnpm install

# 4. 重新构建
pnpm build

# 5. 重启应用
pm2 restart nextjs-jwt-app
```

## 🐛 常见问题

### 问题 1: PM2 服务无法启动

```bash
# 检查日志
pm2 logs nextjs-jwt-app --err

# 检查端口是否被占用
netstat -tlnp | grep 3000

# 检查环境变量
pm2 env nextjs-jwt-app
```

### 问题 2: Nginx 502 Bad Gateway

```bash
# 检查后端服务是否运行
pm2 status

# 检查后端服务端口
curl http://localhost:3000

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 问题 3: WebSocket 连接失败

确保 Nginx 配置中包含 WebSocket 支持：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 问题 4: 静态资源加载失败

检查 Next.js 构建是否正确：

```bash
# 重新构建
pnpm build

# 检查 .next 目录
ls -la .next
```

## 📝 配置文件说明

### ecosystem.config.js

PM2 配置文件，包含：
- 应用启动脚本
- 环境变量配置
- 日志配置
- 自动重启配置

### nginx.conf

Nginx 反向代理配置，包含：
- 上游服务器配置（PM2 服务）
- HTTP/HTTPS 服务器配置
- WebSocket 支持
- 静态文件缓存

## 🎯 最佳实践

1. **使用环境变量管理配置**：敏感信息不要硬编码
2. **配置日志轮转**：避免日志文件过大
3. **设置资源限制**：防止应用占用过多资源
4. **定期备份数据库**：确保数据安全
5. **监控应用状态**：使用 PM2 监控和系统监控工具
6. **配置 HTTPS**：保护数据传输安全
7. **设置防火墙规则**：只开放必要端口

## 📚 相关文档

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)

