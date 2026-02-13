import type { NextApiRequest, NextApiResponse } from 'next';

// Telegram Bot API 类型定义
interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

// 使用 axios 发送请求（备用方案）
async function sendWithAxios(url: string, data: any, proxyUrl?: string) {
  const axios = require('axios');
  const { HttpsProxyAgent } = require('https-proxy-agent');

  const axiosConfig: any = {
    method: 'POST',
    url: url,
    headers: {
      'Content-Type': 'application/json',
    },
    data: data,
    timeout: 30000, // 30 秒超时
  };

  // 如果配置了代理，使用 https-proxy-agent
  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    axiosConfig.httpsAgent = agent;
    axiosConfig.httpAgent = agent;
    console.log('[Telegram] ✅ 已配置 axios 代理');
  }

  const response = await axios(axiosConfig);
  return {
    ok: response.status === 200,
    status: response.status,
    data: response.data,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const { message, chatId } = req.body;

    // 验证参数
    if (!message || !message.trim()) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }

    // 从环境变量获取配置
    const token = process.env.TEST_TELEGRAM_TOKEN || 
                  process.env.TELEGRAM_BOT_TOKEN || 
                  process.env.TELEGRAM_TOKEN;
    
    const defaultChatId = process.env.TEST_GROUP_ID || 
                          process.env.TARGET_GROUP_ID || 
                          process.env.TARGET_CHAT_ID;

    // 确定要发送到的聊天 ID
    const targetChatId = chatId || defaultChatId;

    if (!token) {
      console.error('[Telegram] ❌ 未找到机器人 Token');
      return res.status(500).json({ 
        message: 'Telegram 机器人 Token 未配置',
        error: '请在环境变量中设置 TEST_TELEGRAM_TOKEN 或 TELEGRAM_BOT_TOKEN'
      });
    }

    if (!targetChatId) {
      console.error('[Telegram] ❌ 未指定目标聊天 ID');
      return res.status(400).json({ 
        message: '目标聊天 ID 未配置',
        error: '请在环境变量中设置 TEST_GROUP_ID 或在请求中提供 chatId'
      });
    }

    // 构建 Telegram Bot API URL
    const telegramApiUrl = `https://api.telegram.org/bot${token}/sendMessage`;

    // 准备请求数据
    const requestData = {
      chat_id: parseInt(String(targetChatId), 10),
      text: message,
      parse_mode: 'HTML', // 支持 HTML 格式
    };

    // 配置代理（如果需要）
    let proxyUrl = process.env.HTTP_PROXY || 
                   process.env.HTTPS_PROXY || 
                   process.env.http_proxy || 
                   process.env.https_proxy;

    console.log('====[Telegram] ℹ️ 使用代理:', proxyUrl);
    // 规范化代理 URL
    if (proxyUrl) {
      // 如果代理 URL 格式不正确，尝试修复
      if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
        proxyUrl = `http://${proxyUrl}`;
      }
      console.log('[Telegram] ℹ️ 使用代理:', proxyUrl);
    }

    // 如果配置了代理，优先使用 axios（更可靠）
    if (proxyUrl) {
      console.log('[Telegram] ℹ️ 检测到代理配置，使用 axios 发送');
      try {
        const axiosResult = await sendWithAxios(telegramApiUrl, requestData, proxyUrl);
        const data = axiosResult.data as TelegramResponse;
        
        if (!axiosResult.ok || !data.ok) {
          console.error('[Telegram] ❌ 发送失败:', data);
          return res.status(axiosResult.status).json({
            message: '发送消息失败',
            error: data.description || '未知错误',
            error_code: data.error_code,
          });
        }

        console.log('[Telegram] ✅ 消息发送成功:', {
          chatId: targetChatId,
          messageId: data.result?.message_id,
          messageLength: message.length,
        });

        return res.status(200).json({
          success: true,
          message: '消息发送成功',
          result: {
            message_id: data.result?.message_id,
            chat_id: targetChatId,
            date: data.result?.date,
          },
        });
      } catch (axiosError: any) {
        console.error('[Telegram] ❌ axios 发送失败:', axiosError.message);
        // 如果 axios 也失败，尝试使用 fetch with undici
        console.log('[Telegram] ⚠️ 尝试使用 fetch with undici');
      }
    }

    // 使用 fetch 发送请求（无代理或 axios 失败时的备用方案）
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    };

    // 如果配置了代理，尝试使用 undici 的 ProxyAgent
    if (proxyUrl) {
      try {
        const { ProxyAgent } = require('undici');
        const proxyAgent = new ProxyAgent(proxyUrl);
        (fetchOptions as any).dispatcher = proxyAgent;
        console.log('[Telegram] ✅ 已配置 undici 代理');
      } catch (error) {
        console.warn('[Telegram] ⚠️ 无法使用 undici 代理');
      }
    }

    try {
      const response = await fetch(telegramApiUrl, fetchOptions);
      const data: TelegramResponse = await response.json();

      if (!response.ok || !data.ok) {
        console.error('[Telegram] ❌ 发送失败:', data);
        return res.status(response.status).json({
          message: '发送消息失败',
          error: data.description || '未知错误',
          error_code: data.error_code,
        });
      }

      console.log('[Telegram] ✅ 消息发送成功:', {
        chatId: targetChatId,
        messageId: data.result?.message_id,
        messageLength: message.length,
      });

      return res.status(200).json({
        success: true,
        message: '消息发送成功',
        result: {
          message_id: data.result?.message_id,
          chat_id: targetChatId,
          date: data.result?.date,
        },
      });
    } catch (fetchError: any) {
      console.error('[Telegram] ❌ fetch 发送失败:', fetchError.message);
      throw fetchError;
    }

  } catch (error: any) {
    console.error('[Telegram] ❌ 发送消息时出错:', error);
    return res.status(500).json({
      message: '服务器错误',
      error: process.env.NODE_ENV === 'development' ? error.message : '发送消息时发生错误',
    });
  }
}

