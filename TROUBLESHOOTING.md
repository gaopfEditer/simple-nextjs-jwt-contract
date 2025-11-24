# 数据库连接问题排查指南

## 错误: Access denied for user 'root'@'localhost' (using password: YES)

这个错误通常表示数据库用户名或密码不正确，或者 MySQL 认证插件配置问题。

## 解决方案

### 1. 检查 `.env.local` 文件

确保在项目根目录有 `.env.local` 文件，格式如下：

```env
DB_HOST=localhost
DB_PORT=3388
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=nextjs_jwt
JWT_SECRET=your-secret-key
```

**重要提示：**
- 密码中如果包含特殊字符（如 `@`, `#`, `$`, `%` 等），不需要引号，直接写即可
- 如果密码中包含引号，需要用转义字符
- 不要在 `=` 两边加空格：`DB_PASSWORD=password` ✅ 而不是 `DB_PASSWORD = password` ❌

### 2. 验证环境变量是否加载

重启开发服务器后，检查控制台输出：

```
数据库配置: { host: 'localhost', port: 3388, user: 'root', database: 'nextjs_jwt' }
passwordSet: true
passwordLength: X
```

如果 `passwordSet: false` 或 `passwordLength: 0`，说明环境变量没有加载。

### 3. MySQL 8.0+ 认证插件问题

如果使用的是 MySQL 8.0 或更高版本，默认使用 `caching_sha2_password` 认证插件，可能导致连接问题。

**解决方案 A：修改用户认证插件**

在 MySQL 中执行：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

**解决方案 B：使用新的认证插件（推荐）**

确保 MySQL 客户端和服务器都支持 `caching_sha2_password`，并且密码正确。

### 4. 测试数据库连接

运行测试脚本：

```bash
# 首先安装 dotenv（如果还没安装）
pnpm add dotenv

# 运行测试脚本
node scripts/test-db-connection.js
```

### 5. 检查 MySQL 用户权限

确保用户有足够的权限：

```sql
-- 检查用户是否存在
SELECT user, host FROM mysql.user WHERE user = 'root';

-- 检查用户权限
SHOW GRANTS FOR 'root'@'localhost';

-- 如果需要，重新设置密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
FLUSH PRIVILEGES;
```

### 6. 常见密码问题

如果密码包含特殊字符：

```env
# 密码: P@ssw0rd#
DB_PASSWORD=P@ssw0rd#

# 密码: my'password
DB_PASSWORD=my'password

# 密码包含引号
DB_PASSWORD='my"password'
```

### 7. 重启 Next.js 开发服务器

修改 `.env.local` 后，**必须重启开发服务器**才能生效：

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
pnpm run dev
```

### 8. 使用连接字符串（备选方案）

如果以上方法都不行，可以尝试使用连接字符串：

在 `.env.local` 中：

```env
DATABASE_URL=mysql://root:your_password@localhost:3388/nextjs_jwt
```

然后在代码中解析连接字符串。

## 验证步骤

1. ✅ 确认 `.env.local` 文件存在且格式正确
2. ✅ 确认密码正确（可以用 MySQL 客户端测试）
3. ✅ 确认数据库服务正在运行
4. ✅ 确认用户有访问权限
5. ✅ 重启开发服务器
6. ✅ 查看控制台的数据库配置输出
7. ✅ 运行测试脚本验证连接

## 如果还是不行

1. 尝试使用 MySQL 命令行客户端测试：

```bash
mysql -h localhost -P 3388 -u root -p
```

如果能用命令行连接，说明配置是对的，问题可能在代码中。

2. 检查 MySQL 日志：

```bash
# Windows
# 查看 MySQL 错误日志位置
# 通常在 MySQL 安装目录的 data 文件夹中
```

3. 尝试创建一个新的数据库用户专门用于此项目：

```sql
CREATE USER 'nextjs_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON nextjs_jwt.* TO 'nextjs_user'@'localhost';
FLUSH PRIVILEGES;
```

然后在 `.env.local` 中使用新用户。

