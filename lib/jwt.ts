import jwt from 'jsonwebtoken';

// Access Token 配置（与另一个系统保持一致）
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'sni';
const JWT_ACCESS_EXPIRE = parseInt(process.env.JWT_ACCESS_EXPIRE || '7200'); // 2小时（秒）
const JWT_REFRESH_EXPIRE = parseInt(process.env.JWT_REFRESH_EXPIRE || '86400'); // 24小时（秒）

// 用户认证信息结构
export interface UserAuthInfo {
  UserID: string;
  Email: string;
  CreatedAt: string; // ISO 8601 格式
  LastLoginAt: string | null; // ISO 8601 格式，可能为 null
}

// JWT Payload 结构（与另一个系统保持一致）
export interface JWTPayload {
  userAuthInfo: UserAuthInfo;
  exp?: number; // JWT 会自动添加
  iss?: string; // JWT 会自动添加
  iat?: number; // JWT 会自动添加
}

// 向后兼容：保留旧的扁平结构接口（用于内部使用）
export interface JWTPayloadLegacy {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenOptions {
  expiresIn?: string | number; // 例如: '7d', '24h', 3600
  algorithm?: string; // 例如: 'HS256', 'HS512'
  issuer?: string; // 签发者
  // 如果指定了时间戳，可以让 token 在特定时间保持一致（用于测试）
  notBefore?: number; // nbf - not before timestamp
}

// 生成 Access Token
export function generateToken(
  payload: JWTPayload | JWTPayloadLegacy,
  options?: TokenOptions
): string {
  const signOptions: jwt.SignOptions = {
    expiresIn: (options?.expiresIn || JWT_ACCESS_EXPIRE) as number, // 默认 2小时（秒）
    algorithm: (options?.algorithm as jwt.Algorithm) || 'HS256',
    issuer: options?.issuer || JWT_ISSUER, // 添加 issuer
  };

  if (options?.notBefore) {
    signOptions.notBefore = options.notBefore;
  }

  // 创建干净的 payload（移除 iat 和 exp，让 jwt.sign 自动处理）
  let cleanPayload: any;
  
  // 检查是新格式还是旧格式
  if ('userAuthInfo' in payload) {
    // 新格式：使用嵌套结构
    cleanPayload = {
      userAuthInfo: payload.userAuthInfo,
    };
  } else {
    // 旧格式：向后兼容，转换为新格式
    cleanPayload = {
      userAuthInfo: {
        UserID: String(payload.userId),
        Email: payload.email,
        CreatedAt: new Date().toISOString(), // 临时值，实际应从用户数据获取
        LastLoginAt: null,
      },
    };
  }

  return jwt.sign(cleanPayload, JWT_ACCESS_SECRET, signOptions);
}

// 生成 Refresh Token
export function generateRefreshToken(
  payload: JWTPayload | JWTPayloadLegacy,
  options?: TokenOptions
): string {
  const signOptions: jwt.SignOptions = {
    expiresIn: (options?.expiresIn || JWT_REFRESH_EXPIRE) as number, // 默认 24小时（秒）
    algorithm: (options?.algorithm as jwt.Algorithm) || 'HS256',
    issuer: options?.issuer || JWT_ISSUER,
  };

  // 创建干净的 payload
  let cleanPayload: any;
  
  // 检查是新格式还是旧格式
  if ('userAuthInfo' in payload) {
    // 新格式：使用嵌套结构
    cleanPayload = {
      userAuthInfo: payload.userAuthInfo,
    };
  } else {
    // 旧格式：向后兼容，转换为新格式
    cleanPayload = {
      userAuthInfo: {
        UserID: String(payload.userId),
        Email: payload.email,
        CreatedAt: new Date().toISOString(), // 临时值
        LastLoginAt: null,
      },
    };
  }

  return jwt.sign(cleanPayload, JWT_REFRESH_SECRET, signOptions);
}

// 验证 Access Token
export function verifyToken(token: string, options?: { ignoreIssuer?: boolean }): JWTPayload | null {
  try {
    // 清理 token（移除可能的空白字符）
    const cleanToken = token.trim();
    
    // 验证 token 格式（JWT 应该有三部分，用点分隔）
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[JWT] Token 格式错误，应该有 3 部分，实际:', parts.length);
      }
      return null;
    }

    // 构建验证选项
    const verifyOptions: any = {};
    
    // 如果明确设置了忽略 issuer，则不验证 issuer（用于兼容其他系统）
    if (!options?.ignoreIssuer && JWT_ISSUER) {
      verifyOptions.issuer = JWT_ISSUER;
    }

    // 先尝试不验证 issuer（兼容另一个系统）
    let decoded: any;
    try {
      decoded = jwt.verify(cleanToken, JWT_ACCESS_SECRET, verifyOptions);
    } catch (issuerError: any) {
      // 如果因为 issuer 验证失败，尝试忽略 issuer
      if (issuerError.name === 'JsonWebTokenError' && issuerError.message.includes('issuer')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[JWT] Issuer 验证失败，尝试忽略 issuer 验证');
        }
        decoded = jwt.verify(cleanToken, JWT_ACCESS_SECRET);
      } else {
        throw issuerError;
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      if (decoded.userAuthInfo) {
        console.log('[JWT] Token 验证成功:', {
          UserID: decoded.userAuthInfo.UserID,
          Email: decoded.userAuthInfo.Email,
          issuer: decoded.iss || '未设置',
        });
      } else {
        console.log('[JWT] Token 验证成功 (旧格式):', {
          userId: (decoded as any).userId,
          email: (decoded as any).email,
          issuer: decoded.iss || '未设置',
        });
      }
    }
    
    // 如果返回的是旧格式，转换为新格式
    if (!decoded.userAuthInfo && (decoded as any).userId) {
      const legacy = decoded as any;
      return {
        userAuthInfo: {
          UserID: String(legacy.userId),
          Email: legacy.email,
          CreatedAt: new Date().toISOString(), // 默认值
          LastLoginAt: null,
        },
        exp: decoded.exp,
        iss: decoded.iss,
        iat: decoded.iat,
      };
    }
    
    return decoded;
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[JWT] Token 验证失败:', {
        message: error.message,
        name: error.name,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 50) + '...',
      });
    }
    return null;
  }
}

// 验证 Refresh Token
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
    }) as any;
    
    // 如果返回的是旧格式，转换为新格式
    if (!decoded.userAuthInfo && decoded.userId) {
      return {
        userAuthInfo: {
          UserID: String(decoded.userId),
          Email: decoded.email,
          CreatedAt: new Date().toISOString(),
          LastLoginAt: null,
        },
        exp: decoded.exp,
        iss: decoded.iss,
        iat: decoded.iat,
      };
    }
    
    return decoded as JWTPayload;
  } catch (error) {
    return null;
  }
}

// 辅助函数：从 JWTPayload 获取 userId（向后兼容）
export function getUserIdFromPayload(payload: JWTPayload): number {
  return parseInt(payload.userAuthInfo.UserID);
}

// 辅助函数：从 JWTPayload 获取 email（向后兼容）
export function getEmailFromPayload(payload: JWTPayload): string {
  return payload.userAuthInfo.Email;
}

