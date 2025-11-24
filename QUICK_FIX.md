# 快速修复指南

## 当前问题
`Access denied for user 'root'@'localhost' (using password: YES)`

## 最快解决方法

### 步骤 1: 验证密码是否正确

编辑 `scripts/test-mysql-direct.js`，在 `password: ''` 中填入你的实际密码，然后运行：

```bash
node scripts/test-mysql-direct.js
```

**如果这个脚本能连接成功，说明密码是对的，问题在 Next.js 的环境变量加载。**

**如果这个脚本也连接失败，说明密码或用户配置有问题。**

### 步骤 2A: 如果脚本能连接（密码正确，但 Next.js 不能用）

检查 `.env.local` 文件：

1. **确保文件在项目根目录**
2. **检查格式，不要有空格：**

```env
DB_HOST=localhost
DB_PORT=3388
DB_USER=root
DB_PASSWORD=你的实际密码（不要加引号）
DB_NAME=nextjs_jwt
JWT_SECRET=your-secret-key
```

3. **如果密码包含特殊字符**，可能需要：
   - 不要用引号包裹密码
   - 特殊字符直接写（如 `P@ssw0rd#`）
   - 如果包含单引号或双引号，可能需要转义

4. **完全重启开发服务器**：
   ```bash
   # 停止服务器 (Ctrl+C)
   pnpm run dev
   ```

### 步骤 2B: 如果脚本也不能连接（密码或用户有问题）

在 MySQL 中执行：

```sql
-- 1. 登录 MySQL（使用你能登录的密码）
mysql -h localhost -P 3388 -u root -p

-- 2. 查看当前用户的认证方式
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';

-- 3. 如果 plugin 是 caching_sha2_password，改为 mysql_native_password
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;

-- 4. 验证修改
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';
```

**或者创建一个新用户**（更安全）：

```sql
-- 创建新用户
CREATE USER 'nextjs_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'secure_password123';
GRANT ALL PRIVILEGES ON nextjs_jwt.* TO 'nextjs_user'@'localhost';
FLUSH PRIVILEGES;
```

然后在 `.env.local` 中更新：

```env
DB_USER=nextjs_user
DB_PASSWORD=secure_password123
```

### 步骤 3: 确认数据库和表已创建

```sql
-- 检查数据库是否存在
SHOW DATABASES LIKE 'nextjs_jwt';

-- 如果不存在，创建它
CREATE DATABASE nextjs_jwt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nextjs_jwt;

-- 执行建表语句
SOURCE database/schema.sql;
```

## 验证修复

修复后：

1. 运行测试脚本：`node scripts/test-mysql-direct.js` - 应该成功
2. 重启 Next.js：`pnpm run dev` - 应该看到 "数据库连接池创建成功"
3. 尝试注册用户 - 应该成功

## 如果还是不行

请告诉我：
1. `node scripts/test-mysql-direct.js` 的输出结果
2. MySQL 版本：`SELECT VERSION();`
3. root 用户的认证插件：`SELECT plugin FROM mysql.user WHERE user = 'root' AND host = 'localhost';`

