#!/bin/bash

# 检查环境变量配置脚本

echo "🔍 检查环境变量配置"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 检查 .env.local 文件
echo "1️⃣  检查 .env.local 文件..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local 文件存在${NC}"
    
    # 检查 DB_HOST
    DB_HOST=$(grep "^DB_HOST=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$DB_HOST" ]; then
        echo -e "${YELLOW}⚠️  .env.local 中未设置 DB_HOST${NC}"
    else
        echo "   DB_HOST=$DB_HOST"
        if [ "$DB_HOST" = "localhost" ]; then
            echo -e "${RED}❌ DB_HOST 设置为 localhost，应该使用 127.0.0.1${NC}"
            echo "   请修改 .env.local: DB_HOST=127.0.0.1"
        elif [ "$DB_HOST" = "127.0.0.1" ]; then
            echo -e "${GREEN}✅ DB_HOST 正确设置为 127.0.0.1${NC}"
        else
            echo -e "${YELLOW}⚠️  DB_HOST 设置为: $DB_HOST${NC}"
        fi
    fi
    
    # 显示其他配置（隐藏密码）
    echo ""
    echo "   其他配置:"
    grep -E "^DB_|^JWT_|^NODE_ENV|^PORT|^HOSTNAME" .env.local | sed 's/=.*/=***/' | sed 's/^/     /'
else
    echo -e "${RED}❌ .env.local 文件不存在${NC}"
    echo "   请创建 .env.local 文件并设置:"
    echo "   DB_HOST=127.0.0.1"
    echo "   DB_PORT=3306"
    echo "   DB_USER=your_user"
    echo "   DB_PASSWORD=your_password"
    echo "   DB_NAME=nextjs_jwt"
fi

echo ""

# 2. 检查 .env 文件
echo "2️⃣  检查 .env 文件..."
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env 文件存在（.env.local 优先级更高）${NC}"
    DB_HOST_ENV=$(grep "^DB_HOST=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$DB_HOST_ENV" ]; then
        echo "   .env 中的 DB_HOST=$DB_HOST_ENV"
    fi
else
    echo -e "${GREEN}✅ .env 文件不存在（使用 .env.local）${NC}"
fi

echo ""

# 3. 检查 PM2 环境变量
echo "3️⃣  检查 PM2 环境变量..."
if command -v pm2 &> /dev/null; then
    PM2_ENV=$(pm2 env nextjs-jwt-app 2>/dev/null | grep "DB_HOST" || echo "")
    if [ -n "$PM2_ENV" ]; then
        echo "   PM2 环境变量:"
        echo "$PM2_ENV" | sed 's/^/     /'
    else
        echo -e "${YELLOW}⚠️  PM2 进程未运行或未设置 DB_HOST${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 未安装${NC}"
fi

echo ""

# 4. 测试 MySQL 连接
echo "4️⃣  测试 MySQL 连接..."
if [ -f ".env.local" ]; then
    # 读取配置
    source .env.local 2>/dev/null || true
    
    # 使用 127.0.0.1 测试
    if command -v mysql &> /dev/null; then
        echo "   测试连接 127.0.0.1:3306..."
        if mysql -h 127.0.0.1 -P ${DB_PORT:-3306} -u ${DB_USER:-root} -p${DB_PASSWORD} -e "SELECT 1;" 2>/dev/null; then
            echo -e "${GREEN}✅ 127.0.0.1 连接成功${NC}"
        else
            echo -e "${RED}❌ 127.0.0.1 连接失败${NC}"
        fi
        
        echo "   测试连接 localhost:3306..."
        if mysql -h localhost -P ${DB_PORT:-3306} -u ${DB_USER:-root} -p${DB_PASSWORD} -e "SELECT 1;" 2>/dev/null; then
            echo -e "${GREEN}✅ localhost 连接成功${NC}"
        else
            echo -e "${RED}❌ localhost 连接失败（可能是 IPv6 问题）${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  mysql 客户端未安装，跳过连接测试${NC}"
    fi
fi

echo ""
echo "================================"
echo "📋 修复建议"
echo "================================"
echo ""
echo "如果 DB_HOST 设置为 localhost，请执行："
echo ""
echo "1. 编辑 .env.local:"
echo "   DB_HOST=127.0.0.1"
echo ""
echo "2. 重启 PM2:"
echo "   pm2 restart nextjs-jwt-app"
echo ""

