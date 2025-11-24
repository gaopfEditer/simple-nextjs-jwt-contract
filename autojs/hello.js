auto.waitFor();

// WebSocket 配置
const WS_HOST = "192.168.2.218";
const WS_PORT = 3000; // 根据服务器实际端口修改（默认 3000）
const WS_URL = "ws://" + WS_HOST + ":" + WS_PORT + "/api/ws";

// 买卖合约标准数据格式示例
const EXAMPLE_BUY_ORDER = {
    "action": "buy",           // 操作类型: buy(买入) / sell(卖出)
    "symbol": "BTC/USDT",      // 交易对
    "amount": 0.01,            // 数量
    "price": 50000,            // 价格（可选，市价单可不填）
    "orderType": "limit",      // 订单类型: limit(限价) / market(市价)
    "leverage": 10,            // 杠杆倍数（可选）
    "stopLoss": 49000,         // 止损价格（可选）
    "takeProfit": 52000        // 止盈价格（可选）
};

const EXAMPLE_SELL_ORDER = {
    "action": "sell",
    "symbol": "BTC/USDT",
    "amount": 0.01,
    "price": 51000,
    "orderType": "limit",
    "leverage": 10,
    "stopLoss": 52000,
    "takeProfit": 49000
};

let ws = null;
let isConnected = false;
let httpPushUrl = null; // HTTP 模式下的推送地址

// 初始化 WebSocket 连接
function initWebSocket() {
    try {
        console.log("正在连接 WebSocket: " + WS_URL);
        toast("正在连接服务器...");
        
        // 尝试使用 WebSocket（如果 AutoJS 支持）
        if (typeof $webSocket !== "undefined" && $webSocket) {
            ws = $webSocket.newWebSocket(WS_URL, {
                eventThread: 'main',
                headers: {}
            });
            
            ws.on("open", function(event, webSocket) {
                console.log("WebSocket 连接成功");
                toast("已连接到服务器");
                isConnected = true;
                
                // 发送连接确认消息
                sendMessage({
                    "type": "connected",
                    "message": "AutoJS 客户端已连接"
                });
            });
            
            ws.on("message", function(event, webSocket, message) {
                console.log("收到消息: " + message);
                handleMessage(message);
            });
            
            ws.on("error", function(event, webSocket, error) {
                console.log("WebSocket 错误: " + error);
                toast("连接错误: " + error);
                isConnected = false;
            });
            
            ws.on("close", function(event, webSocket, code, reason) {
                console.log("WebSocket 连接关闭: " + code + " - " + reason);
                toast("连接已断开");
                isConnected = false;
                
                // 尝试重连
                setTimeout(function() {
                    if (!isConnected) {
                        console.log("尝试重新连接...");
                        initWebSocket();
                    }
                }, 3000);
            });
        } else {
            throw new Error("WebSocket 模块不可用");
        }
        
    } catch (e) {
        console.log("WebSocket 初始化失败: " + e);
        // 如果 WebSocket 不可用，使用 HTTP 轮询作为备选方案
        console.log("使用 HTTP 轮询模式...");
        startHttpPolling();
    }
}

// HTTP 轮询备选方案（如果 WebSocket 不可用）
let pollingInterval = null;
let httpClientId = null; // 存储 HTTP 客户端的 ID

function startHttpPolling() {
    const POLL_URL = "http://" + WS_HOST + ":" + WS_PORT + "/poll";
    const PUSH_URL = "http://" + WS_HOST + ":" + WS_PORT + "/push";
    
    isConnected = true;
    httpPushUrl = PUSH_URL; // 保存推送地址，供 sendMessage 使用
    
    // 轮询接收消息（首次轮询会获取客户端 ID）
    pollingInterval = setInterval(function() {
        try {
            let pollUrl = POLL_URL;
            if (httpClientId) {
                pollUrl += "?clientId=" + httpClientId;
            }
            
            let response = http.get(pollUrl);
            if (response && response.statusCode === 200 && response.body) {
                let bodyStr = response.body.string();
                if (bodyStr && bodyStr !== "null" && bodyStr !== "") {
                    let message = JSON.parse(bodyStr);
                    
                    // 如果是欢迎消息，保存客户端 ID（首次连接）
                    if (message.type === "welcome" && message.clientId && !httpClientId) {
                        httpClientId = message.clientId;
                        console.log("已获取客户端 ID: " + httpClientId);
                        toast("已连接，客户端 ID: " + httpClientId);
                        
                        // 发送连接确认
                        sendMessage({
                            "type": "connected",
                            "clientId": httpClientId,
                            "message": "AutoJS 客户端已连接（HTTP 模式）"
                        });
                    }
                    
                    // 处理订单消息
                    if (message.type === "order_forwarded" && message.order) {
                        handleMessage(JSON.stringify(message.order));
                    } else if (message.action && (message.action === "buy" || message.action === "sell")) {
                        // 直接是订单数据
                        handleMessage(JSON.stringify(message));
                    }
                }
            }
        } catch (e) {
            // 忽略轮询错误（连接失败等）
            console.log("轮询错误: " + e);
        }
    }, 1000);
    
    console.log("HTTP 轮询已启动");
    console.log("轮询地址: " + POLL_URL);
    console.log("推送地址: " + PUSH_URL);
    toast("使用 HTTP 轮询模式");
}

