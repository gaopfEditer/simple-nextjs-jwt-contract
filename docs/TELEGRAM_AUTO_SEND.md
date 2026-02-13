# Telegram 自动发送消息功能

## 功能说明

当信号列表（ChatBox 组件的 `messagesContainer`）收到新消息时，自动将消息发送到指定的 Telegram 群组。

## 配置步骤

### 1. 配置环境变量

在 `.env.local` 文件中添加以下配置：

```env
# Telegram Bot Token（必需）
TEST_TELEGRAM_TOKEN=your_telegram_bot_token

# 目标群组 ID（必需）
TEST_GROUP_ID=-5279508223
```

**或者使用以下兼容的环境变量名**：
- `TELEGRAM_BOT_TOKEN` 或 `TELEGRAM_TOKEN`（替代 `TEST_TELEGRAM_TOKEN`）
- `TARGET_GROUP_ID` 或 `TARGET_CHAT_ID`（替代 `TEST_GROUP_ID`）

### 2. 获取 Telegram Bot Token

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 创建新机器人
3. 按照提示设置机器人名称和用户名
4. 获取 Token（格式类似：`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`）

### 3. 获取群组 ID

1. 将机器人添加到目标群组
2. 在群组中发送一条消息
3. 访问：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. 在返回的 JSON 中找到 `chat.id`，这就是群组 ID（负数表示群组）

**或者使用以下方法**：
- 在群组中发送 `/start` 给机器人
- 访问 `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
- 查找 `"chat":{"id":-5279508223}` 这样的字段

### 4. 重启服务

配置完成后，重启 PM2 服务：

```bash
pm2 restart nextjs-jwt-app
```

## 功能特性

### 自动发送

- ✅ 当 ChatBox 收到新消息时，自动发送到 Telegram 群组
- ✅ 支持所有消息类型（TradingView、API、Webhook 等）
- ✅ 自动格式化消息内容

### 消息格式

发送到 Telegram 的消息格式：

```
[标题]（如果有）

消息内容

📊 交易对: BTCUSDT（如果是 TradingView 信号）
💰 价格: 50000（如果是 TradingView 信号）
⏰ 时间: 2024-01-01 12:00:00（如果是 TradingView 信号）

📌 来源: TradingView
```

### TradingView 信号增强

如果是 TradingView 交易信号，会自动添加：
- 交易对（ticker）
- 价格（close）
- 时间（time）

## 工作原理

1. **消息接收**：ChatBox 组件通过 WebSocket 接收消息
2. **消息处理**：收到新消息后，调用 `sendMessageToTelegram` 函数
3. **API 调用**：前端调用 `/api/telegram/send` API
4. **Telegram 发送**：后端通过 Telegram Bot API 发送消息到群组

## API 接口

### POST `/api/telegram/send`

发送消息到 Telegram 群组。

**请求体**：
```json
{
  "message": "要发送的消息内容",
  "chatId": "-5279508223" // 可选，如果不提供则使用环境变量中的 TEST_GROUP_ID
}
```

**响应**：
```json
{
  "success": true,
  "message": "消息发送成功",
  "result": {
    "message_id": 123,
    "chat_id": -5279508223,
    "date": 1704067200
  }
}
```

## 错误处理

- ✅ 如果 Telegram Token 未配置，会在控制台输出错误，不影响消息显示
- ✅ 如果群组 ID 未配置，会在控制台输出错误，不影响消息显示
- ✅ 发送失败不会影响前端消息的正常显示

## 调试

### 查看发送日志

在浏览器控制台中查看：
- ✅ 成功：`[Telegram] ✅ 消息已发送到群组: {...}`
- ❌ 失败：`[Telegram] ❌ 发送失败: {...}`

### 测试发送

可以使用以下方式测试：

```bash
# 使用 curl 测试
curl -X POST http://localhost:3123/api/telegram/send \
  -H "Content-Type: application/json" \
  -d '{"message": "测试消息"}'
```

## 注意事项

1. **Token 安全**：不要将 Token 提交到代码仓库，使用环境变量管理
2. **群组权限**：确保机器人已添加到目标群组，且有发送消息的权限
3. **消息频率**：注意 Telegram API 的速率限制（每秒最多 30 条消息）
4. **代理配置**：如果服务器无法直接访问 Telegram API，需要配置代理

## 故障排查

### 问题 1：消息未发送

**检查**：
1. 环境变量是否正确配置
2. 浏览器控制台是否有错误
3. 服务器日志是否有错误

**解决**：
```bash
# 检查环境变量
pm2 env nextjs-jwt-app | grep TELEGRAM

# 查看服务器日志
pm2 logs nextjs-jwt-app | grep Telegram
```

### 问题 2：403 Forbidden

**原因**：机器人未添加到群组或没有权限

**解决**：
1. 将机器人添加到群组
2. 确保机器人有发送消息的权限

### 问题 3：401 Unauthorized

**原因**：Token 无效或过期

**解决**：
1. 检查 Token 是否正确
2. 重新从 BotFather 获取 Token

## 相关文件

- `components/ChatBox.tsx` - ChatBox 组件，包含自动发送逻辑
- `pages/api/telegram/send.ts` - Telegram 发送 API
- `env.example` - 环境变量示例
- `test/send-message.js` - 命令行测试工具

