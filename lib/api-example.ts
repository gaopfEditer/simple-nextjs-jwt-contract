// axios API 使用示例

import axiosInstance from './axios';

/**
 * 示例：如何在前端使用 axios 调用 API
 */

// 1. 基本的 GET 请求（会自动添加 Authorization header）
export async function fetchUserData() {
  try {
    const response = await axiosInstance.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('获取用户数据失败:', error);
    throw error;
  }
}

// 2. POST 请求（会自动添加 Authorization header）
export async function updateUserData(data: any) {
  try {
    const response = await axiosInstance.post('/user/update', data);
    return response.data;
  } catch (error) {
    console.error('更新用户数据失败:', error);
    throw error;
  }
}

// 3. 带自定义配置的请求
export async function uploadFile(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        console.log(`上传进度: ${percentCompleted}%`);
      },
    });
    return response.data;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
}

// 4. 处理错误响应
export async function safeApiCall() {
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
          // 未授权，token 可能过期
          console.error('请重新登录');
          break;
        case 403:
          // 禁止访问
          console.error('没有权限访问');
          break;
        case 404:
          // 未找到
          console.error('资源不存在');
          break;
        case 500:
          // 服务器错误
          console.error('服务器错误');
          break;
        default:
          console.error('未知错误');
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('网络错误，请检查网络连接');
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message);
    }
    throw error;
  }
}

