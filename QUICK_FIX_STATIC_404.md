# 快速修复静态资源 404 问题

## 🔴 问题现象

访问网站时，CSS 和 JS 文件返回 404：
```
GET https://bz.a.gaopf.top/_next/static/css/0dc348ae691a14b9.css net::ERR_ABORTED 404 (Not Found)
```

## ✅ 快速修复步骤

### 步骤 1: 运行诊断脚本

```bash
chmod +x diagnose-static-files.sh
./diagnose-static-files.sh
```

### 步骤 2: 检查 PM2 服务

```bash
# 检查服务状态
pm2 status

# 如果服务未运行，启动服务
pm2 start ecosystem.config.js --env production

# 查看日志
pm2 logs nextjs-jwt-app --lines 50
```

### 步骤 3: 测试后端服务

```bash
# 直接访问后端，测试静态文件
curl -I http://localhost:3000/_next/static/css/app.css

# 如果返回 404，说明后端服务有问题
# 如果返回 200，说明后端正常，问题在 Nginx 配置
```

### 步骤 4: 更新 Nginx 配置

**关键修改**：使用最新的 `nginx-baota.conf` 配置，特别注意：

1. **使用 `^~` 前缀**确保 `/_next/static/` 优先匹配：
   ```nginx
   location ^~ /_next/static/ {
       proxy_pass http://nextjs_backend;
       # ... 其他配置
   }
   ```

2. **删除或注释掉 root 设置**

3. **移除可能冲突的正则 location**（如 `location ~ .*\.(js|css)?$`）

### 步骤 5: 重载配置

```bash
# 测试配置
sudo nginx -t

# 重载配置
sudo nginx -s reload
# 或在宝塔面板中点击"重载配置"
```

### 步骤 6: 清除缓存

```bash
# 清除浏览器缓存（硬刷新：Ctrl+Shift+R 或 Cmd+Shift+R）
# 或使用无痕模式测试
```

## 🔍 详细排查

### 问题 1: PM2 服务未运行

**症状**：所有请求都返回 502 或连接失败

**解决**：
```bash
pm2 start ecosystem.config.js --env production
pm2 save
```

### 问题 2: 后端服务无法访问静态文件

**症状**：直接访问 `http://localhost:3000/_next/static/...` 也返回 404

**可能原因**：
- Next.js 未正确构建
- `.next` 目录不存在或权限问题

**解决**：
```bash
# 重新构建
pnpm build
# 或
npm run build

# 检查构建输出
ls -la .next/static/
```

### 问题 3: Nginx 配置问题

**症状**：直接访问后端正常，但通过 Nginx 访问返回 404

**检查点**：

1. **确认 upstream 配置存在**：
   ```nginx
   upstream nextjs_backend {
       server 127.0.0.1:3000;
   }
   ```

2. **确认 location 优先级**：
   ```nginx
   # 必须使用 ^~ 前缀
   location ^~ /_next/static/ {
       proxy_pass http://nextjs_backend;
       # ...
   }
   ```

3. **确认没有冲突的 root 设置**：
   ```nginx
   # 应该注释掉或删除
   # root /www/wwwroot/...;
   ```

4. **检查 Nginx 错误日志**：
   ```bash
   tail -f /www/wwwlogs/bz.a.gaopf.top.error.log
   ```

### 问题 4: 路径不匹配

**症状**：静态文件路径与实际不匹配

**检查**：
```bash
# 查看页面源码，找到实际的静态文件路径
curl -s https://bz.a.gaopf.top | grep -oP 'href="[^"]*\.css[^"]*"'

# 测试该路径
curl -I https://bz.a.gaopf.top/_next/static/css/0dc348ae691a14b9.css
```

## 📝 完整配置检查清单

- [ ] PM2 服务正在运行
- [ ] 后端服务监听在 3000 端口
- [ ] 直接访问 `http://localhost:3000` 正常
- [ ] `.next/static` 目录存在且有文件
- [ ] Nginx 配置中有 `upstream nextjs_backend`
- [ ] Nginx 配置中 `location ^~ /_next/static/` 使用 `^~` 前缀
- [ ] Nginx 配置中没有冲突的 `root` 设置
- [ ] Nginx 配置语法正确（`nginx -t` 通过）
- [ ] Nginx 已重载配置

## 🚀 一键修复脚本

如果诊断脚本发现问题，可以尝试：

```bash
# 1. 重启 PM2
pm2 restart nextjs-jwt-app

# 2. 重载 Nginx
sudo nginx -s reload

# 3. 清除浏览器缓存并测试
```

## 📞 如果问题仍然存在

1. **查看完整错误信息**：
   ```bash
   # PM2 日志
   pm2 logs nextjs-jwt-app --err --lines 100
   
   # Nginx 错误日志
   tail -100 /www/wwwlogs/bz.a.gaopf.top.error.log
   
   # Nginx 访问日志
   tail -100 /www/wwwlogs/bz.a.gaopf.top.log | grep "_next/static"
   ```

2. **检查浏览器网络面板**：
   - 打开开发者工具 (F12)
   - 查看 Network 标签
   - 检查失败的请求的完整 URL、状态码、响应头

3. **对比配置**：
   - 使用 `nginx-baota.conf` 作为参考
   - 确保所有关键配置都已应用

## 💡 常见错误

### 错误 1: 忘记使用 `^~` 前缀

```nginx
# ❌ 错误：可能被正则 location 匹配
location /_next/static/ {
    ...
}

# ✅ 正确：使用 ^~ 确保优先级
location ^~ /_next/static/ {
    ...
}
```

### 错误 2: 正则 location 优先级过高

```nginx
# ❌ 错误：这个会优先匹配 CSS 文件
location ~ .*\.(js|css)?$ {
    proxy_pass http://nextjs_backend;
    # 可能缺少必要的代理头
}

# ✅ 正确：删除或确保 /_next/static/ 使用 ^~ 前缀
```

### 错误 3: root 设置冲突

```nginx
# ❌ 错误：会导致 Nginx 从文件系统读取
root /www/wwwroot/.../.next/static;

# ✅ 正确：注释掉或删除
# root /www/wwwroot/.../.next/static;
```

