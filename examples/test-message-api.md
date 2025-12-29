# 测试消息API的方法

## Windows PowerShell 中的测试方法

### 方法1：使用 Invoke-RestMethod（推荐）

```powershell
$body = @{
    source = "telegram"
    content = "这是一条测试消息"
    sender = "test_user"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/messages/receive" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### 方法2：使用 curl.exe

如果系统安装了 curl.exe（Windows 10 1803+ 自带），可以使用：

```powershell
curl.exe -X POST http://localhost:3000/api/messages/receive `
    -H "Content-Type: application/json" `
    -d '{\"source\": \"telegram\", \"content\": \"这是一条测试消息\", \"sender\": \"test_user\"}'
```

或者使用多行格式：

```powershell
$body = @'
{
    "source": "telegram",
    "content": "这是一条测试消息",
    "sender": "test_user"
}
'@

curl.exe -X POST http://localhost:3000/api/messages/receive `
    -H "Content-Type: application/json" `
    -d $body
```

### 方法3：使用 Invoke-WebRequest

```powershell
$body = @{
    source = "telegram"
    content = "这是一条测试消息"
    sender = "test_user"
    title = "测试标题"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/messages/receive" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

$response.Content | ConvertFrom-Json
```

### 方法4：使用测试脚本

运行提供的 PowerShell 测试脚本：

```powershell
.\test\test-message-api.ps1
```

## 使用 Node.js 测试

```bash
node test/test-message-api.js
```

## 使用浏览器测试

可以使用浏览器扩展（如 REST Client）或在线工具（如 Postman、Insomnia）测试。

### 请求信息：
- **URL**: `http://localhost:3000/api/messages/receive`
- **Method**: `POST`
- **Headers**: 
  ```
  Content-Type: application/json
  ```
- **Body**:
  ```json
  {
    "source": "telegram",
    "content": "这是一条测试消息",
    "sender": "test_user",
    "title": "测试标题"
  }
  ```

## 使用 Python 测试

```python
import requests
import json

url = 'http://localhost:3000/api/messages/receive'
data = {
    'source': 'telegram',
    'content': '这是一条测试消息',
    'sender': 'test_user',
    'title': '测试标题'
}

response = requests.post(url, json=data)
print('状态码:', response.status_code)
print('响应:', response.json())
```

## 常见问题

### PowerShell 中 curl 命令报错

在 PowerShell 中，`curl` 是 `Invoke-WebRequest` 的别名，语法不同。解决方法：

1. **使用 `curl.exe`**（如果已安装）
2. **使用 `Invoke-RestMethod`**（推荐）
3. **使用提供的测试脚本**

### 测试脚本位置

- PowerShell 脚本：`test/test-message-api.ps1`
- Node.js 脚本：`test/test-message-api.js`

