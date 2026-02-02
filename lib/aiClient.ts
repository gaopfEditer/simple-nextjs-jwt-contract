import { GoogleGenAI } from '@google/genai';

/**
 * 配置全局 fetch 使用代理（仅 Node.js 环境）
 */
function configureGlobalFetchProxy() {
  if (typeof window === 'undefined') {
    const proxyUrl = process.env.GEMINI_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    if (proxyUrl) {
      let normalizedProxyUrl = proxyUrl;
      if (!normalizedProxyUrl.startsWith('http://') && !normalizedProxyUrl.startsWith('https://')) {
        normalizedProxyUrl = `http://${normalizedProxyUrl}`;
      }

      // 尝试使用 undici 配置代理（Node.js 18+）
      try {
        const { setGlobalDispatcher, ProxyAgent } = require('undici');
        const proxyAgent = new ProxyAgent(normalizedProxyUrl);
        setGlobalDispatcher(proxyAgent);
        console.log('✅ 已配置 undici 全局代理:', normalizedProxyUrl);
      } catch (error) {
        // 如果 undici 不可用，尝试其他方法
        console.warn('无法使用 undici 配置代理，尝试使用环境变量方式');
      }
    }
  }
}

// 在模块加载时配置代理
configureGlobalFetchProxy();

/**
 * Gemini AI 客户端工具类
 * 统一管理 Client 实例，避免重复创建
 */