// 发送消息
function sendMessage(data) {
    if (!isConnected && !pollingInterval) {
        console.log("未连接，无法发送消息");
        return;
    }
    
    try {
        let message = JSON.stringify(data);
        if (ws && isConnected) {
            // WebSocket 模式
            ws.send(message);
            console.log("发送消息 (WebSocket): " + message);
        } else if (httpPushUrl) {
            // HTTP 模式，添加 clientId
            if (httpClientId && !data.clientId) {
                data.clientId = httpClientId;
            }
            try {
                let response = http.postJson(httpPushUrl, data);
                console.log("发送消息 (HTTP): " + message);
            } catch (e) {
                console.log("HTTP 发送消息失败: " + e);
            }
        } else {
            console.log("未找到可用的发送方式");
        }
    } catch (e) {
        console.log("发送消息失败: " + e);
    }
}

// 处理接收到的消息
function handleMessage(messageStr) {
    try {
        let data = JSON.parse(messageStr);
        console.log("解析消息: " + JSON.stringify(data));
        
        if (data.action === "buy") {
            executeBuyOrder(data);
        } else if (data.action === "sell") {
            executeSellOrder(data);
        } else if (data.type === "ping") {
            // 心跳响应
            sendMessage({ "type": "pong" });
        } else {
            console.log("未知消息类型: " + data.action);
        }
    } catch (e) {
        console.log("消息解析失败: " + e);
        console.log("原始消息: " + messageStr);
    }
}

// 执行买入订单
function executeBuyOrder(orderData) {
    console.log("========== 执行买入订单 ==========");
    console.log("交易对: " + orderData.symbol);
    console.log("数量: " + orderData.amount);
    console.log("价格: " + (orderData.price || "市价"));
    console.log("订单类型: " + orderData.orderType);
    
    toast("执行买入: " + orderData.symbol + " " + orderData.amount);
    
    // TODO: 在这里实现实际的买入操作
    // 1. 查找买入按钮或输入框
    // 2. 填写交易信息
    // 3. 提交订单
    
    // 发送执行结果
    sendMessage({
        "type": "order_result",
        "action": "buy",
        "status": "success",
        "orderId": "ORDER_" + new Date().getTime(),
        "message": "买入订单已执行"
    });
}

// 执行卖出订单
function executeSellOrder(orderData) {
    console.log("========== 执行卖出订单 ==========");
    console.log("交易对: " + orderData.symbol);
    console.log("数量: " + orderData.amount);
    console.log("价格: " + (orderData.price || "市价"));
    console.log("订单类型: " + orderData.orderType);
    
    toast("执行卖出: " + orderData.symbol + " " + orderData.amount);
    
    // TODO: 在这里实现实际的卖出操作
    // 1. 查找卖出按钮或输入框
    // 2. 填写交易信息
    // 3. 提交订单
    
    // 发送执行结果
    sendMessage({
        "type": "order_result",
        "action": "sell",
        "status": "success",
        "orderId": "ORDER_" + new Date().getTime(),
        "message": "卖出订单已执行"
    });
}

// 启动 WebSocket 连接
initWebSocket();

toast("合约交易客户端已启动");

// ========== 以下代码用于调试时打印页面元素（需要时可取消注释） ==========
/*
// 递归打印元素信息
function printNode(node, depth) {
    if (!node) return;
    
    let indent = "";
    for (let i = 0; i < depth; i++) {
        indent += "  ";
    }
    
    let info = indent + "[" + node.className() + "]";
    
    if (node.text()) {
        info += " 文本:" + node.text();
    }
    if (node.desc()) {
        info += " 描述:" + node.desc();
    }
    if (node.id()) {
        info += " ID:" + node.id();
    }
    if (node.clickable()) {
        info += " [可点击]";
    }
    
    console.log(info);
    
    // 打印子节点
    let childCount = node.childCount();
    for (let i = 0; i < childCount; i++) {
        let child = node.child(i);
        if (child) {
            printNode(child, depth + 1);
        }
    }
}

console.log("========== 开始打印页面元素 ==========");

// 获取当前窗口的根节点
let root = className("android.view.View").findOne(2000);
if (!root) {
    root = className("android.widget.FrameLayout").findOne(2000);
}

if (root) {
    printNode(root, 0);
    console.log("========== 打印完成 ==========");
} else {
    console.log("未找到根节点，尝试查找所有可见元素...");
    let allNodes = className("android.view.View").find();
    console.log("找到 " + allNodes.length + " 个 View 元素");
    allNodes.forEach((node, index) => {
        console.log("--- 元素 " + (index + 1) + " ---");
        console.log("类名:", node.className());
        console.log("文本:", node.text() || "(无)");
        console.log("描述:", node.desc() || "(无)");
        console.log("ID:", node.id() || "(无)");
        console.log("可点击:", node.clickable());
        console.log("坐标:", node.bounds());
        console.log("");
    });
    console.log("========== 打印完成 ==========");
}
*/
