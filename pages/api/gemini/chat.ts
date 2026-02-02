import type { NextApiRequest, NextApiResponse } from 'next';
import aiClient from '@/lib/aiClient';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, imageData, mimeType } = req.body;

    if (!message && !imageData) {
      return res.status(400).json({ error: '消息或图片不能为空' });
    }

    // 验证图片数据格式
    if (imageData) {
      if (!mimeType) {
        return res.status(400).json({ error: '图片 MIME 类型不能为空' });
      }
      
      // 确保图片数据是有效的 Base64 字符串
      if (typeof imageData !== 'string' || imageData.trim().length === 0) {
        return res.status(400).json({ error: '图片数据格式无效' });
      }
      
      // 移除可能的 data:image/...;base64, 前缀（如果存在）
      let cleanImageData = imageData.trim();
      if (cleanImageData.includes(',')) {
        cleanImageData = cleanImageData.split(',')[1];
      }
      
      console.log('处理图片请求:', {
        hasMessage: !!message,
        imageDataLength: cleanImageData.length,
        mimeType,
      });

      // 使用统一的 AI 客户端工具类
      // 模型版本从环境变量读取，如果没有配置则使用默认值
      const model = process.env.GEMINI_MODEL;
      const text = await aiClient.generateContent(
        message || '请分析这张图片',
        cleanImageData,
        mimeType,
        model
      );

      return res.status(200).json({ text });
    } else {
      // 纯文本请求
      // 模型版本从环境变量读取，如果没有配置则使用默认值
      const model = process.env.GEMINI_MODEL;
      const text = await aiClient.generateContent(
        message,
        undefined,
        undefined,
        model
      );

      return res.status(200).json({ text });
    }
  } catch (error: any) {
    console.error('Gemini API 错误:', error);
    return res.status(500).json({ 
      error: error.message || '处理请求时发生错误' 
    });
  }
}

