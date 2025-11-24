// 外部系统 API 客户端（调用另一个系统的接口）

import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';

// 创建外部系统的 axios 实例
const externalApiInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_EXTERNAL_API_URL || 'http://localhost:5173',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Language': '1',
  },
});

// 请求拦截器 - 自动添加另一个系统的 token
externalApiInstance.interceptors.request.use(
  (config) => {
    // 从 Cookie 或 localStorage 获取另一个系统的 token（参考 axios.ts）
    const token = Cookies.get('token') || 
                  (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    // 如果存在 token，添加到请求头的 Authorization
    if (token && config.headers) {
      // 清理 token（移除可能的空白字符）
      const cleanToken = token.trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
      
      // 调试日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        console.log('[External API] 添加 Authorization header:', {
          tokenLength: cleanToken.length,
          tokenPreview: cleanToken.substring(0, 30) + '...',
          tokenParts: cleanToken.split('.').length, // JWT 应该有 3 部分
        });
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
externalApiInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理错误
    return Promise.reject(error);
  }
);

// 接口类型定义
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T = any> {
  total: number;
  page: number;
  page_size: number;
  list: T[];
}

export interface Post {
  id: number;
  code: string;
  product_type: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  code: string;
  product_type: string;
  product_name: string;
  created_at: string;
  updated_at: string;
}

// 获取帖子列表
export async function getPostList(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Post>> {
  try {
    const response = await externalApiInstance.get<ApiResponse<PaginatedResponse<Post>>>('/activate/post/list', {
      params: {
        page,
        page_size: pageSize,
      },
    });
    
    // 检查响应格式
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '获取帖子列表失败');
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[External API] 获取帖子列表失败:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw new Error(error.response?.data?.message || error.message || '获取帖子列表失败');
  }
}

// 获取产品列表
export async function getProductList(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Product>> {
  try {
    const response = await externalApiInstance.get<ApiResponse<PaginatedResponse<Product>>>('/activate/product/list', {
      params: {
        page,
        page_size: pageSize,
      },
    });
    
    // 检查响应格式
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || '获取产品列表失败');
    }
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[External API] 获取产品列表失败:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw new Error(error.response?.data?.message || error.message || '获取产品列表失败');
  }
}

export default externalApiInstance;

