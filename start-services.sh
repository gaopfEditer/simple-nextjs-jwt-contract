#!/bin/bash

# 启动数据库服务脚本
# 使用方法: chmod +x start-services.sh && sudo ./start-services.sh

echo "=========================================="
echo "启动数据库服务"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 启动服务函数
start_service() {
    local service_name=$1
    local display_name=$2
    
    echo "启动 $display_name..."
    
    # 尝试不同的服务名称
    if systemctl start $service_name 2>/dev/null; then
        sleep 2
        if systemctl is-active --quiet $service_name; then
            echo -e "${GREEN}✅ $display_name 启动成功${NC}"
            return 0
        fi
    fi
    
    # 尝试其他可能的服务名称
    case $service_name in
        mongod)
            if systemctl start mongodb 2>/dev/null; then
                sleep 2
                if systemctl is-active --quiet mongodb; then
                    echo -e "${GREEN}✅ $display_name 启动成功${NC}"
                    return 0
                fi
            fi
            ;;
        postgresql)
            for pg_service in postgresql-16 postgresql-15 postgresql-14 postgresql-13; do
                if systemctl start $pg_service 2>/dev/null; then
                    sleep 2
                    if systemctl is-active --quiet $pg_service; then
                        echo -e "${GREEN}✅ $display_name 启动成功${NC}"
                        return 0
                    fi
                fi
            done
            ;;
        redis)
            if systemctl start redis-server 2>/dev/null; then
                sleep 2
                if systemctl is-active --quiet redis-server; then
                    echo -e "${GREEN}✅ $display_name 启动成功${NC}"
                    return 0
                fi
            fi
            ;;
    esac
    
    echo -e "${RED}❌ $display_name 启动失败${NC}"
    return 1
}

# 设置开机自启动
enable_service() {
    local service_name=$1
    local display_name=$2
    
    echo "设置 $display_name 开机自启动..."
    
    if systemctl enable $service_name 2>/dev/null; then
        echo -e "${GREEN}✅ $display_name 已设置开机自启动${NC}"
        return 0
    fi
    
    # 尝试其他可能的服务名称
    case $service_name in
        mongod)
            systemctl enable mongodb 2>/dev/null && echo -e "${GREEN}✅ $display_name 已设置开机自启动${NC}"
            ;;
        postgresql)
            for pg_service in postgresql-16 postgresql-15 postgresql-14 postgresql-13; do
                if systemctl enable $pg_service 2>/dev/null; then
                    echo -e "${GREEN}✅ $display_name 已设置开机自启动${NC}"
                    return 0
                fi
            done
            ;;
        redis)
            systemctl enable redis-server 2>/dev/null && echo -e "${GREEN}✅ $display_name 已设置开机自启动${NC}"
            ;;
    esac
}

# 检查服务状态
check_status() {
    local service_name=$1
    local port=$2
    local display_name=$3
    
    echo ""
    echo "检查 $display_name 状态..."
    
    # 检查服务状态
    if systemctl is-active --quiet $service_name || \
       systemctl is-active --quiet mongodb 2>/dev/null || \
       systemctl is-active --quiet redis-server 2>/dev/null || \
       systemctl is-active --quiet postgresql-16 2>/dev/null || \
       systemctl is-active --quiet postgresql-15 2>/dev/null; then
        echo -e "${GREEN}✅ $display_name 服务正在运行${NC}"
    else
        echo -e "${RED}❌ $display_name 服务未运行${NC}"
    fi
    
    # 检查端口
    if netstat -tlnp 2>/dev/null | grep -q ":$port " || ss -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅ 端口 $port 正在监听${NC}"
    else
        echo -e "${YELLOW}⚠️  端口 $port 未监听${NC}"
    fi
}

# 主函数
main() {
    # 检查是否有 root 权限
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}❌ 请使用 sudo 运行此脚本${NC}"
        exit 1
    fi
    
    # 启动 MongoDB
    echo ""
    echo "--- MongoDB ---"
    start_service mongod "MongoDB"
    enable_service mongod "MongoDB"
    check_status mongod 27017 "MongoDB"
    
    # 启动 PostgreSQL
    echo ""
    echo "--- PostgreSQL ---"
    start_service postgresql "PostgreSQL"
    enable_service postgresql "PostgreSQL"
    check_status postgresql 7007 "PostgreSQL"
    
    # 启动 Redis
    echo ""
    echo "--- Redis ---"
    start_service redis "Redis"
    enable_service redis "Redis"
    check_status redis 6379 "Redis"
    
    echo ""
    echo "=========================================="
    echo "服务启动完成"
    echo "=========================================="
    echo ""
    echo "提示: 使用以下命令检查服务状态"
    echo "  sudo systemctl status mongod"
    echo "  sudo systemctl status postgresql"
    echo "  sudo systemctl status redis"
    echo ""
    echo "或运行验证脚本:"
    echo "  chmod +x verify-databases.sh && ./verify-databases.sh"
}

# 运行主函数
main


