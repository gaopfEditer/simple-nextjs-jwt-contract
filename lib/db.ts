import bcrypt from 'bcryptjs';
import { getPool } from './db-connection';

export interface User {
  id: number;
  email: string;
  password: string; // 已加密的密码
  is_enabled: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function createUser(
  email: string,
  password: string
): Promise<User> {
  try {
    const pool = getPool();
    
    // 检查用户是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (existingUsers.length > 0) {
      throw new Error('用户已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, is_enabled) VALUES (?, ?, ?)',
      [email, hashedPassword, true]
    ) as any[];

    // 获取创建的用户
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    ) as any[];

    return mapRowToUser(users[0]);
  } catch (error: any) {
    console.error('数据库操作错误 (createUser):', error);
    throw error;
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const pool = getPool();
    
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as any[];

    if (rows.length === 0) {
      return null;
    }

    return mapRowToUser(rows[0]);
  } catch (error: any) {
    console.error('数据库查询错误 (findUserByEmail):', error);
    throw error;
  }
}

export async function findUserById(id: number): Promise<User | null> {
  const pool = getPool();
  
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ?',
    [id]
  ) as any[];

  if (rows.length === 0) {
    return null;
  }

  return mapRowToUser(rows[0]);
}

export async function updateLastLoginAt(userId: number): Promise<void> {
  const pool = getPool();
  
  await pool.execute(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [userId]
  );
}

export async function updateUserEnabled(
  userId: number,
  isEnabled: boolean
): Promise<void> {
  const pool = getPool();
  
  await pool.execute(
    'UPDATE users SET is_enabled = ? WHERE id = ?',
    [isEnabled, userId]
  );
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 将数据库行映射到 User 对象
function mapRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    is_enabled: Boolean(row.is_enabled),
    last_login_at: row.last_login_at ? new Date(row.last_login_at) : null,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}
