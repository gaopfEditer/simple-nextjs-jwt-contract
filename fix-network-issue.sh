#!/bin/bash

echo "=== 修复网络问题 ==="
echo ""

# 1. 测试可用的镜像源
echo "测试镜像源可用性..."

# 测试各个镜像源
test_mirror() {
    local url=$1
    if curl -s --connect-timeout 3 -I "$url" > /dev/null 2>&1; then
        echo "✅ $url 可用"
        return 0
    else
        echo "❌ $url 不可用"
        return 1
    fi
}

AVAILABLE_MIRRORS=()

if test_mirror "https://hub-mirror.c.163.com"; then
    AVAILABLE_MIRRORS+=("https://hub-mirror.c.163.com")
fi

if test_mirror "https://mirror.baidubce.com"; then
    AVAILABLE_MIRRORS+=("https://mirror.baidubce.com")
fi

if test_mirror "https://dockerhub.azk8s.cn"; then
    AVAILABLE_MIRRORS+=("https://dockerhub.azk8s.cn")
fi

if test_mirror "https://reg-mirror.qiniu.com"; then
    AVAILABLE_MIRRORS+=("https://reg-mirror.qiniu.com")
fi

if [ ${#AVAILABLE_MIRRORS[@]} -eq 0 ]; then
    echo "❌ 所有镜像源都不可用，可能是网络问题"
    echo ""
    echo "建议："
    echo "1. 检查服务器网络连接"
    echo "2. 检查防火墙设置"
    echo "3. 使用代理服务器"
    exit 1
fi

echo ""
echo "找到 ${#AVAILABLE_MIRRORS[@]} 个可用镜像源"
echo ""

# 2. 更新配置
echo "更新 Docker 配置..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
$(printf '    "%s"' "${AVAILABLE_MIRRORS[0]}"
for mirror in "${AVAILABLE_MIRRORS[@]:1}"; do
    echo ","
    printf '    "%s"' "$mirror"
done)
  ]
}
EOF

echo "✅ 配置已更新"
echo ""

# 3. 重启 Docker
echo "重启 Docker..."
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 3

echo "✅ Docker 已重启"
echo ""

# 4. 验证
echo "验证配置:"
docker info 2>/dev/null | grep -A 10 "Registry Mirrors"
echo ""

# 5. 测试拉取
echo "测试拉取 node:20-alpine..."
if timeout 30 docker pull node:20-alpine; then
    echo "✅ 镜像拉取成功！"
else
    echo "❌ 镜像拉取失败"
    echo ""
    echo "可能的原因："
    echo "1. 网络连接不稳定"
    echo "2. 需要配置代理"
    echo "3. 镜像源暂时不可用"
fi

