# JWT 配置说明

## 与另一个系统保持一致的配置

根据您提供的配置，需要在 `.env.local` 文件中设置：

```env
# Access Token 配置（用于常规请求）
JWT_ACCESS_SECRET=Zrs.abR)C7+JYw%|8PS&;hh8+Mdj3+-8m9ixI5lx,5q#%jJlP45o1TY6kNeyXCT/
JWT_ACCESS_EXPIRE=7200

# Refresh Token 配置（用于刷新 access token）
JWT_REFRESH_SECRET=_jl.Z*qrn]]fu_r&ntXVFEcJ4-?KOA3OU9s"Lb06M,YE,xF](I/>g='iD*_C{77O
JWT_REFRESH_EXPIRE=86400

# Issuer（签发者）
JWT_ISSUER=sni
```

## 重要说明

### ⚠️ Token 字符串不会完全相同

**即使配置完全一致，同一个用户使用相同密码登录时，生成的 token 字符串也**不会完全相同**。**

### 原因

JWT token 包含 `iat`（issued at，签发时间戳），这是**当前时间**，每次登录都会不同。例如：

- **第一次登录**（10:00:00）：
  ```json
  {
    "userId": 1,
    "email": "1241961245@qq.com",
    "iat": 1704096000,
    "exp": 1704103200
  }
  ```

- **第二次登录**（10:00:01）：
  ```json
  {
    "userId": 1,
    "email": "1241961245@qq.com",
    "iat": 1704096001,  // 多了1秒
    "exp": 1704103201   // 过期时间也相应变化
  }
  ```

即使只差 1 秒，生成的 token 字符串也会完全不同。

### ✅ 但是可以互相验证

虽然 token 字符串不同，但只要：
- ✅ 使用相同的 secret
- ✅ 使用相同的 issuer
- ✅ 使用相同的 payload 结构
- ✅ Token 未过期

**两个系统可以互相验证对方的 token！**

## 配置完成后

1. 更新 `.env.local` 文件
2. 重启开发服务器
3. 登录后，两个系统可以使用相同的 secret 验证彼此的 token

## 如果需要完全相同的 token（仅用于测试）

如果必须在同一时间生成完全相同的 token，可以固定时间戳：

```typescript
const fixedTime = Math.floor(Date.now() / 1000);
const token = generateToken({
  userId: 1,
  email: '1241961245@qq.com',
}, {
  // 但这需要在同一秒内生成，不推荐在生产环境使用
});
```

## 验证测试

运行测试脚本查看 token 结构：

```bash
node scripts/test-jwt.js
```

