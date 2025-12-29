# 消息API使用示例

## 概述

消息API用于接收来自Telegram机器人或其他API调用的标准消息，系统会自动记录到数据库并通过WebSocket转发给前端显示。

## API端点

### 接收消息

**POST** `/api/messages/receive`

#### 请求头
```
Content-Type: application/json
```

#### 请求体示例

**基本消息：**
```json
{
  "content": "这是一条测试消息"
}
```

**完整消息（Telegram机器人示例）：**
```json
{
  "source": "telegram",
  "source_id": "123456789",
  "type": "text",
  "title": "新消息通知",
  "content": "用户发送了一条消息：Hello World!",
  "metadata": {
    "chat_id": 123456789,
    "message_id": 123,
    "chat_type": "private"
  },
  "sender": "username",
  "sender_id": "user_123456"
}
```

#### 响应示例

**成功：**
```json
{
  "success": true,
  "message": "消息已接收并记录",
  "data": {
    "id": 1,
    "source": "telegram",
    "type": "text",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**错误：**
```json
{
  "error": "Bad request",
  "message": "消息内容(content)不能为空"
}
```

## 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容 |
| source | string | 否 | 消息来源（默认: "api"） |
| source_id | string | 否 | 来源ID（如Telegram消息ID） |
| type | string | 否 | 消息类型（默认: "text"） |
| title | string | 否 | 消息标题 |
| metadata | object | 否 | 消息元数据（JSON对象） |
| sender | string | 否 | 发送者标识 |
| sender_id | string | 否 | 发送者ID |

## 使用示例

### cURL示例

```bash
curl -X POST http://localhost:3000/api/messages/receive \
  -H "Content-Type: application/json" \
  -d '{
    "source": "telegram",
    "content": "这是一条来自Telegram的消息",
    "sender": "bot_user"
  }'
```

### JavaScript/Node.js示例

```javascript
const axios = require('axios');

async function sendMessage() {
  try {
    const response = await axios.post('http://localhost:3000/api/messages/receive', {
      source: 'telegram',
      source_id: '123456789',
      type: 'text',
      title: '新消息',
      content: '这是一条测试消息',
      metadata: {
        chat_id: 123456789,
        message_id: 123
      },
      sender: 'username',
      sender_id: 'user_123'
    });
    
    console.log('消息已发送:', response.data);
  } catch (error) {
    console.error('发送失败:', error.response?.data || error.message);
  }
}

sendMessage();
```

### Python示例

```python
import requests
import json

url = 'http://localhost:3000/api/messages/receive'
data = {
    'source': 'telegram',
    'source_id': '123456789',
    'type': 'text',
    'title': '新消息',
    'content': '这是一条测试消息',
    'metadata': {
        'chat_id': 123456789,
        'message_id': 123
    },
    'sender': 'username',
    'sender_id': 'user_123'
}

response = requests.post(url, json=data)
print('响应:', response.json())
```

## WebSocket消息格式

当消息被接收后，系统会自动通过WebSocket转发给所有连接的客户端。消息格式如下：

```json
{
  "type": "message_received",
  "message": {
    "id": 1,
    "source": "telegram",
    "source_id": "123456789",
    "type": "text",
    "title": "新消息",
    "content": "这是一条测试消息",
    "metadata": {
      "chat_id": 123456789,
      "message_id": 123
    },
    "sender": "username",
    "sender_id": "user_123",
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 前端接收消息

前端可以通过WebSocket连接接收消息。参考 `pages/websocket.tsx` 中的实现。

## 注意事项

1. 消息会自动记录到数据库的 `messages` 表中
2. 消息会自动转发给所有连接的WebSocket客户端
3. 系统每5秒检查一次未转发的消息并自动转发
4. 服务器重启后会自动检查并转发之前未转发的消息

