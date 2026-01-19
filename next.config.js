/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 只在生产模式使用 standalone，开发模式禁用以支持热更新
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig

