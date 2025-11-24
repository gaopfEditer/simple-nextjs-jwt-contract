# Token 调试指南

## 问题现象

- 另一个系统的正常 token 能正常工作
- 本系统的 token 返回错误数据：`{"code": 200, "data": "string", "message": "string"}`
- 本系统的 token 后面随便加一个值，反而能得到正确数据

## 可能的原因

### 1. Token 被截断

如果 token 在提取时被截断（比如 Cookie 值被截断，或 Authorization header 解析错误），会导致：
- 完整的 token 验证失败
- 但加了额外字符后，可能恰好让某些解析逻辑通过了

### 2. Authorization Header 格式问题

如果 `Authorization` header 的格式不正确，比如：
- 有额外的空白字符
- 有换行符
- Bearer 前缀后面的空格处理问题

### 3. Cookie 和 Authorization 优先级问题

代码优先从 Cookie 读取，如果 Cookie 中的 token 不完整，会使用不完整的 token。

## 调试方法

### 1. 查看服务器日志

在开发环境下，服务器会输出详细的 token 调试信息：

```
[Token] 来源: Authorization Bearer, 长度: 200, 预览: eyJhbGciOiJIUzI1NiI...
[JWT] Token 验证成功: { userId: 1, email: 'xxx@xxx.com' }
```

### 2. 检查 Token 格式

JWT token 应该有三部分，用点（`.`）分隔：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiMTI0MTk2MTI0NUBxcS5jb20iLCJpYXQiOjE3NjIxNDg1NjIsImV4cCI6MTc2Mjc1MzM2Mn0.HAuLHIsCA7mPkNkXPVBgbNVVHce4k3sSbSK_pllLeGY
   [Header]                                    [Payload]                                    [Signature]
```

### 3. 测试 Token 提取

可以在浏览器控制台测试：

```javascript
// 查看当前存储的 token
const token = document.cookie.match(/token=([^;]+)/)?.[1] || localStorage.getItem('token');
console.log('Token 长度:', token?.length);
console.log('Token 部分数:', token?.split('.').length); // 应该是 3

// 手动测试 API 调用
fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json()).then(console.log);
```

## 解决方案

代码已更新，改进包括：

1. **优先使用 Authorization header**：与另一个系统保持一致
2. **清理空白字符**：移除 token 前后的空白
3. **验证 token 格式**：确保是有效的 JWT 格式（三部分）
4. **详细调试日志**：在开发环境输出详细信息

## 验证步骤

1. 登录后，检查浏览器 Network 面板中的请求头：
   ```
   Authorization: Bearer <完整的token>
   ```

2. 检查服务器日志中的 token 信息

3. 如果 token 被截断，检查：
   - Cookie 的大小限制
   - Authorization header 的解析逻辑
   - 是否有其他地方修改了 token

