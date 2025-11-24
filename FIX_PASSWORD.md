# 修复密码问题

## 问题原因

你的密码是 `Cambridge#*DR`，但在 `.env.local` 文件中，`#` 符号被当作**注释符号**！

所以：
```
DB_PASSWORD=Cambridge#*DR
```

会被解析为：
```
DB_PASSWORD=Cambridge  # 后面的 #*DR 被当作注释忽略了！
```

这就是为什么密码长度从 13 变成了 9！

## 解决方案

在 `.env.local` 文件中，用**双引号**包裹密码：

```env
DB_PASSWORD="Cambridge#*DR"
```

或者使用**单引号**（在某些情况下）：

```env
DB_PASSWORD='Cambridge#*DR'
```

## 完整示例

你的 `.env.local` 文件应该这样写：

```env
DB_HOST=localhost
DB_PORT=3388
DB_USER=root
DB_PASSWORD="Cambridge#*DR"
DB_NAME=nextjs_jwt
JWT_SECRET=your-secret-key-change-in-production
```

## 修改后的步骤

1. 修改 `.env.local` 文件，给密码加引号
2. **完全重启** Next.js 开发服务器（Ctrl+C 停止，然后重新启动）
3. 再次尝试注册/登录

## 验证

修改后运行诊断工具验证：

```bash
node scripts/diagnose.js
```

应该看到密码长度正确（13），并且连接成功！

