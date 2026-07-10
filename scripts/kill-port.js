#!/usr/bin/env node
const { execSync } = require('child_process');

const port = process.argv[2] || process.env.PORT || '3123';

try {
  if (process.platform === 'win32') {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set(
      out
        .split('\n')
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid) => pid && /^\d+$/.test(pid) && pid !== '0')
    );
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } catch {
        // ignore
      }
    }
  } else {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { shell: true, stdio: 'ignore' });
  }
  console.log(`[dev] 已释放端口 ${port}`);
} catch {
  // 端口未被占用
}
