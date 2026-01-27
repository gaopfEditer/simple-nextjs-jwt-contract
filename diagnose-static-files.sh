#!/bin/bash

# Next.js 静态文件问题诊断脚本
# 用于排查静态资源 404 问题

echo "🔍 Next.js 静态文件问题诊断"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 检查 PM2 服务
echo "1️⃣  检查 PM2 服务状态..."
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep nextjs-jwt-app || echo "")
    if [ -z "$PM2_STATUS" ]; then
        echo -e "${RED}❌ PM2 服务未运行${NC}"
        echo "   请运行: pm2 start ecosystem.config.js --env production"
    else
        echo -e "${GREEN}✅ PM2 服务正在运行${NC}"
        pm2 list | grep nextjs-jwt-app
    fi
else
    echo -e "${RED}❌ PM2 未安装${NC}"
fi
echo ""

# 2. 检查后端端口
echo "2️⃣  检查后端服务端口 (3000)..."
if netstat -tlnp 2>/dev/null | grep -q ":3000 " || ss -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo -e "${GREEN}✅ 端口 3000 正在监听${NC}"
    netstat -tlnp 2>/dev/null | grep ":3000 " || ss -tlnp 2>/dev/null | grep ":3000 "
else
    echo -e "${RED}❌ 端口 3000 未监听${NC}"
    echo "   后端服务可能未启动"
fi
echo ""

# 3. 测试后端服务
echo "3️⃣  测试后端服务响应..."
BACKEND_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
if [ "$BACKEND_TEST" = "200" ] || [ "$BACKEND_TEST" = "302" ] || [ "$BACKEND_TEST" = "301" ]; then
    echo -e "${GREEN}✅ 后端服务响应正常 (HTTP $BACKEND_TEST)${NC}"
else
    echo -e "${RED}❌ 后端服务无响应 (HTTP $BACKEND_TEST)${NC}"
    echo "   请检查 PM2 日志: pm2 logs nextjs-jwt-app"
fi
echo ""

# 4. 测试静态文件（直接访问后端）
echo "4️⃣  测试静态文件（直接访问后端）..."
STATIC_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/static/css/app.css" 2>/dev/null)
if [ "$STATIC_TEST" = "200" ]; then
    echo -e "${GREEN}✅ 后端可以访问静态文件 (HTTP $STATIC_TEST)${NC}"
    echo "   测试 URL: http://localhost:3000/_next/static/css/app.css"
