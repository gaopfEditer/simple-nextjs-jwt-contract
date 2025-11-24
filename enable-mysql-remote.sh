#!/bin/bash

# 配置 MySQL 允许远程 root 连接

echo "配置 MySQL 允许远程连接..."

# 等待 MySQL 启动
echo "等待 MySQL 启动..."
sleep 5

# 执行 SQL 命令允许 root 远程连接
docker-compose exec -T mysql mysql -uroot -proot_password <<EOF
-- 创建允许远程连接的 root 用户（如果不存在）
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'root_password';

-- 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示用户
SELECT user, host FROM mysql.user WHERE user='root';
EOF

echo ""
echo "✅ MySQL 已配置允许远程 root 连接"
echo ""
echo "连接信息:"
echo "  主机: 192.168.246.131"
echo "  端口: 3306"
echo "  用户: root"
echo "  密码: root_password"
echo ""
echo "⚠️  注意：生产环境请使用强密码并限制访问 IP"





