#!/bin/bash

echo "测试镜像加速器..."

# 测试拉取镜像
echo "尝试拉取 node:20-alpine..."
docker pull node:20-alpine

if [ $? -eq 0 ]; then
    echo "✅ 镜像拉取成功！"
else
    echo "❌ 镜像拉取失败"
    echo ""
    echo "检查配置:"
    cat /etc/docker/daemon.json
    echo ""
    echo "检查 Docker 信息:"
    docker info | grep -A 10 "Registry Mirrors"
fi

