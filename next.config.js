/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 只在生产模式使用 standalone，开发模式禁用以支持热更新
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
  // 确保开发模式下的 HMR 正常工作
  ...(process.env.NODE_ENV === 'development' ? {
    webpackDevMiddleware: (config) => {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      return config
    },
  } : {}),
}

module.exports = nextConfig

