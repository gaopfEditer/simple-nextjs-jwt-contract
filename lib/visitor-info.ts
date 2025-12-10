import crypto from 'crypto';

export interface VisitorInfo {
  ip: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  referer: string;
  path: string;
  queryString: string;
}

export interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
}

/**
 * 从请求中获取真实IP地址
 */
export function getClientIp(req: any): string {
  // 检查各种可能的IP头（考虑代理和负载均衡器）
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for 可能包含多个IP，取第一个
    const ips = forwarded.split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // 回退到连接IP
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

/**
 * 解析User-Agent获取设备信息
 */
export function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
} {
  const ua = userAgent.toLowerCase();

  // 检测设备类型
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/bot|crawler|spider|crawling/i.test(ua)) {
    deviceType = 'bot';
  }

  // 检测浏览器
  let browser = 'unknown';
  let browserVersion = '';

  if (ua.includes('edg/')) {
    browser = 'Edge';
    const match = ua.match(/edg\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
    const match = ua.match(/version\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
    const match = ua.match(/(?:opera|opr)\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'IE';
    const match = ua.match(/(?:msie |rv:)([\d.]+)/);
    browserVersion = match ? match[1] : '';
  }

  // 检测操作系统
  let os = 'unknown';
  let osVersion = '';

  if (ua.includes('windows')) {
    os = 'Windows';
    if (ua.includes('windows nt 10.0')) {
      osVersion = '10';
    } else if (ua.includes('windows nt 6.3')) {
      osVersion = '8.1';
    } else if (ua.includes('windows nt 6.2')) {
      osVersion = '8';
    } else if (ua.includes('windows nt 6.1')) {
      osVersion = '7';
    } else if (ua.includes('windows nt 6.0')) {
      osVersion = 'Vista';
    } else if (ua.includes('windows nt 5.1')) {
      osVersion = 'XP';
    }
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    os = 'macOS';
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android ([\d.]+)/);
    osVersion = match ? match[1] : '';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
    const match = ua.match(/os ([\d_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion,
  };
}

/**
 * 从请求中提取完整的访客信息
 */
export function extractVisitorInfo(req: any): VisitorInfo {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const referer = req.headers['referer'] || req.headers['referrer'] || '';
  const path = req.url?.split('?')[0] || '/';
  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';

  const parsed = parseUserAgent(userAgent);

  return {
    ip,
    userAgent,
    deviceType: parsed.deviceType,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    osVersion: parsed.osVersion,
    referer,
    path,
    queryString,
  };
}

/**
 * 生成访客唯一标识（基于IP和User-Agent的哈希）
 */
export function generateVisitorId(ip: string, userAgent: string): string {
  const combined = `${ip}-${userAgent}`;
  return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 32);
}

/**
 * 判断是否为本地IP
 */
function isLocalIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // IPv4 本地地址
  if (ip.startsWith('127.') || 
      ip.startsWith('192.168.') || 
      ip.startsWith('10.') || 
      ip.startsWith('172.16.') || 
      ip.startsWith('172.17.') || 
      ip.startsWith('172.18.') || 
      ip.startsWith('172.19.') || 
      ip.startsWith('172.20.') || 
      ip.startsWith('172.21.') || 
      ip.startsWith('172.22.') || 
      ip.startsWith('172.23.') || 
      ip.startsWith('172.24.') || 
      ip.startsWith('172.25.') || 
      ip.startsWith('172.26.') || 
      ip.startsWith('172.27.') || 
      ip.startsWith('172.28.') || 
      ip.startsWith('172.29.') || 
      ip.startsWith('172.30.') || 
      ip.startsWith('172.31.')) {
    return true;
  }
  
  // IPv6 本地地址
  if (ip === '::1' || ip.startsWith('::ffff:127.') || ip.startsWith('fe80:')) {
    return true;
  }
  
  return false;
}

/**
 * 获取站点ID（从请求头、IP或环境变量）
 * - 如果请求头指定了站点ID，使用请求头的值
 * - 如果是本地访问，返回 "local"
 * - 否则返回访问者的IP地址作为站点ID
 */
export function getSiteId(req: any): string {
  // 优先使用请求头指定的站点ID
  if (req.headers['x-site-id']) {
    return req.headers['x-site-id'];
  }
  
  // 如果环境变量指定了站点ID，使用环境变量
  if (process.env.SITE_ID) {
    return process.env.SITE_ID;
  }
  
  // 自动检测：获取访问者IP
  const ip = getClientIp(req);
  
  // 如果是本地IP，返回 "local"
  if (isLocalIp(ip)) {
    return 'local';
  }
  
  // 否则返回IP作为站点ID
  return ip;
}

