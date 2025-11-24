import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// 创建 axios 实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api', // API 基础路径
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 Cookie 或 localStorage 获取 token
    const token = Cookies.get('token') || 
                  (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    // 如果存在 token，添加到请求头的 Authorization
    if (token && config.headers) {
      // 清理 token（移除可能的空白字符）
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      
      // 调试日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[Axios] 添加 Authorization header:', {
          tokenLength: cleanToken.length,
          tokenPreview: cleanToken.substring(0, 30) + '...',
          tokenParts: cleanToken.split('.').length, // JWT 应该有 3 部分
        });
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误和 token 过期
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 如果是 401 错误（未授权），可能是 token 过期
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // 清除本地存储的 token
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // 跳转到登录页
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

