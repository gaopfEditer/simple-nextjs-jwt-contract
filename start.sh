#!/bin/bash

echo "=========================================="
echo "启动 Next.js JWT 应用"
echo "=========================================="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动服务
echo "启动服务..."
sudo docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "=========================================="
echo "服务状态"
echo "=========================================="
sudo docker-compose ps

# 获取 IP 地址
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "访问地址"
echo "=========================================="
echo "应用:      http://$IP:3000"
echo "           http://localhost:3000"
echo ""
echo "phpMyAdmin: http://$IP:8080"
echo "            http://localhost:8080"
echo ""

# 检查端口监听
echo "检查端口监听状态..."
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "✅ 端口 3000 正在监听"
else
    echo "⚠️  端口 3000 未监听"
fi

if netstat -tlnp 2>/dev/null | grep -q ":8080 "; then
    echo "✅ 端口 8080 正在监听"
else
    echo "⚠️  端口 8080 未监听"
fi

echo ""
echo "=========================================="
echo "查看日志: sudo docker-compose logs -f"
echo "停止服务: sudo docker-compose down"
echo "=========================================="