class AIClient {
  private client: GoogleGenAI | null = null;
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('警告: GEMINI_API_KEY 未配置');
    }
    // 从环境变量读取模型版本，默认为 gemini-2.5-flash
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    // 初始化代理配置
    this.initializeProxy();
  }

  /**
   * 获取 Gemini AI 客户端实例（单例模式）
   */
  getClient(): GoogleGenAI {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error('GEMINI_API_KEY 未配置，请在 .env.local 文件中设置');
      }

      // 配置选项
      const options: any = {
        apiKey: this.apiKey,
      };

      // 检查并配置代理（仅在 Node.js 环境）
      if (typeof window === 'undefined') {
        const proxyUrl = this.getProxyUrl();
        if (proxyUrl) {
          console.log('检测到代理配置:', proxyUrl);
          // 使用 https-proxy-agent 配置代理
          const agent = this.createProxyAgent(proxyUrl);
          if (agent) {
            // 注意：@google/genai 可能不直接支持 agent，但我们可以通过全局配置
            // 设置全局代理环境变量，让 Node.js 的 fetch 使用
            if (!process.env.HTTP_PROXY) {
              process.env.HTTP_PROXY = proxyUrl;
            }
            if (!process.env.HTTPS_PROXY) {
              process.env.HTTPS_PROXY = proxyUrl;
            }
            console.log('已设置 HTTP_PROXY 和 HTTPS_PROXY 环境变量:', proxyUrl);
          }
        }
      }

      this.client = new GoogleGenAI(options);
    }
    return this.client;
  }

  /**
   * 获取代理 URL（支持多种格式）
   */
  private getProxyUrl(): string | null {
    // 优先使用 GEMINI_PROXY，然后是 HTTPS_PROXY，最后是 HTTP_PROXY
    let proxyUrl = process.env.GEMINI_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    
    if (!proxyUrl) {
      return null;
    }

    // 如果代理 URL 没有协议前缀，添加 http://
    if (!proxyUrl.startsWith('http://') && !proxyUrl.startsWith('https://')) {
      proxyUrl = `http://${proxyUrl}`;
    }

    return proxyUrl;
  }

  /**
   * 初始化代理配置（在模块加载时调用）
   */
  private initializeProxy(): void {
    if (typeof window === 'undefined') {
      const proxyUrl = this.getProxyUrl();
      if (proxyUrl) {
        // 确保环境变量已设置（Node.js 的 fetch 会自动使用这些变量）
        if (!process.env.HTTP_PROXY) {
          process.env.HTTP_PROXY = proxyUrl;
        }
        if (!process.env.HTTPS_PROXY) {
          process.env.HTTPS_PROXY = proxyUrl;
        }
        console.log('✅ 代理配置已初始化:', proxyUrl);
      }
    }
  }

  /**
   * 创建代理 Agent（仅 Node.js 环境）
   */
  private createProxyAgent(proxyUrl: string): any {
    try {
      // 动态导入，避免在浏览器环境中出错
      const { HttpsProxyAgent } = require('https-proxy-agent');
      return new HttpsProxyAgent(proxyUrl);
    } catch (error) {
      console.warn('无法创建代理 Agent，请确保已安装 https-proxy-agent: pnpm add https-proxy-agent');
      return null;
    }
  }

  /**
   * 生成内容（文本）
   */
  async generateText(prompt: string, model?: string): Promise<string> {
    const modelName = model || this.defaultModel;
    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt, // 可以直接传入字符串
      });
      return response.text || '';
    } catch (error: any) {
      // 提供更详细的错误信息
      if (error.message && error.message.includes('fetch failed')) {
        throw new Error(
          `网络连接失败。可能的原因：\n` +
          `1. 无法访问 Google API 服务器（可能需要代理）\n` +
          `2. 防火墙或网络限制\n` +
          `3. DNS 解析问题\n\n` +
          `解决方案：\n` +
          `- 在 .env.local 中设置 HTTP_PROXY 或 HTTPS_PROXY（例如：http://127.0.0.1:7890）\n` +
          `- 或设置 GEMINI_PROXY 环境变量\n` +
          `- 安装 https-proxy-agent: pnpm add https-proxy-agent\n\n` +
          `原始错误: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 生成多模态内容（文本 + 图片）
   */
  async generateMultimodal(
    prompt: string,
    imageData: string,
    mimeType: string,
    model?: string
  ): Promise<string> {
    const modelName = model || this.defaultModel;
    try {
      const client = this.getClient();
      
      // 验证图片数据
      if (!imageData || !imageData.trim()) {
        throw new Error('图片数据不能为空');
      }
      
      // 清理图片数据：确保是纯 Base64 字符串（移除可能的 data:image/...;base64, 前缀）
      let cleanImageData = imageData.trim();
      if (cleanImageData.includes(',')) {
        const parts = cleanImageData.split(',');
        if (parts.length > 1) {
          cleanImageData = parts[1];
        }
      }
      
      // 验证 Base64 格式
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanImageData)) {
        throw new Error('图片数据格式无效，必须是有效的 Base64 编码字符串');
      }
      
      // 使用新 API 的格式：Content 对象数组
      // 根据 API 文档，图片数据应该使用 inlineData 对象（Blob 格式）
      const contents = [
        {
          role: 'user' as const,
          parts: [
            {
              type: 'text' as const,
              text: prompt || '请分析这张图片',
            },
            {
              // 使用 inlineData 对象，而不是 type: 'image'
              inlineData: {
                data: cleanImageData,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ];

      console.log('发送多模态请求:', {
        model,
        hasText: !!prompt,
        hasImage: !!cleanImageData,
        imageDataLength: cleanImageData.length,
        imageDataPreview: cleanImageData.substring(0, 50) + '...',
        mimeType,
      });

      const response = await client.models.generateContent({
        model: modelName,
        contents,
      });
      
      return response.text || '';
    } catch (error: any) {
      // 提供更详细的错误信息
      if (error.message && error.message.includes('fetch failed')) {
        throw new Error(
          `网络连接失败。可能的原因：\n` +
          `1. 无法访问 Google API 服务器（可能需要代理）\n` +
          `2. 防火墙或网络限制\n` +
          `3. DNS 解析问题\n\n` +
          `解决方案：\n` +
          `- 在 .env.local 中设置 HTTP_PROXY 或 HTTPS_PROXY（例如：http://127.0.0.1:7890）\n` +
          `- 或设置 GEMINI_PROXY 环境变量\n` +
          `- 安装 https-proxy-agent: pnpm add https-proxy-agent\n\n` +
          `原始错误: ${error.message}`
        );
      }
      
      // 处理 API 错误
      if (error.message && error.message.includes('INVALID_ARGUMENT')) {
        console.error('API 请求错误详情:', error);
        throw new Error(
          `API 请求参数错误：${error.message}\n` +
          `请检查：\n` +
          `1. 图片数据格式是否正确（Base64 编码）\n` +
          `2. MIME 类型是否正确（image/jpeg, image/png, image/webp 等）\n` +
          `3. 图片大小是否超出限制（通常最大 20MB）\n` +
          `4. 图片数据是否包含 data:image/...;base64, 前缀（应该移除）`
        );
      }
      
      throw error;
    }
  }

  /**
   * 生成内容（支持文本和可选的图片）
   */
  async generateContent(
    prompt: string,
    imageData?: string,
    mimeType?: string,
    model?: string
  ): Promise<string> {
    if (imageData && mimeType) {
      return this.generateMultimodal(prompt, imageData, mimeType, model);
    }
    return this.generateText(prompt, model);
  }
}

// 导出单例实例
const aiClient = new AIClient();

export default aiClient;
export { AIClient };

