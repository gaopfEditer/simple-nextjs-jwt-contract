# 数据库设置说明

## 1. 创建数据库

```sql
CREATE DATABASE nextjs_jwt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 2. 执行建表语句

在 MySQL 中执行 `schema.sql` 文件中的建表语句：

```bash
mysql -u root -p nextjs_jwt < database/schema.sql
```

或者直接在 MySQL 客户端中执行：

```sql
USE nextjs_jwt;
SOURCE database/schema.sql;
```

## 3. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nextjs_jwt
JWT_SECRET=your-secret-key-change-in-production
```

## 4. 验证数据库连接

确保 MySQL 服务已启动，并且数据库和表都已创建。

## 常见错误

1. **数据库连接失败**: 检查 MySQL 服务是否启动
2. **表不存在**: 执行 `schema.sql` 建表语句
3. **权限错误**: 检查数据库用户权限
4. **密码错误**: 检查 `.env.local` 中的 `DB_PASSWORD`

