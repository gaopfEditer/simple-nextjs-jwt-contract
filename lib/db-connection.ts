import mysql from 'mysql2/promise';

// 数据库配置
const dbConfig: mysql.PoolOptions = {
  // 使用 127.0.0.1 而不是 localhost，避免 IPv6 连接问题
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nextjs_jwt',
  waitForConnections: true,
  connectionLimit: 5, // 减少连接数，避免 "Too many connections" 错误
  queueLimit: 0,
  // 启用连接重用
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: false,
};

// 使用全局对象存储连接池，避免 Next.js 热重载时重复创建
declare global {
  // eslint-disable-next-line no-var
  var mysqlPool: mysql.Pool | undefined;
}

// 创建连接池（单例模式）
export function getPool(): mysql.Pool {
  // 在开发环境中，使用全局变量来避免热重载时重复创建连接池
  if (process.env.NODE_ENV !== 'production') {
    if (!global.mysqlPool) {
      global.mysqlPool = createPool();
    }
    return global.mysqlPool;
  } else {
    // 生产环境使用模块级变量
    if (!(globalThis as any).mysqlPool) {
      (globalThis as any).mysqlPool = createPool();
    }
    return (globalThis as any).mysqlPool;
  }
}

// 创建连接池的辅助函数
function createPool(): mysql.Pool {
  try {
    console.log('数据库连接池创建中...');
    console.log('数据库配置:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      connectionLimit: dbConfig.connectionLimit,
      passwordSet: !!dbConfig.password,
      passwordLength: dbConfig.password ? dbConfig.password.length : 0,
    });
    
    const pool = mysql.createPool(dbConfig);
    
    // 测试连接
    pool.getConnection()
      .then((connection) => {
        console.log('数据库连接池创建成功');
        connection.release();
      })
      .catch((error) => {
        console.error('数据库连接测试失败:', error.message);
        console.error('错误代码:', error.code);
        console.error('错误详情:', {
          errno: error.errno,
          sqlState: error.sqlState,
          sqlMessage: error.sqlMessage,
        });
      });
    
    return pool;
  } catch (error: any) {
    console.error('数据库连接池创建失败:', error);
    throw error;
  }
}

// 关闭连接池
export async function closePool(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    if (global.mysqlPool) {
      await global.mysqlPool.end();
      global.mysqlPool = undefined;
    }
  } else {
    if ((globalThis as any).mysqlPool) {
      await (globalThis as any).mysqlPool.end();
      (globalThis as any).mysqlPool = undefined;
    }
  }
}

