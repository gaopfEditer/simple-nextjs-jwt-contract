#!/bin/bash

# Docker 镜像加速器配置脚本
# 使用方法: sudo bash fix-docker-mirror.sh

echo "配置 Docker 镜像加速器..."

# 创建或备份 daemon.json
if [ -f /etc/docker/daemon.json ]; then
    echo "备份现有配置..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
fi

# 配置镜像加速器（阿里云）
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

echo "✅ 镜像加速器配置完成"

# 重启 Docker 服务
echo "重启 Docker 服务..."
sudo systemctl daemon-reload
sudo systemctl restart docker

echo "✅ Docker 服务已重启"
echo ""
echo "验证配置:"
docker info | grep -A 10 "Registry Mirrors"

echo ""
echo "现在可以重新运行: docker-compose up -d"

