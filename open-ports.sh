#!/bin/bash

# 开放防火墙端口脚本

echo "开放 Docker 服务端口..."

# 检测系统类型
if command -v firewall-cmd &> /dev/null; then
    # CentOS/RHEL
    echo "检测到 firewalld，使用 firewall-cmd..."
    
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=3306/tcp
    sudo firewall-cmd --permanent --add-port=8080/tcp
    
    sudo firewall-cmd --reload
    
    echo "✅ 端口已开放"
    echo "开放的端口:"
    sudo firewall-cmd --list-ports
    
elif command -v ufw &> /dev/null; then
    # Ubuntu/Debian
    echo "检测到 ufw，使用 ufw..."
    
    sudo ufw allow 3000/tcp
    sudo ufw allow 3306/tcp
    sudo ufw allow 8080/tcp
    
    # 如果 ufw 未启用，则启用
    if ! sudo ufw status | grep -q "Status: active"; then
        echo "启用 ufw..."
        echo "y" | sudo ufw enable
    fi
    
    echo "✅ 端口已开放"
    echo "防火墙状态:"
    sudo ufw status
    
else
    echo "⚠️  未检测到防火墙管理工具"
    echo "请手动配置防火墙开放以下端口:"
    echo "  - 3000/tcp (应用)"
    echo "  - 3306/tcp (MySQL)"
    echo "  - 8080/tcp (phpMyAdmin)"
fi

echo ""
echo "现在可以从外部访问服务了！"

