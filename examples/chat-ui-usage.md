# 聊天界面使用说明

## 概述

已创建一个带Tab导航的主页面，包含三个标签页：
1. **聊天框** - 实时显示来自Telegram机器人或其他API的消息
2. **首页** - 显示系统欢迎信息和统计
3. **仪表盘** - 显示用户信息和账户状态

## 访问方式

访问 `/home` 页面即可使用Tab界面：

```
http://localhost:3000/home
```

## 功能特性

### 聊天框 Tab

- ✅ 自动连接WebSocket服务器
- ✅ 实时接收并显示消息
- ✅ 自动滚动到最新消息
- ✅ 智能滚动检测（用户手动滚动时暂停自动滚动）
- ✅ 显示消息来源、发送者、时间等信息
- ✅ 支持显示消息元数据
- ✅ 连接状态指示器
- ✅ 自动重连机制
- ✅ 清空消息功能

### 首页 Tab

- 显示系统欢迎信息
- 显示访问统计
- 提供示例文章链接
- 登录/注册入口

### 仪表盘 Tab

- 显示用户信息（需要登录）
- 显示账户状态
- 最后登录时间
- 注册时间

## 消息格式

聊天框会自动接收并显示以下格式的消息：

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

## 测试消息接收

可以通过以下方式测试消息接收：

### 1. 使用 cURL

```bash
curl -X POST http://localhost:3000/api/messages/receive \
  -H "Content-Type: application/json" \
  -d '{
    "source": "telegram",
    "content": "这是一条测试消息",
    "sender": "test_user"
  }'
```

### 2. 使用 JavaScript

```javascript
fetch('http://localhost:3000/api/messages/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    source: 'telegram',
    content: '这是一条测试消息',
    sender: 'test_user',
    title: '测试标题'
  })
})
.then(res => res.json())
.then(data => console.log('消息已发送:', data));
```

## 界面特性

- **响应式设计** - 支持移动端和桌面端
- **现代化UI** - 使用渐变色和阴影效果
- **流畅动画** - 消息出现时的滑入动画
- **状态指示** - 实时显示连接状态
- **自动滚动** - 新消息自动滚动到底部
- **手动控制** - 用户可以手动滚动查看历史消息

## 注意事项

1. 确保WebSocket服务器正在运行（`server.js`）
2. 确保数据库中的 `messages` 表已创建
3. 消息会自动从数据库转发到所有连接的WebSocket客户端
4. 系统每5秒检查一次未转发的消息并自动转发

