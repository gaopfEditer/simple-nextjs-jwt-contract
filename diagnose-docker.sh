#!/bin/bash

echo "=== Docker 镜像拉取诊断 ==="
echo ""

# 1. 检查 Docker 配置
echo "1. 检查 daemon.json 配置:"
if [ -f /etc/docker/daemon.json ]; then
    cat /etc/docker/daemon.json
else
    echo "❌ /etc/docker/daemon.json 不存在"
fi
echo ""

# 2. 检查 Docker 信息
echo "2. 检查 Docker 镜像加速器:"
docker info 2>/dev/null | grep -A 10 "Registry Mirrors" || echo "无法获取信息"
echo ""

# 3. 测试网络连接
echo "3. 测试网络连接:"
echo "测试 docker.mirrors.ustc.edu.cn:"
ping -c 2 docker.mirrors.ustc.edu.cn 2>/dev/null || echo "❌ 无法连接"
echo ""

# 4. 测试 DNS
echo "4. 测试 DNS 解析:"
nslookup docker.mirrors.ustc.edu.cn 2>/dev/null || echo "❌ DNS 解析失败"
echo ""

# 5. 尝试直接拉取（不使用加速器）
echo "5. 尝试直接拉取（绕过加速器）:"
DOCKER_BUILDKIT=0 docker pull node:20-alpine 2>&1 | head -20

echo ""
echo "=== 诊断完成 ==="

