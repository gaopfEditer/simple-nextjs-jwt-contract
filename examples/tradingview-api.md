# TradingView Webhook API 使用说明

## API 端点

**POST** `/api/tradingview/receive`

## 请求格式

### 请求头
```
Content-Type: application/json
```

### 请求体

```json
{
  "ticker": "BTCUSDT",
  "time": "2024-01-15T10:30:00Z",
  "close": 45000.5,
  "message": "BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200"
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `ticker` | string | 是 | 交易对符号（如 BTCUSDT, ETHUSDT） |
| `time` | string | 否 | 时间戳（ISO 8601 格式） |
| `close` | number | 否 | 收盘价格 |
| `message` | string | 是 | 交易信号消息内容 |

## 响应格式

### 成功响应 (200)

```json
{
  "success": true,
  "message": "TradingView消息已接收并记录",
  "data": {
    "id": 123,
    "ticker": "BTCUSDT",
    "time": "2024-01-15T10:30:00Z",
    "close": 45000.5,
    "created_at": "2024-01-15T10:30:01.000Z"
  }
}
```

### 错误响应

#### 400 Bad Request - 缺少必需字段

```json
{
  "error": "Bad request",
  "message": "ticker字段不能为空且必须是字符串",
  "received": { ... }
}
```

#### 405 Method Not Allowed

```json
{
  "error": "Method not allowed",
  "message": "只支持POST请求"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "服务器内部错误"
}
```

## 使用示例

### 1. 使用 curl

```bash
curl -X POST http://localhost:3000/api/tradingview/receive \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "BTCUSDT",
    "time": "2024-01-15T10:30:00Z",
    "close": 45000.5,
    "message": "BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200"
  }'
```

### 2. 使用 Node.js 测试脚本

```bash
# 使用原生 http 模块
node test/test-tradingview-api.js

# 使用 axios（如果已安装）
node test/test-tradingview-api-axios.js
```

### 3. 使用 Python

```python
import requests
import json

url = 'http://localhost:3000/api/tradingview/receive'
data = {
    'ticker': 'BTCUSDT',
    'time': '2024-01-15T10:30:00Z',
    'close': 45000.5,
    'message': 'BTCUSDT 上插针 | 2024-01-15T10:30:00Z | 价格:45000.5 | 15M@45100+1H@45200'
}

response = requests.post(url, json=data)
print('状态码:', response.status_code)
print('响应:', response.json())
```

### 4. 在 TradingView 中配置 Webhook

在 TradingView 的 Alert 设置中：

1. **条件**: 设置你的交易信号条件
2. **Webhook URL**: `http://your-server:3000/api/tradingview/receive`
3. **消息模板**:
```json
{
  "ticker": "{{ticker}}",
  "time": "{{time}}",
  "close": {{close}},
  "message": "{{message}}"
}
```

或者使用简化的消息格式（如果TradingView不支持JSON）：
```
{{ticker}}|{{time}}|{{close}}|{{message}}
```

然后在服务器端解析这个格式。

## 数据存储

接收到的 TradingView 消息会被保存到 `messages` 表中，包含以下信息：

- **source**: `tradingview`
- **type**: `trading_signal`
- **title**: `{ticker} 交易信号`
- **content**: 完整的消息内容（包含价格和时间）
- **metadata**: JSON格式，包含原始数据：
  ```json
  {
    "source": "tradingview",
    "ticker": "BTCUSDT",
    "time": "2024-01-15T10:30:00Z",
    "close": 45000.5,
    "original_message": "..."
  }
  ```
- **sender**: `TradingView`
- **sender_id**: `tradingview_webhook`

## 消息转发

消息接收后会自动触发转发机制，通过 WebSocket 或 HTTP 轮询推送给已连接的客户端。

## 注意事项

1. **服务器地址**: 确保 TradingView 能够访问你的服务器地址
2. **端口**: 默认端口是 3000，如果使用其他端口需要修改
3. **HTTPS**: 生产环境建议使用 HTTPS
4. **认证**: 当前接口没有认证，如需安全保护，可以添加 API Key 验证
5. **超时**: 请求超时时间为 10 秒

