# 修复 MySQL 认证错误

## 问题
`Access denied for user 'root'@'localhost' (using password: YES)`

## 原因
通常是 MySQL 8.0+ 的认证插件问题。MySQL 8.0+ 默认使用 `caching_sha2_password`，而旧的客户端可能不支持。

## 解决方案

### 方案 1：修改 MySQL 用户认证插件（推荐）

在 MySQL 中执行以下命令：

```sql
-- 登录 MySQL（使用你确认正确的密码）
mysql -h localhost -P 3388 -u root -p

-- 修改 root 用户的认证插件
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;

-- 如果还需要支持远程连接，也修改 % 用户
ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;
```

**重要：** 将 `'你的密码'` 替换为 `.env.local` 中 `DB_PASSWORD` 的实际值。

### 方案 2：验证密码是否正确

在命令行测试连接：

```bash
mysql -h localhost -P 3388 -u root -p
```

如果命令行可以连接，说明密码是对的，问题可能是认证插件。

### 方案 3：创建新用户（如果 root 用户有问题）

```sql
-- 创建新用户
CREATE USER 'nextjs_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'secure_password';
GRANT ALL PRIVILEGES ON nextjs_jwt.* TO 'nextjs_user'@'localhost';
FLUSH PRIVILEGES;
```

然后在 `.env.local` 中更新：

```env
DB_USER=nextjs_user
DB_PASSWORD=secure_password
```

### 方案 4：检查 MySQL 版本和认证插件

```sql
-- 查看 MySQL 版本
SELECT VERSION();

-- 查看当前用户的认证插件
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';
```

如果 `plugin` 列显示 `caching_sha2_password`，需要使用方案 1 修改。

## 验证修复

修复后，重启 Next.js 开发服务器：

```bash
# 停止服务器 (Ctrl+C)
# 重新启动
pnpm run dev
```

然后尝试注册用户，应该可以看到：

```
数据库连接池创建成功
```

而不是：

```
数据库连接测试失败
```

## 仍然不行？

1. 确认密码中是否包含特殊字符需要转义
2. 确认 MySQL 服务正在运行
3. 尝试用 MySQL Workbench 或命令行工具连接，确认密码正确
4. 检查 MySQL 日志文件查看详细错误信息

