#!/bin/bash

# 快速配置 Docker 使用 127.0.0.1:7890 代理

PROXY_URL="http://127.0.0.1:7890"

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

echo "✅ 代理配置已创建: /etc/systemd/system/docker.service.d/http-proxy.conf"
echo ""

# 重启 Docker
echo "重启 Docker..."
sudo systemctl daemon-reload
sudo systemctl restart docker

# 等待 Docker 启动
sleep 3

echo "✅ Docker 已重启"
echo ""

# 验证配置
echo "验证代理配置:"
sudo systemctl show --property=Environment docker | grep PROXY
echo ""

# 测试拉取镜像
echo "测试拉取 node:20-alpine..."
if timeout 60 docker pull node:20-alpine; then
    echo "✅ 镜像拉取成功！代理配置正常"
else
    echo "❌ 镜像拉取失败"
    echo ""
    echo "请检查："
    echo "1. 代理服务是否运行在 127.0.0.1:7890"
    echo "2. 代理是否允许 Docker 连接"
    echo "3. 运行: curl -x $PROXY_URL http://www.google.com 测试代理"
fi

echo ""
echo "现在可以运行: sudo docker-compose up -d"

