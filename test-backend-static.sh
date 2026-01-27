#!/bin/bash

# 测试后端静态文件访问
# 用于确认问题是在后端还是 Nginx

echo "🔍 测试后端静态文件访问"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 测试后端主页
echo "1️⃣  测试后端主页..."
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$MAIN_RESPONSE" = "200" ] || [ "$MAIN_RESPONSE" = "302" ] || [ "$MAIN_RESPONSE" = "301" ]; then
    echo -e "${GREEN}✅ 后端主页响应正常 (HTTP $MAIN_RESPONSE)${NC}"
    
    # 获取页面 HTML
    PAGE_HTML=$(curl -s http://localhost:3000 2>/dev/null)
    
    # 提取 CSS 链接
    echo ""
    echo "2️⃣  查找页面中的 CSS 链接..."
    CSS_LINKS=$(echo "$PAGE_HTML" | grep -oP 'href="[^"]*\.css[^"]*"' | head -5)
    if [ -n "$CSS_LINKS" ]; then
        echo -e "${GREEN}✅ 找到 CSS 链接:${NC}"
        echo "$CSS_LINKS" | while read -r link; do
            echo "   $link"
        done
        
        # 提取第一个 CSS 路径
        FIRST_CSS=$(echo "$CSS_LINKS" | head -1 | sed 's/href="//;s/"//')
        if [ -n "$FIRST_CSS" ]; then
            echo ""
            echo "3️⃣  测试访问第一个 CSS 文件..."
            echo "   路径: $FIRST_CSS"
            
            # 测试直接访问后端
            CSS_FULL_PATH="$FIRST_CSS"
            if [[ ! "$CSS_FULL_PATH" =~ ^http ]]; then
                CSS_FULL_PATH="http://localhost:3000$CSS_FULL_PATH"
            fi
            
            echo "   完整 URL: $CSS_FULL_PATH"
            CSS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$CSS_FULL_PATH" 2>/dev/null)
            
            if [ "$CSS_RESPONSE" = "200" ]; then
                echo -e "${GREEN}✅ 后端可以访问静态文件 (HTTP $CSS_RESPONSE)${NC}"
                echo ""
                echo "4️⃣  测试通过 Nginx 访问..."
                NGINX_CSS_PATH=$(echo "$FIRST_CSS" | sed 's|^/||')
                NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: bz.a.gaopf.top" "http://localhost/$NGINX_CSS_PATH" 2>/dev/null)
                
                if [ "$NGINX_RESPONSE" = "200" ]; then
                    echo -e "${GREEN}✅ 通过 Nginx 可以访问 (HTTP $NGINX_RESPONSE)${NC}"
                else
                    echo -e "${RED}❌ 通过 Nginx 无法访问 (HTTP $NGINX_RESPONSE)${NC}"
                    echo "   问题在 Nginx 配置"
                fi
            else
                echo -e "${RED}❌ 后端无法访问静态文件 (HTTP $CSS_RESPONSE)${NC}"
                echo "   问题在后端服务或构建"
                
                # 检查文件是否存在
                echo ""
                echo "5️⃣  检查文件系统..."
                CSS_FILE_PATH=$(echo "$FIRST_CSS" | sed 's|/_next/|.next/|')
                if [ -f "$CSS_FILE_PATH" ]; then
                    echo -e "${GREEN}✅ 文件存在于文件系统: $CSS_FILE_PATH${NC}"
                else
                    echo -e "${RED}❌ 文件不存在于文件系统: $CSS_FILE_PATH${NC}"
                    echo "   请检查构建输出"
                fi
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  未找到 CSS 链接${NC}"
    fi
    
    # 提取 JS 链接
    echo ""
    echo "6️⃣  查找页面中的 JS 链接..."
    JS_LINKS=$(echo "$PAGE_HTML" | grep -oP 'src="[^"]*\.js[^"]*"' | head -5)
    if [ -n "$JS_LINKS" ]; then
        echo -e "${GREEN}✅ 找到 JS 链接:${NC}"
        echo "$JS_LINKS" | head -3 | while read -r link; do
            echo "   $link"
        done
    fi
else
    echo -e "${RED}❌ 后端主页无响应 (HTTP $MAIN_RESPONSE)${NC}"
    echo "   请检查 PM2 服务: pm2 status"
fi

echo ""
echo "================================"
echo "📋 测试完成"
echo ""
echo "如果后端可以访问但 Nginx 不行，问题在 Nginx 配置"
echo "如果后端也无法访问，问题在构建或 Next.js 配置"

