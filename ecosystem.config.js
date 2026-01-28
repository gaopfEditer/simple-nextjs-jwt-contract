module.exports = {
  apps: [{
    name: 'nextjs-jwt-app',        // 应用名称
    script: 'server.js',            // 使用自定义服务器（支持 WebSocket）
    instances: 1,                   // 单实例（WebSocket 不支持集群模式）
    exec_mode: 'fork',              // fork 模式（单进程）
    autorestart: true,              // 自动重启
    watch: false,                   // 禁用监听文件变化（生产环境）
    max_memory_restart: '1G',       // 内存超过1G时重启
    min_uptime: '10s',              // 最小运行时间，小于此时间重启视为异常
    max_restarts: 10,               // 最大重启次数
    restart_delay: 4000,            // 重启延迟（毫秒）
    
    // 日志配置
    error_file: './logs/pm2-error.log',      // 错误日志
    out_file: './logs/pm2-out.log',          // 输出日志
    log_file: './logs/pm2-combined.log',     // 合并日志
    time: true,                              // 日志添加时间戳
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z', // 日志时间格式
    merge_logs: true,                        // 合并日志
    
    // 开发环境配置
    env: {
      NODE_ENV: 'development',
      PORT: 3123,
      HOSTNAME: 'localhost',
      // 数据库配置（从 .env.local 读取，这里可以设置默认值）
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_NAME: 'nextjs_jwt',
      // JWT 配置
      JWT_SECRET: 'dev-secret-key-change-in-production',
      JWT_EXPIRES_IN: '7d',
    },
    
    // 生产环境配置
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',          // 监听所有网络接口
      // 数据库配置（生产环境应从 .env.local 读取）
      DB_HOST: '60.205.120.196',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: 'b01c044f2e0bf36e',               // 应从环境变量读取
      DB_NAME: 'nextjs_jwt',
      // JWT 配置
      JWT_SECRET: "Zrs.abR)C7+JYw%|8PS&;hh8+Mdj3+-8m9ixI5lx,5q#%jJlP45o1TY6kNeyXCT/",               // 必须从环境变量设置
      JWT_EXPIRES_IN: '7d',
    }
  }]
};