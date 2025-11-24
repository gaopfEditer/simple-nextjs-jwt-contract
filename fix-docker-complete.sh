#!/bin/bash

echo "=== 完整修复 Docker 镜像拉取问题 ==="
echo ""

# 1. 备份现有配置
if [ -f /etc/docker/daemon.json ]; then
    echo "备份现有配置..."
    sudo cp /etc/docker/daemon.json /etc/docker/daemon.json.bak.$(date +%Y%m%d_%H%M%S)
fi

# 2. 创建新的配置（多个镜像源，去掉斜杠）
echo "创建新的镜像加速器配置..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false
}
EOF

echo "✅ 配置已更新"
echo ""

# 3. 重启 Docker
echo "重启 Docker 服务..."
sudo systemctl daemon-reload
sudo systemctl restart docker

# 等待 Docker 启动
sleep 5

echo "✅ Docker 已重启"
echo ""

# 4. 验证配置
echo "验证配置:"
docker info 2>/dev/null | grep -A 10 "Registry Mirrors" || echo "⚠️  无法获取配置信息"
echo ""

# 5. 测试拉取
echo "测试拉取 node:20-alpine..."
if docker pull node:20-alpine; then
    echo "✅ 镜像拉取成功！"
else
    echo "❌ 镜像拉取失败"
    echo ""
    echo "尝试其他方法..."
    echo "1. 检查网络连接"
    echo "2. 尝试使用代理"
    echo "3. 手动下载镜像文件"
fi

echo ""
echo "=== 修复完成 ==="

