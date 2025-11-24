#!/bin/bash

# 修复 daemon.json 配置（去掉末尾斜杠）
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://swr.cn-south-1.myhuaweicloud.com"
  ]
}
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "✅ 配置已修复，请重新运行: docker-compose up -d"

