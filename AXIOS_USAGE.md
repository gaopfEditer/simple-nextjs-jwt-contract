# Axios 使用指南

## 概述

项目已配置 axios，并自动在请求头中添加 JWT token 进行验证。

## 配置说明

### 自动添加 Authorization Header

所有的 axios 请求都会自动添加 `Authorization: Bearer <token>` 头部：

```typescript
// 请求拦截器会自动从 Cookie 或 localStorage 获取 token
// 并添加到请求头中
axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 使用方法

### 1. 使用封装好的 API 函数（推荐）

```typescript
import { login, register, getCurrentUser, logout } from '@/lib/api';

// 登录（会自动保存 token）
const response = await login('user@example.com', 'password123');

// 注册（会自动保存 token）
const response = await register('user@example.com', 'password123');

// 获取当前用户（自动添加 Authorization header）
const user = await getCurrentUser();

// 登出（自动清除 token）
await logout();
```

### 2. 直接使用 axiosInstance

```typescript
import axiosInstance from '@/lib/axios';

// GET 请求（自动添加 Authorization header）
const response = await axiosInstance.get('/auth/me');
const user = response.data.user;

// POST 请求（自动添加 Authorization header）
const response = await axiosInstance.post('/user/update', {
  name: 'New Name',
});

// PUT 请求
const response = await axiosInstance.put('/user/1', {
  email: 'newemail@example.com',
});

// DELETE 请求
await axiosInstance.delete('/user/1');
```

### 3. 带配置的请求

```typescript
// 自定义 headers
const response = await axiosInstance.post('/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// 带超时设置
const response = await axiosInstance.get('/data', {
  timeout: 5000,
});

// 带上传进度
const response = await axiosInstance.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / (progressEvent.total || 1)
    );
    console.log(`上传进度: ${percentCompleted}%`);
  },
});
```

## 错误处理

### 自动处理 401 错误

当收到 401（未授权）错误时，axios 拦截器会自动：
1. 清除本地存储的 token
2. 跳转到登录页

```typescript
// 如果不希望自动跳转，可以捕获错误
try {
  const user = await getCurrentUser();
} catch (error) {
  if (error.response?.status === 401) {
    // Token 已过期或无效
    console.log('请重新登录');
  }
}
```

### 自定义错误处理

```typescript
try {
  const response = await axiosInstance.get('/some-endpoint');
  return response.data;
} catch (error: any) {
  if (error.response) {
    // 服务器返回了错误状态码
    console.error('错误状态码:', error.response.status);
    console.error('错误信息:', error.response.data);
    
    switch (error.response.status) {
      case 401:
        console.error('未授权，请登录');
        break;
      case 403:
        console.error('没有权限');
        break;
      case 404:
        console.error('资源不存在');
        break;
      case 500:
        console.error('服务器错误');
        break;
    }
  } else if (error.request) {
    // 请求已发送但没有收到响应
    console.error('网络错误');
  } else {
    // 请求配置错误
    console.error('请求错误:', error.message);
  }
  throw error;
}
```

## API 端点

### 基础路径

默认基础路径是 `/api`，所以：
- `axiosInstance.get('/auth/me')` → `GET /api/auth/me`
- `axiosInstance.post('/auth/login')` → `POST /api/auth/login`

### 自定义基础路径

在 `.env.local` 中设置：

```env
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Token 存储

Token 会同时存储在：
1. **Cookie**（用于服务端渲染）
2. **localStorage**（用于客户端）

优先级：Cookie > localStorage

## 示例代码

查看 `lib/api-example.ts` 文件了解更详细的使用示例。

