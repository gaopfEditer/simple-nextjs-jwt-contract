#!/bin/bash

# 测试特定文件访问
# 用法: ./test-specific-file.sh /_next/static/css/0dc348ae691a14b9.css

FILE_PATH="${1:-/_next/static/css/0dc348ae691a14b9.css}"

echo "🔍 测试文件访问: $FILE_PATH"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 测试直接访问后端
echo "1️⃣  直接访问后端..."
BACKEND_URL="http://localhost:3000$FILE_PATH"
echo "   URL: $BACKEND_URL"

BACKEND_RESPONSE=$(curl -s -o /tmp/test_file_response.txt -w "%{http_code}" "$BACKEND_URL" 2>/dev/null)
BACKEND_SIZE=$(stat -f%z /tmp/test_file_response.txt 2>/dev/null || stat -c%s /tmp/test_file_response.txt 2>/dev/null || echo "0")

if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 后端响应: HTTP $BACKEND_RESPONSE, 大小: $BACKEND_SIZE 字节${NC}"
    
    # 显示响应头
    echo "   响应头:"
    curl -s -I "$BACKEND_URL" 2>/dev/null | head -10 | sed 's/^/     /'
    
    # 检查内容类型
    CONTENT_TYPE=$(curl -s -I "$BACKEND_URL" 2>/dev/null | grep -i "content-type" | head -1)
    echo "   $CONTENT_TYPE"
else
    echo -e "${RED}❌ 后端响应: HTTP $BACKEND_RESPONSE${NC}"
    
    # 显示错误内容
    if [ -f /tmp/test_file_response.txt ]; then
        ERROR_CONTENT=$(head -5 /tmp/test_file_response.txt)
        echo "   错误内容:"
        echo "$ERROR_CONTENT" | sed 's/^/     /'
    fi
fi

echo ""

# 2. 测试通过 Nginx 访问
echo "2️⃣  通过 Nginx 访问..."
NGINX_URL="https://bz.a.gaopf.top$FILE_PATH"
echo "   URL: $NGINX_URL"

NGINX_RESPONSE=$(curl -s -k -o /tmp/test_nginx_response.txt -w "%{http_code}" "$NGINX_URL" 2>/dev/null)
NGINX_SIZE=$(stat -f%z /tmp/test_nginx_response.txt 2>/dev/null || stat -c%s /tmp/test_nginx_response.txt 2>/dev/null || echo "0")

if [ "$NGINX_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Nginx 响应: HTTP $NGINX_RESPONSE, 大小: $NGINX_SIZE 字节${NC}"
    
    # 显示响应头
    echo "   响应头:"
    curl -s -k -I "$NGINX_URL" 2>/dev/null | head -10 | sed 's/^/     /'
else
    echo -e "${RED}❌ Nginx 响应: HTTP $NGINX_RESPONSE${NC}"
    
    # 显示错误内容
    if [ -f /tmp/test_nginx_response.txt ]; then
        ERROR_CONTENT=$(head -5 /tmp/test_nginx_response.txt)
        echo "   错误内容:"
        echo "$ERROR_CONTENT" | sed 's/^/     /'
    fi
fi

echo ""

# 3. 检查文件系统
echo "3️⃣  检查文件系统..."
FS_PATH=$(echo "$FILE_PATH" | sed 's|^/_next/|.next/|')
if [ -f "$FS_PATH" ]; then
    echo -e "${GREEN}✅ 文件存在于: $FS_PATH${NC}"
    FS_SIZE=$(stat -f%z "$FS_PATH" 2>/dev/null || stat -c%s "$FS_PATH" 2>/dev/null || echo "0")
    echo "   文件大小: $FS_SIZE 字节"
else
    echo -e "${RED}❌ 文件不存在于: $FS_PATH${NC}"
    
    # 查找类似文件
    echo "   查找类似文件..."
    FIND_RESULT=$(find .next -name "*$(basename "$FILE_PATH")*" 2>/dev/null | head -3)
    if [ -n "$FIND_RESULT" ]; then
        echo "   找到类似文件:"
        echo "$FIND_RESULT" | sed 's/^/     /'
    else
        echo "   未找到类似文件"
    fi
fi

echo ""
echo "================================"
echo "📋 测试完成"
echo ""
echo "对比结果:"
echo "  后端: HTTP $BACKEND_RESPONSE"
echo "  Nginx: HTTP $NGINX_RESPONSE"
echo ""

if [ "$BACKEND_RESPONSE" = "200" ] && [ "$NGINX_RESPONSE" != "200" ]; then
    echo -e "${YELLOW}⚠️  问题在 Nginx 配置${NC}"
elif [ "$BACKEND_RESPONSE" != "200" ]; then
    echo -e "${YELLOW}⚠️  问题在后端服务或构建${NC}"
fi

