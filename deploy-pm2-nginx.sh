#!/bin/bash

# PM2 + Nginx 快速部署脚本
# 使用方法: ./deploy-pm2-nginx.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 Next.js 应用 (PM2 + Nginx)..."

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误: 请在项目根目录运行此脚本${NC}"
    exit 1
fi

# 1. 检查依赖
echo -e "${YELLOW}📦 检查依赖...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 已安装${NC}"

# 检查 Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nginx 未安装，请手动安装:${NC}"
    echo "   Ubuntu/Debian: sudo apt install nginx"
    echo "   CentOS/RHEL: sudo yum install nginx"
    exit 1
fi
echo -e "${GREEN}✅ Nginx 已安装${NC}"

# 2. 安装项目依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm install
else
    npm install
fi
echo -e "${GREEN}✅ 依赖安装完成${NC}"

# 3. 检查环境变量文件
echo -e "${YELLOW}🔧 检查环境变量配置...${NC}"
if [ ! -f ".env.local" ]; then
    if [ -f "env.example" ]; then
        echo -e "${YELLOW}⚠️  .env.local 不存在，从 env.example 创建...${NC}"
        cp env.example .env.local
        echo -e "${YELLOW}⚠️  请编辑 .env.local 文件配置环境变量，然后重新运行此脚本${NC}"
        exit 1
    else
        echo -e "${RED}❌ .env.local 不存在且 env.example 也不存在${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ 环境变量文件存在${NC}"

# 4. 创建日志目录
echo -e "${YELLOW}📁 创建日志目录...${NC}"
mkdir -p logs
echo -e "${GREEN}✅ 日志目录已创建${NC}"

# 5. 构建项目
echo -e "${YELLOW}🔨 构建 Next.js 应用...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi
echo -e "${GREEN}✅ 构建完成${NC}"

# 6. 停止旧进程（如果存在）
echo -e "${YELLOW}🛑 停止旧进程...${NC}"
pm2 delete nextjs-jwt-app 2>/dev/null || true
echo -e "${GREEN}✅ 旧进程已停止${NC}"

# 7. 启动 PM2 服务
echo -e "${YELLOW}🚀 启动 PM2 服务...${NC}"
pm2 start ecosystem.config.js --env production
echo -e "${GREEN}✅ PM2 服务已启动${NC}"

# 8. 保存 PM2 配置
echo -e "${YELLOW}💾 保存 PM2 配置...${NC}"
pm2 save
echo -e "${GREEN}✅ PM2 配置已保存${NC}"

# 9. 配置 Nginx
echo -e "${YELLOW}🌐 配置 Nginx...${NC}"

# 检测系统类型
if [ -d "/etc/nginx/sites-available" ]; then
    # Ubuntu/Debian
    NGINX_CONF="/etc/nginx/sites-available/nextjs-jwt"
    NGINX_ENABLED="/etc/nginx/sites-enabled/nextjs-jwt"
    
    if [ ! -f "$NGINX_CONF" ]; then
        echo -e "${YELLOW}⚠️  Nginx 配置文件不存在，正在创建...${NC}"
        sudo cp nginx.conf "$NGINX_CONF"
        sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
        echo -e "${YELLOW}⚠️  请编辑 $NGINX_CONF 文件，将 your-domain.com 替换为您的域名或 IP${NC}"
    fi
else
    # CentOS/RHEL
    NGINX_CONF="/etc/nginx/conf.d/nextjs-jwt.conf"
    
    if [ ! -f "$NGINX_CONF" ]; then
        echo -e "${YELLOW}⚠️  Nginx 配置文件不存在，正在创建...${NC}"
        sudo cp nginx.conf "$NGINX_CONF"
        echo -e "${YELLOW}⚠️  请编辑 $NGINX_CONF 文件，将 your-domain.com 替换为您的域名或 IP${NC}"
    fi
fi

# 测试 Nginx 配置
echo -e "${YELLOW}🧪 测试 Nginx 配置...${NC}"
if sudo nginx -t 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx 配置测试通过${NC}"
    echo -e "${YELLOW}🔄 重载 Nginx...${NC}"
    sudo nginx -s reload 2>/dev/null || sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx 已重载${NC}"
else
    echo -e "${RED}❌ Nginx 配置测试失败，请检查配置文件${NC}"
    echo -e "${YELLOW}⚠️  请手动编辑 Nginx 配置文件并运行: sudo nginx -t${NC}"
fi

# 10. 显示状态
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📊 PM2 状态:"
pm2 status
echo ""
echo "📝 常用命令:"
echo "  查看日志: pm2 logs nextjs-jwt-app"
echo "  重启服务: pm2 restart nextjs-jwt-app"
echo "  停止服务: pm2 stop nextjs-jwt-app"
echo "  查看监控: pm2 monit"
echo ""
echo "🌐 Nginx 状态:"
sudo systemctl status nginx --no-pager -l || true
echo ""
echo "🔍 测试访问:"
echo "  本地测试: curl http://localhost:3000"
echo "  通过 Nginx: curl http://localhost"
echo ""
echo -e "${YELLOW}⚠️  重要提示:${NC}"
echo "  1. 请确保已编辑 .env.local 文件配置环境变量"
echo "  2. 请确保已编辑 Nginx 配置文件，设置正确的域名或 IP"
echo "  3. 请确保防火墙已开放 80 和 443 端口"
echo "  4. 如果使用域名，请确保 DNS 已正确解析"
echo ""

