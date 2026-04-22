/**
 * Telegram 消息发送工具函数
 * 用于在服务器端直接发送消息到 Telegram 群组
 */

interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
  error_code?: number;
}

/**
 * 发送消息到 Telegram 群组（服务器端调用）
 */
export async function sendTelegramMessage(
  message: string,
  chatId?: string | number
): Promise<{ success: boolean; error?: string; result?: any }> {
  try {
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
      return {
        success: false,
        error: 'Telegram 机器人 Token 未配置'
      };
    }

    if (!targetChatId) {
      console.error('[Telegram] ❌ 未指定目标聊天 ID');
      return {
        success: false,
        error: '目标聊天 ID 未配置'
      };
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

    if (proxyUrl && process.env.NODE_ENV === 'production' && process.env.TELEGRAM_FORCE_HTTP_PROXY !== '1') {
      try {
        const normalized = proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://') ? proxyUrl : `http://${proxyUrl}`;
        const u = new URL(normalized);
        if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
          console.warn(
            '[Telegram] ⚠️ 生产环境已忽略指向本机的 HTTP(S)_PROXY，避免服务器上 ECONNREFUSED 127.0.0.1:7890'
          );
          proxyUrl = undefined;
        }
      } catch {
        // ignore
      }
    }

    // 规范化代理 URL
    if (proxyUrl) {
      if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
        proxyUrl = `http://${proxyUrl}`;
      }
      console.log('[Telegram] ℹ️ 使用代理:', proxyUrl);
    }

    // 如果配置了代理，优先使用 axios（更可靠）
    if (proxyUrl) {
      try {
        const axios = require('axios');
        const { HttpsProxyAgent } = require('https-proxy-agent');

        const axiosConfig: any = {
          method: 'POST',
          url: telegramApiUrl,
          headers: {
            'Content-Type': 'application/json',
          },
          data: requestData,
          timeout: 30000, // 30 秒超时
        };

        // 配置代理
        const agent = new HttpsProxyAgent(proxyUrl);
        axiosConfig.httpsAgent = agent;
        axiosConfig.httpAgent = agent;

        const response = await axios(axiosConfig);
        const data = response.data as TelegramResponse;

        if (!data.ok) {
          console.error('[Telegram] ❌ 发送失败:', data);
          return {
            success: false,
            error: data.description || '未知错误',
            result: data
          };
        }

        console.log('[Telegram] ✅ 消息发送成功:', {
          chatId: targetChatId,
          messageId: data.result?.message_id,
        });

        return {
          success: true,
          result: {
            message_id: data.result?.message_id,
            chat_id: targetChatId,
            date: data.result?.date,
          }
        };
      } catch (axiosError: any) {
        console.error('[Telegram] ❌ axios 发送失败:', axiosError.message);
        // 如果 axios 失败，尝试使用 fetch with undici
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
        return {
          success: false,
          error: data.description || '未知错误',
          result: data
        };
      }

      console.log('[Telegram] ✅ 消息发送成功:', {
        chatId: targetChatId,
        messageId: data.result?.message_id,
      });

      return {
        success: true,
        result: {
          message_id: data.result?.message_id,
          chat_id: targetChatId,
          date: data.result?.date,
        }
      };
    } catch (fetchError: any) {
      console.error('[Telegram] ❌ fetch 发送失败:', fetchError.message);
      return {
        success: false,
        error: fetchError.message || '发送失败'
      };
    }

  } catch (error: any) {
    console.error('[Telegram] ❌ 发送消息时出错:', error);
    return {
      success: false,
      error: error.message || '发送消息时发生错误'
    };
  }
}

/**
 * 格式化 TradingView 消息为 Telegram 消息
 */
export function formatTradingViewMessageForTelegram(
  title: string | null,
  content: string,
  metadata: any
): string {
  let telegramMessage = '';
  
  // 如果有标题，添加标题
  if (title) {
    telegramMessage += `<b>${title}</b>\n\n`;
  }
  
  // 添加消息内容
  telegramMessage += content;
  
  // 如果是 TradingView 信号，添加额外信息
  if (metadata) {
    if (metadata.ticker) {
      telegramMessage += `\n\n📊 <b>交易对:</b> ${metadata.ticker}`;
    }
    if (metadata.close !== null && metadata.close !== undefined) {
      telegramMessage += `\n💰 <b>价格:</b> ${metadata.close.toLocaleString()}`;
    }
    if (metadata.time) {
      telegramMessage += `\n⏰ <b>时间:</b> ${metadata.time}`;
    }
  }
  
  // 添加来源信息
  telegramMessage += `\n\n📌 <i>来源: TradingView</i>`;
  
  return telegramMessage;
}



