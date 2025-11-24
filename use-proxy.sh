#!/bin/bash

# 配置 Docker 使用代理
# 使用方法: sudo bash use-proxy.sh [proxy_url]
# 如果不提供参数，默认使用 http://127.0.0.1:7890

PROXY_URL=${1:-"http://127.0.0.1:7890"}

echo "配置 Docker 使用代理: $PROXY_URL"
echo ""

# 创建代理配置目录
sudo mkdir -p /etc/systemd/system/docker.service.d

# 创建代理配置文件
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=$PROXY_URL"
Environment="HTTPS_PROXY=$PROXY_URL"
Environment="NO_PROXY=localhost,127.0.0.1,::1"
EOF

echo "✅ 代理配置已创建"
echo ""

# 重启 Docker
echo "重启 Docker..."
sudo systemctl daemon-reload
sudo systemctl restart docker

echo "✅ Docker 已重启"
echo ""

# 测试
echo "测试拉取镜像..."
docker pull node:20-alpine

