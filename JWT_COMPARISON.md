# JWT Token 对比说明

## 为什么相同的 secret 和用户会生成不同的 token？

即使使用相同的 `JWT_SECRET` 和相同的用户信息，每次登录生成的 token **都是不同的**，这是**正常行为**。

### 原因

JWT token 包含以下部分：

1. **Header（头部）**
   - 算法类型（如 `HS256`）
   - Token 类型（`JWT`）

2. **Payload（载荷）**
   - 用户信息（`userId`, `email`）
   - **`iat`（issued at）**：Token 签发时间戳（每次都会变化）
   - **`exp`（expiration）**：Token 过期时间戳（基于 `iat` 计算，每次都会变化）

3. **Signature（签名）**
   - 使用 secret 对 header 和 payload 的签名

### 示例

**第一次登录（2024-01-01 10:00:00）**：
```json
{
  "userId": 1,
  "email": "1241961245@qq.com",
  "iat": 1704096000,  // 2024-01-01 10:00:00
  "exp": 1704700800   // 2024-01-08 10:00:00 (7天后)
}
```

**第二次登录（2024-01-01 10:00:01）**：
```json
{
  "userId": 1,
  "email": "1241961245@qq.com",
  "iat": 1704096001,  // 2024-01-01 10:00:01 (多了1秒)
  "exp": 1704700801   // 2024-01-08 10:00:01 (7天后)
}
```

即使只差1秒，生成的 token 也会完全不同。

## 如何让两个系统生成相同的 token？

如果需要在两个系统之间生成**完全相同**的 token（用于共享认证），需要：

### 方法 1：固定时间戳（仅用于测试）

```typescript
import jwt from 'jsonwebtoken';

const fixedTime = Math.floor(Date.now() / 1000); // 固定时间戳

const token = jwt.sign(
  {
    userId: 1,
    email: '1241961245@qq.com',
    iat: fixedTime,  // 固定签发时间
  },
  JWT_SECRET,
  {
    expiresIn: '7d',
  }
);
```

### 方法 2：确保 Payload 结构一致

检查两个系统的 Payload 结构是否一致：

**当前系统**：
```typescript
{
  userId: number,
  email: string
}
```

**另一个系统可能是**：
```typescript
{
  userID: number,     // 注意：ID 大写
  email: string
}
```

或：
```typescript
{
  id: number,
  email: string,
  name?: string  // 可能还有其他字段
}
```

### 方法 3：统一配置

确保两个系统使用：
- ✅ 相同的 `JWT_SECRET`
- ✅ 相同的算法（通常是 `HS256`）
- ✅ 相同的过期时间设置
- ✅ 相同的 Payload 字段名和结构

## 测试工具

运行测试脚本查看当前系统的 token 结构：

```bash
node scripts/test-jwt.js
```

这会显示：
- Token 的完整结构
- Payload 内容
- 签发时间和过期时间
- 验证结果

## 常见问题

### Q: 为什么不同系统生成的 token 不同？
A: 因为 `iat`（签发时间）每次都会更新，导致 token 不同。这是 JWT 的正常行为。

### Q: 我需要在两个系统之间共享认证，怎么办？
A: 
1. 确保两个系统使用相同的 `JWT_SECRET`
2. 确保 Payload 结构一致
3. 在一个系统验证另一个系统生成的 token 时，token 可能不同但能验证通过

### Q: 如何验证另一个系统的 token？
A: 只要使用相同的 `JWT_SECRET`，即使 token 不同，也能验证通过：

```typescript
import { verifyToken } from '@/lib/jwt';

const isValid = verifyToken(tokenFromOtherSystem); // 返回 payload 或 null
```

## 总结

**Token 不同是正常的**，关键是：
- ✅ 确保使用相同的 secret
- ✅ 确保 Payload 结构兼容
- ✅ 验证时能正确解析和验证 token

如果需要完全相同，需要固定时间戳（不推荐在生产环境使用）。

