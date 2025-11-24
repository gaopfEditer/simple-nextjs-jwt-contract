#!/bin/bash

# 修复 Docker 镜像加速器配置
# 使用方法: sudo bash fix-docker-config.sh

echo "修复 Docker 镜像加速器配置..."

# 备份现有配置
if [ -f /etc/docker/daemon.json ]; then
    echo "备份现有配置..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%Y%m%d_%H%M%S)
fi

# 配置多个镜像加速器（去掉末尾斜杠，添加更多源）
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://swr.cn-south-1.myhuaweicloud.com",
    "https://dockerhub.azk8s.cn",
    "https://reg-mirror.qiniu.com"
  ]
}
EOF

echo "✅ 镜像加速器配置已更新（去掉了末尾斜杠，添加了更多源）"

# 重启 Docker 服务
echo "重启 Docker 服务..."
sudo systemctl daemon-reload
sudo systemctl restart docker

# 等待 Docker 启动
sleep 3

echo "✅ Docker 服务已重启"
echo ""
echo "验证配置:"
docker info | grep -A 15 "Registry Mirrors" || echo "⚠️  无法获取配置信息，请检查 Docker 服务状态"

echo ""
echo "测试拉取镜像..."
echo "尝试拉取 node:20-alpine..."

# 尝试拉取镜像
if docker pull node:20-alpine; then
    echo "✅ 镜像拉取成功！"
else
    echo "❌ 镜像拉取失败，尝试使用国内镜像..."
    echo ""
    echo "可以尝试以下方法："
    echo "1. 手动拉取: docker pull dockerhub.azk8s.cn/library/node:20-alpine"
    echo "2. 或者使用其他镜像源"
fi

echo ""
echo "现在可以重新运行: docker-compose up -d"

