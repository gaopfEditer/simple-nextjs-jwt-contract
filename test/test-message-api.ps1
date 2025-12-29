# PowerShell 脚本：测试消息API

# 方法1：使用 Invoke-RestMethod（推荐）
Write-Host "方法1：使用 Invoke-RestMethod" -ForegroundColor Green
$body = @{
    source = "telegram"
    content = "这是一条测试消息"
    sender = "test_user"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/messages/receive" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "成功！" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "错误：$($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "详细信息：$($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n" -NoNewline

# 方法2：使用 curl.exe（如果已安装）
Write-Host "方法2：使用 curl.exe" -ForegroundColor Green
$curlBody = @'
{
    "source": "telegram",
    "content": "这是一条测试消息",
    "sender": "test_user"
}
'@

try {
    $curlResponse = & curl.exe -X POST http://localhost:3000/api/messages/receive `
        -H "Content-Type: application/json" `
        -d $curlBody
    
    Write-Host "成功！" -ForegroundColor Green
    Write-Host $curlResponse
} catch {
    Write-Host "错误：curl.exe 可能未安装或不在PATH中" -ForegroundColor Yellow
}

Write-Host "`n" -NoNewline

# 方法3：使用 Invoke-WebRequest（完整示例）
Write-Host "方法3：使用 Invoke-WebRequest" -ForegroundColor Green
$webBody = @{
    source = "telegram"
    content = "这是一条测试消息（方法3）"
    sender = "test_user"
    title = "测试标题"
} | ConvertTo-Json

try {
    $webResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/messages/receive" `
        -Method Post `
        -ContentType "application/json" `
        -Body $webBody
    
    Write-Host "成功！状态码：$($webResponse.StatusCode)" -ForegroundColor Green
    $webResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "错误：$($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "详细信息：$($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

