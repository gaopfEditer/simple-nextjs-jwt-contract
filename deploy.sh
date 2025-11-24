#!/bin/bash

# Docker 部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Next.js JWT 应用 Docker 部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境检查通过${NC}"
echo ""

# 检查必要文件
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ 未找到 Dockerfile${NC}"
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ 未找到 docker-compose.yml${NC}"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 未找到 package.json${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 必要文件检查通过${NC}"
echo ""

# 询问是否构建镜像
read -p "是否重新构建镜像? (y/n, 默认: n): " rebuild
rebuild=${rebuild:-n}

if [ "$rebuild" = "y" ] || [ "$rebuild" = "Y" ]; then
    echo -e "${YELLOW}📦 开始构建 Docker 镜像...${NC}"
    docker-compose build --no-cache
    echo -e "${GREEN}✅ 镜像构建完成${NC}"
    echo ""
fi

# 停止现有容器
echo -e "${YELLOW}🛑 停止现有容器...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✅ 容器已停止${NC}"
echo ""

# 启动服务
echo -e "${YELLOW}🚀 启动服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo ""
echo -e "${BLUE}📊 服务状态:${NC}"
docker-compose ps

# 检查应用健康状态
echo ""
echo -e "${YELLOW}🔍 检查应用健康状态...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 应用已成功启动！${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 应用启动超时，请查看日志: docker-compose logs app${NC}"
    else
        echo -n "."
        sleep 2
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  ${GREEN}应用:${NC} http://localhost:3000"
echo -e "  ${GREEN}phpMyAdmin:${NC} http://localhost:8080"
echo ""
echo -e "常用命令:"
echo -e "  查看日志: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  查看状态: ${YELLOW}docker-compose ps${NC}"
echo -e "  停止服务: ${YELLOW}docker-compose down${NC}"
echo -e "  重启服务: ${YELLOW}docker-compose restart${NC}"
echo ""

