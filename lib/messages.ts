import { getPool } from './db-connection';

export interface Message {
  id: number;
  source: string;
  source_id: string | null;
  type: string;
  title: string | null;
  content: string;
  metadata: any | null;
  sender: string | null;
  sender_id: string | null;
  ip_address: string | null;
  status: string;
  forwarded: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageInput {
  source?: string;
  source_id?: string;
  type?: string;
  title?: string;
  content: string;
  metadata?: any;
  sender?: string;
  sender_id?: string;
  ip_address?: string;
  status?: string;
}

/**
 * 创建消息记录
 */
export async function createMessage(input: CreateMessageInput): Promise<Message> {
  try {
    const pool = getPool();
    
    const {
      source = 'api',
      source_id = null,
      type = 'text',
      title = null,
      content,
      metadata = null,
      sender = null,
      sender_id = null,
      ip_address = null,
      status = 'received'
    } = input;

    // 验证必需字段
    if (!content || typeof content !== 'string') {
      throw new Error('消息内容不能为空');
    }

    // 插入消息
    const [result] = await pool.execute(
      `INSERT INTO messages (
        source, source_id, type, title, content, metadata, 
        sender, sender_id, ip_address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        source,
        source_id,
        type,
        title,
        content,
        metadata ? JSON.stringify(metadata) : null,
        sender,
        sender_id,
        ip_address,
        status
      ]
    ) as any[];

    // 获取创建的消息
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE id = ?',
      [result.insertId]
    ) as any[];

    return mapRowToMessage(rows[0]);
  } catch (error: any) {
    console.error('数据库操作错误 (createMessage):', error);
    throw error;
  }
}

/**
 * 根据ID获取消息
 */
export async function getMessageById(id: number): Promise<Message | null> {
  try {
    const pool = getPool();
    
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    ) as any[];

    if (rows.length === 0) {
      return null;
    }

    return mapRowToMessage(rows[0]);
  } catch (error: any) {
    console.error('数据库查询错误 (getMessageById):', error);
    throw error;
  }
}

/**
 * 获取消息列表
 */
export async function getMessages(options: {
  source?: string;
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'id';
  order?: 'ASC' | 'DESC';
} = {}): Promise<Message[]> {
  try {
    const pool = getPool();
    
    const {
      source,
      type,
      status,
      limit = 100,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    let query = 'SELECT * FROM messages WHERE 1=1';
    const params: any[] = [];

    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.execute(query, params) as any[];

    return rows.map(mapRowToMessage);
  } catch (error: any) {
    console.error('数据库查询错误 (getMessages):', error);
    throw error;
  }
}

/**
 * 更新消息状态
 */
export async function updateMessageStatus(
  id: number,
  status: string
): Promise<void> {
  try {
    const pool = getPool();
    
    await pool.execute(
      'UPDATE messages SET status = ? WHERE id = ?',
      [status, id]
    );
  } catch (error: any) {
    console.error('数据库操作错误 (updateMessageStatus):', error);
    throw error;
  }
}

/**
 * 标记消息为已转发
 */
export async function markMessageAsForwarded(id: number): Promise<void> {
  try {
    const pool = getPool();
    
    await pool.execute(
      'UPDATE messages SET forwarded = 1 WHERE id = ?',
      [id]
    );
  } catch (error: any) {
    console.error('数据库操作错误 (markMessageAsForwarded):', error);
    throw error;
  }
}

/**
 * 获取未转发的消息
 */
export async function getUnforwardedMessages(limit: number = 100): Promise<Message[]> {
  try {
    const pool = getPool();
    
    const [rows] = await pool.execute(
      'SELECT * FROM messages WHERE forwarded = 0 ORDER BY created_at ASC LIMIT ?',
      [limit]
    ) as any[];

    return rows.map(mapRowToMessage);
  } catch (error: any) {
    console.error('数据库查询错误 (getUnforwardedMessages):', error);
    throw error;
  }
}

/**
 * 将数据库行映射到 Message 对象
 */
function mapRowToMessage(row: any): Message {
  return {
    id: row.id,
    source: row.source,
    source_id: row.source_id,
    type: row.type,
    title: row.title,
    content: row.content,
    metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
    sender: row.sender,
    sender_id: row.sender_id,
    ip_address: row.ip_address,
    status: row.status,
    forwarded: Boolean(row.forwarded),
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  };
}