else
    echo -e "${YELLOW}⚠️  后端静态文件测试 (HTTP $STATIC_TEST)${NC}"
    echo "   这可能是正常的，因为 Next.js 的静态文件路径是动态的"
    echo "   让我们测试一个实际的静态文件路径..."
    
    # 尝试获取页面并提取静态文件路径
    PAGE_HTML=$(curl -s http://localhost:3000 2>/dev/null)
    if [ -n "$PAGE_HTML" ]; then
        CSS_LINK=$(echo "$PAGE_HTML" | grep -oP 'href="[^"]*\.css[^"]*"' | head -1 | sed 's/href="//;s/"//')
        if [ -n "$CSS_LINK" ]; then
            echo "   发现 CSS 链接: $CSS_LINK"
            CSS_PATH=$(echo "$CSS_LINK" | sed 's|^/||')
            CSS_TEST=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$CSS_PATH" 2>/dev/null)
            if [ "$CSS_TEST" = "200" ]; then
                echo -e "${GREEN}   ✅ 静态文件可以访问 (HTTP $CSS_TEST)${NC}"
            else
                echo -e "${RED}   ❌ 静态文件无法访问 (HTTP $CSS_TEST)${NC}"
            fi
        fi
    fi
fi
echo ""

# 5. 检查 Nginx 配置
echo "5️⃣  检查 Nginx 配置..."
if [ -f "/etc/nginx/sites-available/bz.a.gaopf.top" ] || [ -f "/etc/nginx/conf.d/bz.a.gaopf.top.conf" ]; then
    NGINX_CONF=$(find /etc/nginx -name "*bz.a.gaopf.top*" -type f 2>/dev/null | head -1)
    if [ -n "$NGINX_CONF" ]; then
        echo "   配置文件: $NGINX_CONF"
        
        # 检查是否有 root 设置
        if grep -q "^[^#]*root.*\.next" "$NGINX_CONF" 2>/dev/null; then
            echo -e "${RED}   ❌ 发现 root 设置指向 .next 目录${NC}"
            echo "   这会导致静态文件无法正确代理"
            grep "^[^#]*root.*\.next" "$NGINX_CONF"
        else
            echo -e "${GREEN}   ✅ 未发现冲突的 root 设置${NC}"
        fi
        
        # 检查 upstream 配置
        if grep -q "upstream nextjs_backend" "$NGINX_CONF" 2>/dev/null; then
            echo -e "${GREEN}   ✅ 发现 upstream nextjs_backend 配置${NC}"
        else
            echo -e "${RED}   ❌ 未发现 upstream nextjs_backend 配置${NC}"
        fi
        
        # 检查 /_next/static/ location
        if grep -q "location.*/_next/static/" "$NGINX_CONF" 2>/dev/null; then
            echo -e "${GREEN}   ✅ 发现 /_next/static/ location 配置${NC}"
            if grep -q "location.*^~.*/_next/static/" "$NGINX_CONF" 2>/dev/null; then
                echo -e "${GREEN}   ✅ 使用了 ^~ 前缀（优先级正确）${NC}"
            else
                echo -e "${YELLOW}   ⚠️  建议使用 ^~ 前缀确保优先级${NC}"
            fi
        else
            echo -e "${RED}   ❌ 未发现 /_next/static/ location 配置${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  未找到 Nginx 配置文件${NC}"
    echo "   请检查配置文件路径"
fi
echo ""

# 6. 测试 Nginx 配置
echo "6️⃣  测试 Nginx 配置语法..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx 配置语法正确${NC}"
else
    echo -e "${RED}❌ Nginx 配置语法错误${NC}"
    sudo nginx -t
fi
echo ""

# 7. 检查 Nginx 错误日志
echo "7️⃣  检查最近的 Nginx 错误日志..."
NGINX_ERROR_LOG="/www/wwwlogs/bz.a.gaopf.top.error.log"
if [ -f "$NGINX_ERROR_LOG" ]; then
    echo "   最近的错误:"
    tail -n 10 "$NGINX_ERROR_LOG" | grep -i "error\|404\|502" || echo "   未发现相关错误"
else
    echo -e "${YELLOW}⚠️  错误日志文件不存在: $NGINX_ERROR_LOG${NC}"
fi
echo ""

# 8. 测试通过 Nginx 访问
echo "8️⃣  测试通过 Nginx 访问静态文件..."
NGINX_TEST=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: bz.a.gaopf.top" http://localhost/_next/static/css/app.css 2>/dev/null)
if [ "$NGINX_TEST" = "200" ]; then
    echo -e "${GREEN}✅ 通过 Nginx 可以访问静态文件 (HTTP $NGINX_TEST)${NC}"
else
    echo -e "${RED}❌ 通过 Nginx 无法访问静态文件 (HTTP $NGINX_TEST)${NC}"
    echo "   这可能是配置问题"
fi
echo ""

# 9. 检查 .next 目录
echo "9️⃣  检查 Next.js 构建输出..."
if [ -d ".next" ]; then
    echo -e "${GREEN}✅ .next 目录存在${NC}"
    if [ -d ".next/static" ]; then
        echo -e "${GREEN}✅ .next/static 目录存在${NC}"
        STATIC_COUNT=$(find .next/static -type f 2>/dev/null | wc -l)
        echo "   静态文件数量: $STATIC_COUNT"
    else
        echo -e "${RED}❌ .next/static 目录不存在${NC}"
        echo "   请运行: pnpm build 或 npm run build"
    fi
else
    echo -e "${RED}❌ .next 目录不存在${NC}"
    echo "   请运行: pnpm build 或 npm run build"
fi
echo ""

# 总结
echo "================================"
echo "📋 诊断总结"
echo "================================"
echo ""
echo "如果所有检查都通过但仍有问题，请尝试："
echo "1. 重启 PM2: pm2 restart nextjs-jwt-app"
echo "2. 重载 Nginx: sudo nginx -s reload"
echo "3. 清除浏览器缓存"
echo "4. 检查浏览器控制台的完整错误信息"
echo ""
echo "查看详细日志："
echo "  PM2 日志: pm2 logs nextjs-jwt-app"
echo "  Nginx 错误日志: tail -f /www/wwwlogs/bz.a.gaopf.top.error.log"
echo "  Nginx 访问日志: tail -f /www/wwwlogs/bz.a.gaopf.top.log"
echo ""

