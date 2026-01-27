/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 禁用 standalone 模式（因为使用自定义 server.js）
  // standalone 模式用于 Docker 等容器环境，PM2 部署不需要
  // ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
}

module.exports = nextConfig

