# Gemini 多模态功能配置说明

## 功能说明

已在仪表盘 Tab 右侧添加了 Gemini Tab，支持：
- 文本对话
- 图片上传和分析
- 多模态模型交互

## 升级说明

项目已升级到最新的 `@google/genai` SDK，并重构了代码结构：
- ✅ 使用统一的 `lib/aiClient.ts` 工具类管理 AI 客户端实例
- ✅ 采用单例模式，避免重复创建客户端
- ✅ 简化了 API 路由代码

## 配置步骤

### 1. 创建环境变量文件

在项目根目录创建 `.env.local` 文件（如果不存在），并添加以下配置：

```env
GEMINI_API_KEY=AIzaSyBYWj9RdUzTog40HwK95-DjHAHYTEpJ5eY
```

### 2. 重启开发服务器

配置完成后，需要重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
pnpm dev
```

## 使用方法

1. 在首页点击 **Gemini** Tab（位于仪表盘 Tab 右侧）
2. 可以：
   - 直接输入文本消息进行对话
   - 点击 📎 按钮上传图片进行分析
   - 同时发送文本和图片进行多模态分析

## 技术实现

- **前端组件**: `components/GeminiChat.tsx`
- **API 路由**: `pages/api/gemini/chat.ts`
- **AI 客户端工具类**: `lib/aiClient.ts`（统一管理 Client 实例）
- **SDK**: `@google/genai` (最新版本)
- **模型**: `gemini-2.5-flash`（支持多模态）
- **文件限制**: 最大 10MB，支持图片格式（JPEG, PNG, GIF, WebP）

## 代码结构

### AI 客户端工具类 (`lib/aiClient.ts`)

提供了统一的 AI 客户端管理：
- `getClient()`: 获取单例客户端实例
- `generateText()`: 生成文本内容
- `generateMultimodal()`: 生成多模态内容（文本+图片）
- `generateContent()`: 统一的内容生成方法

### API 路由 (`pages/api/gemini/chat.ts`)

使用 `aiClient` 工具类处理请求，代码更简洁。

## 网络连接问题解决

如果遇到 `fetch failed sending request` 错误，通常是网络连接问题。解决方案：

### 1. 配置代理（推荐）

在 `.env.local` 文件中添加代理配置：

```env
# 代理配置（如果无法直接访问 Google API）
# 方式一：使用完整的 URL（推荐）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890

# 方式二：使用 GEMINI_PROXY（会自动添加 http:// 前缀）
GEMINI_PROXY=127.0.0.1:7890
```

**重要提示**：
- 如果使用 `HTTP_PROXY` 或 `HTTPS_PROXY`，必须包含 `http://` 前缀
- 如果使用 `GEMINI_PROXY`，可以省略 `http://` 前缀，代码会自动添加
- 将 `127.0.0.1:7890` 替换为您的实际代理地址和端口
- 代码会自动使用 `undici` 的 `ProxyAgent` 配置全局代理，确保 Node.js 的 fetch API 使用代理

### 2. 技术实现

代码使用 `undici` 库的 `ProxyAgent` 来配置全局代理，这样可以确保 Node.js 18+ 的 fetch API 正确使用代理：

- 在模块加载时自动检测代理配置
- 使用 `setGlobalDispatcher` 设置全局代理
- 支持 `HTTP_PROXY`、`HTTPS_PROXY` 和 `GEMINI_PROXY` 环境变量

### 2. 检查代理服务

确保代理服务正在运行：
- 检查代理服务是否启动
- 测试代理连接：`curl -x http://127.0.0.1:7890 https://www.google.com`

### 3. 其他可能的原因

- **防火墙限制**：检查防火墙是否阻止了出站连接
- **DNS 解析问题**：尝试使用 `8.8.8.8` 作为 DNS 服务器
- **企业网络限制**：联系网络管理员

## 注意事项

- API Key 已配置在 `env.example` 中作为示例
- 实际使用时，请确保 `.env.local` 文件存在并包含正确的 API Key
- `.env.local` 文件已在 `.gitignore` 中，不会被提交到版本控制
- 使用单例模式管理客户端，提高性能和资源利用率
- 如果使用代理，确保代理服务正常运行

