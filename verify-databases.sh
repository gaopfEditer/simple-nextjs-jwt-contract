#!/bin/bash

# 数据库验证脚本
# 使用方法: chmod +x verify-databases.sh && ./verify-databases.sh

echo "=========================================="
echo "数据库服务验证脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 未安装${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $1 已安装${NC}"
        return 0
    fi
}

# 检查服务状态
check_service() {
    local service_name=$1
    if systemctl is-active --quiet $service_name; then
        echo -e "${GREEN}✅ $service_name 服务正在运行${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name 服务未运行${NC}"
        return 1
    fi
}

# 检查端口监听
check_port() {
    local port=$1
    local service_name=$2
    if netstat -tlnp 2>/dev/null | grep -q ":$port " || ss -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅ 端口 $port ($service_name) 正在监听${NC}"
        return 0
    else
        echo -e "${RED}❌ 端口 $port ($service_name) 未监听${NC}"
        return 1
    fi
}

# 验证 MongoDB
verify_mongodb() {
    echo ""
    echo "=== 验证 MongoDB ==="
    
    # 检查服务
    if check_service mongod || check_service mongodb; then
        SERVICE_RUNNING=true
    else
        SERVICE_RUNNING=false
    fi
    
    # 检查端口
    check_port 27017 "MongoDB"
    
    # 检查命令
    if check_command mongosh; then
        MONGO_CMD="mongosh"
    elif check_command mongo; then
        MONGO_CMD="mongo"
    else
        echo -e "${YELLOW}⚠️  MongoDB 客户端未安装，无法测试连接${NC}"
        return
    fi
    
    # 测试连接
    if [ "$SERVICE_RUNNING" = true ]; then
        echo ""
        echo "测试 MongoDB 连接..."
        MONGODB_URI="mongodb://admin:5GwYsADkufxyYjer@localhost:27017/fastgpt?authSource=admin"
        
        if $MONGO_CMD "$MONGODB_URI" --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MongoDB 连接成功${NC}"
            
            # 列出数据库
            echo ""
            echo "MongoDB 数据库列表:"
            $MONGO_CMD "$MONGODB_URI" --eval "db.adminCommand('listDatabases')" --quiet 2>/dev/null | grep -E "name|sizeOnDisk" || echo "无法获取数据库列表"
            
            # 检查 fastgpt 数据库
            echo ""
            echo "检查 fastgpt 数据库:"
            if $MONGO_CMD "$MONGODB_URI" --eval "db.getName()" --quiet 2>/dev/null | grep -q "fastgpt"; then
                echo -e "${GREEN}✅ fastgpt 数据库存在${NC}"
                
                # 列出集合
                echo ""
                echo "fastgpt 数据库的集合:"
                $MONGO_CMD "$MONGODB_URI" --eval "db.getCollectionNames()" --quiet 2>/dev/null || echo "无法获取集合列表"
            else
                echo -e "${YELLOW}⚠️  fastgpt 数据库可能不存在或无法访问${NC}"
            fi
        else
            echo -e "${RED}❌ MongoDB 连接失败${NC}"
        fi
    fi
}

# 验证 PostgreSQL
verify_postgresql() {
    echo ""
    echo "=== 验证 PostgreSQL ==="
    
    # 检查服务
    if check_service postgresql || check_service postgresql-16 || check_service postgresql-15 || check_service postgresql-14; then
        SERVICE_RUNNING=true
    else
        SERVICE_RUNNING=false
    fi
    
    # 检查端口
    check_port 7007 "PostgreSQL"
    
    # 检查命令
    if ! check_command psql; then
        echo -e "${YELLOW}⚠️  PostgreSQL 客户端未安装，无法测试连接${NC}"
        return
    fi
    
    # 测试连接
    if [ "$SERVICE_RUNNING" = true ]; then
        echo ""
        echo "测试 PostgreSQL 连接..."
        PG_URL="postgresql://postgres:WeSDalsf2kpxrNJN@localhost:7007/postgres"
        
        if PGPASSWORD="WeSDalsf2kpxrNJN" psql -h localhost -p 7007 -U postgres -d postgres -c "SELECT version();" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PostgreSQL 连接成功${NC}"
            
            # 列出数据库
            echo ""
            echo "PostgreSQL 数据库列表:"
            PGPASSWORD="WeSDalsf2kpxrNJN" psql -h localhost -p 7007 -U postgres -d postgres -c "\l" 2>/dev/null || echo "无法获取数据库列表"
            
            # 检查 postgres 数据库
            echo ""
            echo "检查 postgres 数据库:"
            if PGPASSWORD="WeSDalsf2kpxrNJN" psql -h localhost -p 7007 -U postgres -d postgres -c "SELECT datname FROM pg_database WHERE datname='postgres';" 2>/dev/null | grep -q "postgres"; then
                echo -e "${GREEN}✅ postgres 数据库存在${NC}"
                
                # 列出表
                echo ""
                echo "postgres 数据库的表:"
                PGPASSWORD="WeSDalsf2kpxrNJN" psql -h localhost -p 7007 -U postgres -d postgres -c "\dt" 2>/dev/null || echo "无法获取表列表"
            else
                echo -e "${YELLOW}⚠️  postgres 数据库可能不存在或无法访问${NC}"
            fi
        else
            echo -e "${RED}❌ PostgreSQL 连接失败${NC}"
        fi
    fi
}

# 验证 Redis
verify_redis() {
    echo ""
    echo "=== 验证 Redis ==="
    
    # 检查服务
    if check_service redis || check_service redis-server; then
        SERVICE_RUNNING=true
    else
        SERVICE_RUNNING=false
    fi
    
    # 检查端口
    check_port 6379 "Redis"
    
    # 检查命令
    if ! check_command redis-cli; then
        echo -e "${YELLOW}⚠️  Redis 客户端未安装，无法测试连接${NC}"
        return
    fi
    
    # 测试连接
    if [ "$SERVICE_RUNNING" = true ]; then
        echo ""
        echo "测试 Redis 连接..."
        if redis-cli -h localhost -p 6379 -a foobared ping 2>/dev/null | grep -q "PONG"; then
            echo -e "${GREEN}✅ Redis 连接成功${NC}"
            
            # 获取信息
            echo ""
            echo "Redis 信息:"
            redis-cli -h localhost -p 6379 -a foobared info server 2>/dev/null | grep -E "redis_version|os" || echo "无法获取 Redis 信息"
        else
            echo -e "${RED}❌ Redis 连接失败${NC}"
        fi
    fi
}

# 主函数
main() {
    verify_mongodb
    verify_postgresql
    verify_redis
    
    echo ""
    echo "=========================================="
    echo "验证完成"
    echo "=========================================="
}

# 运行主函数
main


