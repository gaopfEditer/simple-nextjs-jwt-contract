import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '方法不允许' });
  }

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const publicIp = process.env.PUBLIC_IP;
    const publicDomain = process.env.PUBLIC_DOMAIN;

    // 优先：如果配置了公网域名，使用域名（推荐用于生产环境）
    if (publicDomain) {
      const protocol = req.headers['x-forwarded-proto'] || (req.headers.referer?.startsWith('https') ? 'https' : 'http');
      const wsProtocol = protocol === 'https' ? 'wss' : 'ws';
      return res.status(200).json({
        ip: publicDomain,
        port: port,
        wsUrl: `${wsProtocol}://${publicDomain}${port === 80 || port === 443 ? '' : `:${port}`}/api/ws`,
        wssUrl: `wss://${publicDomain}${port === 443 ? '' : `:${port}`}/api/ws`,
        type: 'public',
        source: 'PUBLIC_DOMAIN'
      });
    }

    // 次优：如果配置了公网 IP，直接使用
    if (publicIp) {
      return res.status(200).json({
        ip: publicIp,
        port: port,
        wsUrl: `ws://${publicIp}:${port}/api/ws`,
        wssUrl: `wss://${publicIp}:${port}/api/ws`,
        type: 'public',
        source: 'PUBLIC_IP'
      });
    }

    // 否则使用局域网 IP
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';
    let preferred192Ip = 'localhost'; // 最优先：192.168 开头的 IP
    let preferred10Ip = 'localhost'; // 次优先：10 开头的 IP
    let preferred172Ip = 'localhost'; // 第三优先：172.16-31 开头的 IP

    // 遍历所有网络接口，找到第一个非回环的 IPv4 地址
    for (const interfaceName of Object.keys(networkInterfaces)) {
      const interfaces = networkInterfaces[interfaceName];
      if (!interfaces) continue;

      // 跳过 Docker、虚拟网络接口和 Windows 虚拟适配器
      const interfaceNameLower = interfaceName.toLowerCase();
      if (interfaceNameLower.includes('docker') || 
          interfaceNameLower.includes('veth') ||
          interfaceNameLower.includes('br-') ||
          interfaceNameLower.includes('vmware') ||
          interfaceNameLower.includes('virtualbox') ||
          interfaceNameLower.includes('vethernet') || // Windows 虚拟以太网适配器
          interfaceNameLower.includes('hyper-v') ||
          interfaceNameLower.includes('wsl') ||
          interfaceNameLower.includes('loopback') ||
          interfaceNameLower.includes('默认开关') || // Windows 中文系统
          interfaceNameLower.includes('default switch')) {
        continue;
      }

      for (const iface of interfaces) {
        // 跳过内部（回环）和非 IPv4 地址
        if (iface.internal || iface.family !== 'IPv4') {
          continue;
        }

        const ip = iface.address;
        
        // 最优先：192.168 开头的 IP（最常见的局域网段）
        if (ip.startsWith('192.168.')) {
          preferred192Ip = ip;
          continue; // 继续查找，看是否有更好的选择（有默认网关的）
        }
        
        // 次优先：10 开头的 IP
        if (ip.startsWith('10.') && preferred10Ip === 'localhost') {
          preferred10Ip = ip;
        }
        
        // 第三优先：172.16-31 开头的 IP（私有网络段）
        if (ip.startsWith('172.')) {
          const secondOctet = parseInt(ip.split('.')[1] || '0');
          if (secondOctet >= 16 && secondOctet <= 31 && preferred172Ip === 'localhost') {
            preferred172Ip = ip;
          }
        }
        
        // 如果没有找到优先 IP，使用第一个非回环 IP（作为备选）
        if (localIp === 'localhost') {
          localIp = ip;
        }
      }
    }
    
    // 按优先级选择 IP
    if (preferred192Ip !== 'localhost') {
      localIp = preferred192Ip;
    } else if (preferred10Ip !== 'localhost') {
      localIp = preferred10Ip;
    } else if (preferred172Ip !== 'localhost') {
      localIp = preferred172Ip;
    }

    return res.status(200).json({
      ip: localIp,
      port: port,
      wsUrl: `ws://${localIp}:${port}/api/ws`,
      wssUrl: `wss://${localIp}:${port}/api/ws`,
      type: 'local',
      source: 'network-interfaces'
    });
  } catch (error: any) {
    console.error('获取本地 IP 错误:', error);
    return res.status(500).json({
      message: '获取本地 IP 失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

