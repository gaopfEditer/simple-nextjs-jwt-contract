# Next.js JWT 认证系统

这是一个使用 Next.js 和 JWT（JSON Web Token）实现的用户认证系统示例项目。

## 功能特性

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT Token 认证
- ✅ 受保护的路由（仪表板）
- ✅ 自动登录状态检查
- ✅ 用户登出
- ✅ 密码加密存储（bcrypt）

## 技术栈

- **框架**: Next.js 14
- **语言**: TypeScript
- **数据库**: MySQL
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **样式**: CSS Modules

## 项目结构

```
simple-nextjs-jwt/
├── pages/
│   ├── api/
│   │   └── auth/
│   │       ├── login.ts      # 登录 API
│   │       ├── register.ts   # 注册 API
│   │       ├── me.ts         # 获取当前用户 API
│   │       └── logout.ts     # 登出 API
│   ├── index.tsx             # 首页
│   ├── login.tsx             # 登录页面
│   ├── register.tsx          # 注册页面
│   ├── dashboard.tsx         # 受保护的仪表板页面
│   └── _app.tsx              # Next.js App 组件
├── lib/
│   ├── jwt.ts                # JWT 工具函数
│   ├── db.ts                 # 数据库操作层（MySQL）
│   ├── db-connection.ts      # 数据库连接配置
│   ├── auth.ts               # 认证工具函数
│   └── api.ts                # 客户端 API 调用
├── database/
│   └── schema.sql            # MySQL 建表语句
├── styles/
│   ├── globals.css           # 全局样式
│   ├── Home.module.css       # 首页样式
│   ├── Auth.module.css       # 登录/注册页面样式
│   └── Dashboard.module.css  # 仪表板样式
└── package.json
```

## 快速开始

### 1. 创建 MySQL 数据库

首先创建数据库并执行建表语句：

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE nextjs_jwt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 使用数据库
USE nextjs_jwt;

# 执行建表语句（查看 database/schema.sql 文件）
SOURCE database/schema.sql;
```

或者直接执行 SQL 文件：

```bash
mysql -u root -p nextjs_jwt < database/schema.sql
```

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=nextjs_jwt

# JWT 密钥（生产环境必须更改）
JWT_SECRET=your-secret-key-change-in-production
```

### 3. 安装依赖

```bash
npm install
```

### 4. 运行开发服务器

```bash
npm run dev
```

### 5. 打开浏览器

访问 [http://localhost:3000](http://localhost:3000)

## 使用说明

### 注册新用户

1. 访问 `/register` 页面
2. 填写邮箱和密码（至少 6 位）
3. 点击注册按钮
4. 注册成功后自动跳转到仪表板

### 用户登录

1. 访问 `/login` 页面
2. 输入邮箱和密码
3. 点击登录按钮
4. 登录成功后自动跳转到仪表板

### 访问受保护的页面

- `/dashboard` 页面需要登录才能访问
- 未登录用户访问会自动跳转到登录页面
- Token 存储在 Cookie 中，有效期 7 天

### 登出

在仪表板页面点击"登出"按钮即可退出登录。

## API 端点

### POST /api/auth/register
注册新用户

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应:**
```json
{
  "message": "注册成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "is_enabled": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "JWT_TOKEN"
}
```

### POST /api/auth/login
用户登录

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应:**
```json
{
  "message": "登录成功",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "is_enabled": true,
    "last_login_at": "2024-01-01T00:00:00.000Z"
  },
  "token": "JWT_TOKEN"
}
```

### GET /api/auth/me
获取当前登录用户信息

**需要认证**: 是（通过 Cookie 或 Authorization Header）

**响应:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "is_enabled": true,
    "last_login_at": "2024-01-01T00:00:00.000Z",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /api/auth/logout
用户登出

**响应:**
```json
{
  "message": "登出成功"
}
```

## 数据库表结构

用户表 (`users`) 包含以下字段：

- `id` (INT UNSIGNED): 用户ID，自增主键
- `email` (VARCHAR(255)): 邮箱，唯一索引
- `password` (VARCHAR(255)): 加密后的密码
- `is_enabled` (TINYINT(1)): 用户是否启用，默认 true
- `last_login_at` (DATETIME): 最后登录时间，可为空
- `created_at` (DATETIME): 创建时间，自动设置
- `updated_at` (DATETIME): 更新时间，自动更新

## 注意事项

⚠️ **生产环境注意事项:**

1. **更换 JWT_SECRET**: 使用强随机字符串，不要使用默认值
2. **数据库安全**: 
   - 使用强密码
   - 限制数据库访问权限
   - 使用 SSL 连接（如果支持）
   - 定期备份数据库
3. **HTTPS**: 生产环境必须使用 HTTPS
4. **Token 刷新**: 考虑实现 Token 刷新机制
5. **密码策略**: 可以添加更强的密码验证规则
6. **速率限制**: 添加 API 速率限制防止暴力破解
7. **连接池配置**: 根据实际负载调整数据库连接池大小

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

## 许可证

MIT

