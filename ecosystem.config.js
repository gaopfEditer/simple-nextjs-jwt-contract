module.exports = {
    apps: [{
      name: 'next-app',           // 应用名称
      script: 'node_modules/next/dist/bin/next',  // Next.js 启动脚本
      args: 'start',              // 传递给脚本的参数
      instances: 2,               // 集群实例数（生产环境建议根据CPU核心数设置）
      exec_mode: 'cluster',       // 集群模式
      autorestart: true,         // 自动重启
      watch: false,              // 禁用监听文件变化
      max_memory_restart: '1G',  // 内存超过1G时重启
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }]
  };