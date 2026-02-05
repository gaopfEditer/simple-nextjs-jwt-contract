// Gemini API 配置
// 优先从环境变量读取，如果没有则使用默认值（仅用于开发）
export const getGeminiApiKey = (): string => {
  if (typeof window !== 'undefined') {
    // 客户端：从环境变量读取（Next.js 会自动处理 NEXT_PUBLIC_ 前缀的变量）
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  }
  
  // 服务端：从环境变量读取
  return process.env.GEMINI_API_KEY || '';
};








