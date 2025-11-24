// 客户端 API 调用工具函数（使用 axios）

import axiosInstance from './axios';
import { setToken, removeToken } from './auth';

export interface User {
  id: number;
  email: string;
  is_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  refreshToken?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  token: string;
}

// 登录
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await axiosInstance.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // 保存 token
    if (response.data.token) {
      setToken(response.data.token);
    }

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '登录失败';
    throw new Error(errorMessage);
  }
}

// 注册
export async function register(
  email: string,
  password: string
): Promise<RegisterResponse> {
  try {
    const response = await axiosInstance.post<RegisterResponse>('/auth/register', {
      email,
      password,
    });

    // 保存 token
    if (response.data.token) {
      setToken(response.data.token);
    }

    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '注册失败';
    throw new Error(errorMessage);
  }
}

// 获取当前用户信息（会自动添加 Authorization header）
export async function getCurrentUser(): Promise<User> {
  try {
    const response = await axiosInstance.get<{ user: User }>('/auth/me');
    return response.data.user;
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '获取用户信息失败';
    throw new Error(errorMessage);
  }
}

// 登出
export async function logout(): Promise<void> {
  try {
    await axiosInstance.post('/auth/logout');
    // 清除本地 token
    removeToken();
  } catch (error: any) {
    // 即使请求失败，也清除本地 token
    removeToken();
    throw new Error(error.response?.data?.message || error.message || '登出失败');
  }
}

