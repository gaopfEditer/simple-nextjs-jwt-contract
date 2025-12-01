auto.waitFor();

// WebSocket 配置
const WS_HOST = "192.168.1.132";
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
let reconnectAttempts = 0; // 重连尝试次数
let maxReconnectAttempts = 5; // 最大重连次数
let reconnectTimer = null; // 重连定时器
let isManualDisconnect = false; // 是否手动断开

// 获取设备信息
function getDeviceInfo() {
    try {
        const brand = device.brand || "unknown";
        const model = device.model || "unknown";
        return {
            brand: brand,
            model: model,
            product: device.product || "unknown",
            release: device.release || "unknown",
            sdkInt: device.sdkInt || 0,
            width: device.width || 0,
            height: device.height || 0,
            androidId: device.getAndroidId ? device.getAndroidId() : "unknown",
            deviceName: (brand + " " + model).trim() || "unknown"
        };
    } catch (e) {
        console.log("获取设备信息失败: " + e);
        return {
            error: "获取设备信息失败: " + e
        };
    }
}

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
                reconnectAttempts = 0; // 重置重连次数
                
                // 清除重连定时器
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                
                // 获取设备信息
                let deviceInfo = getDeviceInfo();
                console.log("设备信息: " + JSON.stringify(deviceInfo));
                
                // 发送连接确认消息（包含设备信息和时间戳）
                sendMessage({
                    "type": "connected",
                    "message": "AutoJS 客户端已连接",
                    "deviceInfo": deviceInfo,
                    "timestamp": new Date().toISOString()
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
                
                // 错误时也尝试重连（如果不是手动断开）
                if (!isManualDisconnect) {
                    attemptReconnect();
                }
            });
            
            ws.on("close", function(event, webSocket, code, reason) {
                console.log("WebSocket 连接关闭: " + code + " - " + reason);
                isConnected = false;
                
                // 如果是手动断开，不进行重连
                if (isManualDisconnect) {
                    toast("连接已断开");
                    isManualDisconnect = false;
                    return;
                }
                
                // 尝试自动重连
                attemptReconnect();
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
let lastPollSuccessTime = null; // 最后一次成功轮询的时间

// 尝试重连函数
function attemptReconnect() {
    // 如果已经达到最大重连次数，停止重连
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.log("已达到最大重连次数，停止重连");
        toast("连接已断开，需要重新设置 AutoJS 连接电脑");
        isConnected = false;
        
        // 停止 HTTP 轮询
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        return;
    }
    
    reconnectAttempts++;
    console.log("尝试重连 (" + reconnectAttempts + "/" + maxReconnectAttempts + ")...");
    toast("正在重连 (" + reconnectAttempts + "/" + maxReconnectAttempts + ")...");
    
    // 每30秒尝试重连一次
    reconnectTimer = setTimeout(function() {
        if (!isConnected) {
            console.log("执行第 " + reconnectAttempts + " 次重连...");
            
            // 停止 HTTP 轮询（如果正在运行）
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
            
            // 不重置 HTTP 客户端 ID，先尝试使用旧的ID
            // 如果旧ID不存在，服务器会返回404，然后在轮询中处理
            // httpClientId = null; // 注释掉，保留旧的ID
            
            // 尝试重新连接
            try {
                initWebSocket();
            } catch (e) {
                console.log("重连失败: " + e);
                // 如果 WebSocket 失败，尝试 HTTP 轮询
                if (!isConnected) {
                    startHttpPolling();
                }
            }
        }
    }, 30000); // 30秒
}

function startHttpPolling() {
    const POLL_URL = "http://" + WS_HOST + ":" + WS_PORT + "/poll";
    const PUSH_URL = "http://" + WS_HOST + ":" + WS_PORT + "/push";
    
    isConnected = true;
    httpPushUrl = PUSH_URL; // 保存推送地址，供 sendMessage 使用
    reconnectAttempts = 0; // 重置重连次数
    lastPollSuccessTime = Date.now(); // 记录首次轮询时间
    
    // 清除之前的重连定时器
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    
    // 轮询接收消息（首次轮询会获取客户端 ID）
    pollingInterval = setInterval(function() {
        try {
            let pollUrl = POLL_URL;
            if (httpClientId) {
                pollUrl += "?clientId=" + httpClientId;
            }
            
            let response = http.get(pollUrl);
            if (response && response.statusCode === 200 && response.body) {
                // 更新最后成功轮询时间
                lastPollSuccessTime = Date.now();
                
                let bodyStr = response.body.string();
                if (bodyStr && bodyStr !== "null" && bodyStr !== "") {
                    let message = JSON.parse(bodyStr);
                    
                    // 如果是欢迎消息，保存客户端 ID（首次连接）
                    if (message.type === "welcome" && message.clientId && !httpClientId) {
                        httpClientId = message.clientId;
                        console.log("已获取客户端 ID: " + httpClientId);
                        toast("已连接，客户端 ID: " + httpClientId);
                        
                        // 重置重连次数
                        reconnectAttempts = 0;
                        
                        // 清除重连定时器
                        if (reconnectTimer) {
                            clearTimeout(reconnectTimer);
                            reconnectTimer = null;
                        }
                        
                        // 获取设备信息
                        let deviceInfo = getDeviceInfo();
                        console.log("设备信息: " + JSON.stringify(deviceInfo));
                        
                        // 发送连接确认（包含设备信息和时间戳）
                        sendMessage({
                            "type": "connected",
                            "clientId": httpClientId,
                            "timestamp": new Date().toISOString(),
                            "message": "AutoJS 客户端已连接（HTTP 模式）",
                            "deviceInfo": deviceInfo
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
            } else if (response && response.statusCode === 404 && httpClientId) {
                // 客户端不存在（可能是服务器重启或清理了），需要创建新客户端
                console.log("客户端不存在（旧ID: " + httpClientId + "），创建新客户端");
                httpClientId = null; // 只有在确认旧ID不存在时才重置
                isConnected = false;
                // 下次轮询时会自动创建新客户端（因为没有clientId）
            }
        } catch (e) {
            // 轮询错误
            console.log("轮询错误: " + e);
            
            // 检查是否长时间没有成功轮询（超过60秒）
            if (lastPollSuccessTime && (Date.now() - lastPollSuccessTime) > 60000) {
                console.log("长时间未成功轮询，认为连接已断开");
                isConnected = false;
                
                // 停止轮询
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                }
                
                // 尝试重连
                if (!isManualDisconnect) {
                    attemptReconnect();
                }
            }
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
        
        // 如果是订单消息，先检测息屏状态，然后打开应用
        if (data.action === "buy" || data.action === "sell") {
            console.log("========== 收到订单消息，先检测息屏状态 ==========");
            
            // 先检测息屏状态
            let isScreenOn = true;
            let screenCheckFailed = false;
            try {
                if (typeof device !== "undefined" && device) {
                    isScreenOn = device.isScreenOn();
                    console.log("屏幕状态: " + (isScreenOn ? "开启" : "息屏"));
                    
                    if (!isScreenOn) {
                        console.log("设备已息屏，无法执行订单操作，停止后续所有操作");
                        // 发送 WebSocket 消息告知设备息屏
                        sendMessage({
                            "type": "order_result",
                            "action": data.action,
                            "status": "error",
                            "message": "设备息屏，无法执行，请确认设备状态之后重新操作",
                            "invalid": true // 标记为无效订单
                        });
                        toast("设备息屏，无法执行订单!");
                        console.log("已发送息屏消息，直接返回，不执行后续操作");
                        return; // 直接返回，不继续执行任何操作
                    } else {
                        console.log("屏幕已开启，可以继续执行");
                    }
                } else {
                    console.log("无法检测屏幕状态（device 对象不可用），假设屏幕已开启");
                    screenCheckFailed = true;
                }
            } catch (e) {
                console.log("检测屏幕状态失败: " + e);
                screenCheckFailed = true;
            }
            
            // 只有屏幕已开启时才继续执行
            if (!isScreenOn) {
                console.log("屏幕状态检查失败，停止执行");
                return;
            }
            
            // 屏幕已开启，继续打开应用
            console.log("========== 屏幕已开启，开始打开应用 ==========");
            let appOpened = openYiBiApp();
            if (!appOpened) {
                // 如果打开应用失败（找不到合约按钮），直接退出，不继续操作
                console.log("打开应用失败，停止执行订单操作");
                sendMessage({
                    "type": "order_result",
                    "action": data.action,
                    "status": "error",
                    "message": "无法打开应用或找到合约页面，请手动操作",
                    "invalid": true // 标记为无效订单
                });
                return;
            }
            sleep(800); // 等待应用打开并加载
        }
        
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

// 第一步：检查全仓/分仓设置
function checkMarginMode() {
    console.log("========== 检查全仓/分仓设置 ==========");
    
    // 在 ScrollView 下查找"全仓 分仓"
    let marginModeView = desc("全仓\n分仓").findOne(3000);
    if (!marginModeView) {
        marginModeView = descContains("全仓").findOne(3000);
    }
    if (!marginModeView) {
        marginModeView = textContains("全仓").findOne(3000);
    }
    
    if (marginModeView) {
        let descText = marginModeView.desc() || "";
        let textContent = marginModeView.text() || "";
        
        console.log("找到全仓/分仓控件: " + descText + " / " + textContent);
        
        // 检查是否是全仓（根据描述判断）
        if (descText.includes("全仓") && !descText.includes("分仓")) {
            // 如果显示"全仓 分仓"，需要检查当前选中的是哪个
            // 这里可能需要根据实际UI判断，暂时假设需要点击切换到全仓
            console.log("需要切换到全仓模式");
            marginModeView.click();
            sleep(500);
            // 再次检查
            let newDesc = marginModeView.desc() || "";
            if (newDesc.includes("全仓") && !newDesc.includes("分仓")) {
                console.log("已切换到全仓模式");
                return true;
            }
        } else if (descText.includes("全仓") && descText.includes("分仓")) {
            console.log("当前是全仓分仓模式");
            return true;
        }
        
        console.log("警告: 当前不是全仓模式，请手动切换到全仓");
        toast("请选择全仓模式");
        return false;
    } else {
        console.log("未找到全仓/分仓控件");
        toast("未找到全仓/分仓设置");
        return false;
    }
}

// 第二步：检查并切换委托类型（如果是市价则切换为限价）
function ensureLimitOrder() {
    console.log("========== 检查委托类型 ==========");
    
    // 查找委托类型控件
    let orderTypeView = desc("限价委托").findOne(3000);
    if (!orderTypeView) {
        orderTypeView = desc("市价委托").findOne(3000);
    }
    if (!orderTypeView) {
        orderTypeView = textContains("限价委托").findOne(3000);
    }
    if (!orderTypeView) {
        orderTypeView = textContains("市价委托").findOne(3000);
    }
    
    if (orderTypeView) {
        let descText = orderTypeView.desc() || "";
        let textContent = orderTypeView.text() || "";
        
        console.log("找到委托类型控件: " + descText + " / " + textContent);
        
        // 检查是否是限价委托
        if (descText.includes("限价委托") || textContent.includes("限价委托")) {
            console.log("当前是限价委托，无需切换");
            return true;
        } else if (descText.includes("市价委托") || textContent.includes("市价委托")) {
            console.log("当前是市价委托，需要切换为限价");
            orderTypeView.click();
            sleep(800); // 等待弹窗打开
            
            // 在弹窗中选择"限价委托"
            console.log("在弹窗中选择限价委托...");
            let limitOption = null;
            
            // 方法1: 通过文本查找
            limitOption = text("限价委托").findOne(3000);
            if (!limitOption) {
                // 方法2: 通过描述查找
                limitOption = desc("限价委托").findOne(3000);
            }
            if (!limitOption) {
                // 方法3: 通过包含"限价"的文本查找
                limitOption = textContains("限价").findOne(3000);
            }
            if (!limitOption) {
                // 方法4: 查找所有可点击的TextView，查找包含"限价"的
                let allTextViews = className("android.widget.TextView").clickable(true).find();
                for (let i = 0; i < allTextViews.length; i++) {
                    let tvText = allTextViews[i].text() || "";
                    let tvDesc = allTextViews[i].desc() || "";
                    if (tvText.includes("限价") || tvDesc.includes("限价")) {
                        limitOption = allTextViews[i];
                        break;
                    }
                }
            }
            
            if (limitOption) {
                console.log("找到限价委托选项，准备点击");
                limitOption.click();
                sleep(800); // 等待弹窗关闭
                console.log("已点击限价委托选项");
                
                // 再次检查是否切换成功
                let newOrderType = desc("限价委托").findOne(2000);
                if (!newOrderType) {
                    newOrderType = textContains("限价委托").findOne(2000);
                }
                if (newOrderType) {
                    console.log("已切换为限价委托");
                    return true;
                } else {
                    console.log("切换后检查失败，但已点击限价选项");
                    // 即使检查失败，也返回true，因为已经点击了限价选项
                    return true;
                }
            } else {
                console.log("未找到限价委托选项，尝试关闭弹窗");
                // 如果找不到限价选项，尝试关闭弹窗
                try {
                    back();
                    sleep(500);
                } catch (e) {
                    console.log("关闭弹窗失败: " + e);
                }
                console.log("切换失败，请手动切换");
                toast("请手动切换到限价委托");
                return false;
            }
        }
    } else {
        console.log("未找到委托类型控件");
        toast("未找到委托类型设置");
        return false;
    }
}

// 第三步：填写委托价格（根据"价格 (USDT)"标签精确定位，避免与成本输入框冲突）
function fillPrice(price) {
    console.log("========== 填写委托价格: " + price + " ==========");
    
    // 方法1：根据"价格 (USDT)"标签定位（最准确）
    let priceLabel = desc("价格\n(USDT)").findOne(3000);
    if (!priceLabel) {
        priceLabel = desc("价格 (USDT)").findOne(3000);
    }
    if (!priceLabel) {
        priceLabel = descContains("价格").findOne(3000);
    }
    
    if (priceLabel) {
        console.log("找到价格标签");
        // 获取价格标签的父容器
        let parent = priceLabel.parent();
        if (parent) {
            // 在父容器中查找EditText
            let editTexts = parent.find(className("android.widget.EditText"));
            if (editTexts && editTexts.length > 0) {
                // 找到在价格标签下方或右侧的EditText
                let priceInput = null;
                let labelBounds = priceLabel.bounds();
                
                for (let i = 0; i < editTexts.length; i++) {
                    let bounds = editTexts[i].bounds();
                    // EditText应该在价格标签的下方（y坐标更大）或右侧
                    if (bounds.top >= labelBounds.top && bounds.top < labelBounds.bottom + 300) {
                        priceInput = editTexts[i];
                        break;
                    }
                }
                
                if (!priceInput && editTexts.length > 0) {
                    // 如果没找到，使用第一个EditText
                    priceInput = editTexts[0];
                }
                
                if (priceInput) {
                    priceInput.click();
                    sleep(500);
                    priceInput.setText(price.toString());
                    console.log("已填写价格: " + price);
                    return true;
                }
            }
        }
        
        // 方法2：在价格标签附近查找EditText（向上查找父容器）
        let current = priceLabel;
        for (let level = 0; level < 5; level++) {
            current = current.parent();
            if (!current) break;
            
            let editTexts = current.find(className("android.widget.EditText"));
            if (editTexts && editTexts.length > 0) {
                let labelBounds = priceLabel.bounds();
                for (let i = 0; i < editTexts.length; i++) {
                    let bounds = editTexts[i].bounds();
                    // 找到在价格标签附近的EditText，但要排除成本输入框
                    // 检查这个EditText不在"USDT(成本)"标签附近
                    let costLabel = desc("USDT(成本)").findOne(1000);
                    if (costLabel) {
                        let costBounds = costLabel.bounds();
                        // 如果这个EditText在成本标签附近，跳过它
                        if (Math.abs(bounds.left - costBounds.left) < 200 && 
                            Math.abs(bounds.top - costBounds.top) < 100) {
                            continue; // 跳过成本输入框
                        }
                    }
                    
                    if (Math.abs(bounds.top - labelBounds.bottom) < 200 || 
                        (bounds.top >= labelBounds.top && bounds.top < labelBounds.bottom + 300)) {
                        editTexts[i].click();
                        sleep(500);
                        editTexts[i].setText(price.toString());
                        console.log("已填写价格: " + price);
                        return true;
                    }
                }
            }
        }
    }
    
    console.log("未找到价格输入框");
    return false;
}

// 第四步：设置止盈止损
function setStopLossAndTakeProfit(stopLoss, takeProfit) {
    console.log("========== 设置止盈止损 - 止损: " + stopLoss + ", 止盈: " + takeProfit + " ==========");
    
    const maxRetries = 3; // 最大重试次数
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
        if (retryCount > 0) {
            console.log("========== 第 " + retryCount + " 次重试设置止盈止损 ==========");
            sleep(800); // 重试前等待
        }
        
        // 1. 点击"止盈/止损"按钮
        let stopLossBtn = desc("止盈/止损").findOne(3000);
        if (!stopLossBtn) {
            stopLossBtn = desc("止盈止损").findOne(3000);
        }
        if (!stopLossBtn) {
            stopLossBtn = textContains("止盈").findOne(3000);
        }
        if (!stopLossBtn) {
            stopLossBtn = textContains("止损").findOne(3000);
        }
        
        if (!stopLossBtn) {
            console.log("未找到止盈/止损按钮");
            if (retryCount < maxRetries) {
                retryCount++;
                continue; // 重试
            }
            return false;
        }
        
        stopLossBtn.click();
        console.log("已点击止盈/止损按钮");
        sleep(800); // 等待弹窗或界面展开
        
        let success = true;
        
        // 2. 填写止盈价格（根据描述"止盈\nUSDT"精确定位，EditText是其子元素）
        if (takeProfit) {
            // 先找到描述为"止盈\nUSDT"的View
            let takeProfitLabel = desc("止盈\nUSDT").findOne(3000);
            if (!takeProfitLabel) {
                takeProfitLabel = desc("止盈 USDT").findOne(3000);
            }
            if (!takeProfitLabel) {
                takeProfitLabel = descContains("止盈").findOne(3000);
            }
            
            if (takeProfitLabel) {
                console.log("找到止盈标签");
                // EditText是止盈标签的子元素（直接子元素）
                let takeProfitInput = takeProfitLabel.findOne(className("android.widget.EditText"));
                if (takeProfitInput) {
                    takeProfitInput.click();
                    sleep(500);
                    takeProfitInput.setText(takeProfit.toString());
                    console.log("已设置止盈: " + takeProfit);
                } else {
                    console.log("警告：未找到止盈输入框（EditText）");
                    success = false;
                }
            } else {
                console.log("警告：未找到止盈标签");
                success = false;
            }
        }
        
        // 3. 填写止损价格（根据描述"止损\nUSDT"精确定位，EditText是其子元素）
        if (stopLoss) {
            // 先找到描述为"止损\nUSDT"的View
            let stopLossLabel = desc("止损\nUSDT").findOne(3000);
            if (!stopLossLabel) {
                stopLossLabel = desc("止损 USDT").findOne(3000);
            }
            if (!stopLossLabel) {
                stopLossLabel = descContains("止损").findOne(3000);
            }
            
            if (stopLossLabel) {
                console.log("找到止损标签");
                // EditText是止损标签的子元素（直接子元素）
                let stopLossInput = stopLossLabel.findOne(className("android.widget.EditText"));
                if (stopLossInput) {
                    stopLossInput.click();
                    sleep(500);
                    stopLossInput.setText(stopLoss.toString());
                    console.log("已设置止损: " + stopLoss);
                } else {
                    console.log("警告：未找到止损输入框（EditText）");
                    success = false;
                }
            } else {
                console.log("警告：未找到止损标签");
                success = false;
            }
        }
        
        // 如果成功设置，退出循环
        if (success) {
            // 4. 确认设置（如果有确认按钮，可能需要点击）
            // 如果没有确认按钮，可能点击空白处关闭或自动保存
            sleep(500);
            
            // 5. 取消输入状态（关闭键盘）
            console.log("取消输入状态...");
            try {
                // 方法1: 点击空白区域（尝试点击屏幕顶部或底部）
                let screenWidth = device.width;
                let screenHeight = device.height;
                // 点击屏幕顶部空白区域
                click(screenWidth / 2, 100);
                sleep(500);
            } catch (e) {
                console.log("点击空白区域失败: " + e);
            }
            
            try {
                // 方法2: 使用返回键关闭键盘（如果键盘打开）
                back();
                sleep(500);
            } catch (e) {
                console.log("使用返回键失败: " + e);
            }
            
            console.log("已取消输入状态");
            return true;
        } else {
            // 如果失败且还有重试次数，继续重试
            if (retryCount < maxRetries) {
                retryCount++;
                // 关闭可能打开的弹窗
                try {
                    back();
                    sleep(500);
                } catch (e) {
                    console.log("关闭弹窗失败: " + e);
                }
                continue;
            } else {
                console.log("设置止盈止损失败，已达到最大重试次数");
                return false;
            }
        }
    }
    
    return false;
}

// 第五步：填写数量（根据"USDT(成本)"标签精确定位，EditText在同一个父容器中，在成本标签左边）
function fillAmount(amount) {
    console.log("========== 填写数量: " + amount + " ==========");
    
    // 找到描述为"USDT(成本)"的ImageView
    let costLabel = desc("USDT(成本)").findOne(3000);
    if (!costLabel) {
        costLabel = textContains("USDT(成本)").findOne(3000);
    }
    
    if (costLabel) {
        console.log("找到USDT(成本)标签");
        // 获取其父容器
        let parent = costLabel.parent();
        if (parent) {
            // 在父容器中查找EditText（根据结构树，EditText和ImageView在同一父容器中）
            let amountInput = parent.findOne(className("android.widget.EditText"));
            if (amountInput) {
                amountInput.click();
                sleep(500);
                amountInput.setText(amount.toString());
                console.log("已填写数量: " + amount);
                return true;
            } else {
                // 如果父容器中没找到，尝试查找所有EditText，找到在成本标签附近的
                let allEditTexts = className("android.widget.EditText").find();
                let costBounds = costLabel.bounds();
                
                for (let i = 0; i < allEditTexts.length; i++) {
                    let bounds = allEditTexts[i].bounds();
                    // 如果EditText在成本标签的左边（x坐标更小）或同一水平线
                    if (bounds.right < costBounds.left || 
                        (Math.abs(bounds.top - costBounds.top) < 50 && bounds.right < costBounds.left + 100)) {
                        allEditTexts[i].click();
                        sleep(500);
                        allEditTexts[i].setText(amount.toString());
                        console.log("已填写数量: " + amount);
                        return true;
                    }
                }
            }
        }
    }
    
    console.log("未找到数量输入框");
    return false;
}

// 选择币种（如果需要）
function selectSymbol(symbol) {
    if (!symbol) {
        console.log("未提供币种，跳过选择");
        return true;
    }
    
    // 从 symbol 中提取币种名称（例如 "BTC/USDT" -> "BTC"）
    let targetCoin = symbol.split("/")[0].toUpperCase();
    console.log("目标币种: " + targetCoin);
    
    try {
        // 查找顶部的币种选择按钮（ImageView，描述包含"USDT 永续"）
        // 例如：描述为 "ETHUSDT 永续 +0.62%" 的 ImageView
        let symbolButton = null;
        
        // 方法1: 查找所有 ImageView，找到描述包含"USDT 永续"的
        let allImageViews = className("android.widget.ImageView").find();
        for (let i = 0; i < allImageViews.length; i++) {
            let desc = allImageViews[i].desc() || "";
            if (desc.includes("USDT") && desc.includes("永续")) {
                symbolButton = allImageViews[i];
                console.log("找到币种选择按钮: " + desc);
                break;
            }
        }
        
        if (!symbolButton) {
            console.log("未找到币种选择按钮");
            return false;
        }
        
        // 从当前描述中提取币种（例如 "ETHUSDT 永续" -> "ETH"）
        let currentDesc = symbolButton.desc() || "";
        console.log("当前币种描述: " + currentDesc);
        
        let currentCoin = "";
        if (currentDesc.includes("USDT")) {
            // 提取USDT之前的币种名称（例如 "ETHUSDT" -> "ETH"）
            let match = currentDesc.match(/([A-Z]+)USDT/);
            if (match && match[1]) {
                currentCoin = match[1].toUpperCase();
            }
        }
        
        console.log("当前币种: " + currentCoin + ", 目标币种: " + targetCoin);
        
        // 如果币种一致，不需要切换
        if (currentCoin === targetCoin) {
            console.log("币种一致，无需切换");
            return true;
        }
        
        // 币种不一致，需要切换
        console.log("币种不一致，需要切换到: " + targetCoin);
        
        // 点击币种选择按钮，打开弹窗
        symbolButton.click();
        console.log("已点击币种选择按钮，等待弹窗打开...");
        sleep(800); // 等待弹窗打开
        
        // 在弹窗中选择目标币种（合约币种选项默认按照USDT计价，所以查找"BTCUSDT"格式）
        let targetSymbolText = targetCoin + "USDT"; // 例如 "BTCUSDT"
        console.log("在弹窗中选择币种: " + targetSymbolText);
        let symbolOption = null;
        
        // 方法1: 通过文本查找币种（例如 "BTCUSDT"）
        symbolOption = text(targetSymbolText).findOne(3000);
        if (!symbolOption) {
            // 方法2: 通过描述查找
            symbolOption = desc(targetSymbolText).findOne(3000);
        }
        if (!symbolOption) {
            // 方法3: 查找包含币种文本的元素（例如包含"BTCUSDT"）
            symbolOption = textContains(targetSymbolText).findOne(3000);
        }
        if (!symbolOption) {
            symbolOption = descContains(targetSymbolText).findOne(3000);
        }
        if (!symbolOption) {
            // 方法4: 查找所有可点击元素，查找包含币种名称的
            let allClickable = className("android.view.View").clickable(true).find();
            for (let i = 0; i < allClickable.length; i++) {
                let text = allClickable[i].text() || "";
                let desc = allClickable[i].desc() || "";
                if (text.includes(targetSymbolText) || desc.includes(targetSymbolText)) {
                    symbolOption = allClickable[i];
                    break;
                }
            }
        }
        if (!symbolOption) {
            // 方法5: 查找 TextView，查找包含币种名称的
            let allTextViews = className("android.widget.TextView").find();
            for (let i = 0; i < allTextViews.length; i++) {
                let text = allTextViews[i].text() || "";
                let desc = allTextViews[i].desc() || "";
                if (text.includes(targetSymbolText) || desc.includes(targetSymbolText)) {
                    symbolOption = allTextViews[i];
                    break;
                }
            }
        }
        
        if (symbolOption) {
            symbolOption.click();
            console.log("已选择币种: " + targetSymbolText);
            sleep(800); // 等待弹窗关闭和币种切换完成
            return true;
        } else {
            console.log("未找到币种选项: " + targetSymbolText);
            // 尝试关闭弹窗
            back();
            sleep(500);
            return false;
        }
    } catch (e) {
        console.log("选择币种失败: " + e);
        // 尝试关闭可能打开的弹窗
        try {
            back();
            sleep(500);
        } catch (e2) {
            console.log("关闭弹窗失败: " + e2);
        }
        return false;
    }
}

// 查看委托列表（点击"委托"标签）
function viewOrderList() {
    console.log("========== 查看委托列表 ==========");
    
    try {
        // 查找"委托 (n)"标签，其中n是委托数量
        // 描述格式: "委托 (n)\n第 2 个标签，共 2 个"
        let orderTab = descContains("委托 (").findOne(3000);
        if (!orderTab) {
            // 尝试查找包含"委托"的标签
            orderTab = descContains("委托").findOne(3000);
        }
        if (!orderTab) {
            // 尝试通过文本查找
            orderTab = textContains("委托").findOne(3000);
        }
        
        if (orderTab) {
            console.log("找到委托标签，准备点击");
            let desc = orderTab.desc() || "";
            console.log("委托标签描述: " + desc);
            orderTab.click();
            console.log("已点击委托标签，查看委托列表");
            sleep(800); // 等待页面切换
            return true;
        } else {
            console.log("未找到委托标签");
            return false;
        }
    } catch (e) {
        console.log("查看委托列表失败: " + e);
        return false;
    }
}

// 执行买入订单
function executeBuyOrder(orderData) {
    console.log("========== 执行买入订单 ==========");
    console.log("交易对: " + orderData.symbol);
    console.log("数量: " + orderData.amount);
    console.log("价格: " + (orderData.price || "市价"));
    console.log("订单类型: " + orderData.orderType);
    console.log("止损: " + (orderData.stopLoss || "无"));
    console.log("止盈: " + (orderData.takeProfit || "无"));
    
    toast("执行买入: " + orderData.symbol + " " + orderData.amount);
    
    try {
        // 操作表单前先滚动到顶部
        console.log("滚动到页面顶部...");
        try {
            scrollToBeginning();
        } catch (e) {
            // 如果 scrollToBeginning 不可用，尝试多次向上滚动
            for (let i = 0; i < 10; i++) {
                scrollUp();
                sleep(100);
            }
        }
        sleep(500);
        
        // 第一步：检查并选择币种（如果需要）
        if (orderData.symbol) {
            if (!selectSymbol(orderData.symbol)) {
                sendMessage({
                    "type": "order_result",
                    "action": "buy",
                    "status": "error",
                    "message": "无法选择币种: " + orderData.symbol
                });
                return false;
            }
            sleep(500);
        }
        
        // 第二步：检查全仓/分仓
        if (!checkMarginMode()) {
            sendMessage({
                "type": "order_result",
                "action": "buy",
                "status": "error",
                "message": "请选择全仓模式"
            });
            return false;
        }
        sleep(500);
        
        // 第三步：如果是限价单，确保切换到限价委托
        if (orderData.orderType === "limit") {
            if (!ensureLimitOrder()) {
                sendMessage({
                    "type": "order_result",
                    "action": "buy",
                    "status": "error",
                    "message": "无法切换到限价委托"
                });
                return false;
            }
            sleep(500);
            
            // 第五步：填写委托价格
            if (orderData.price) {
                if (!fillPrice(orderData.price)) {
                    console.log("填写价格失败，继续执行");
                }
                sleep(500);
            }
        }
        
        // 第四步：填写数量
        if (!fillAmount(orderData.amount)) {
            console.log("填写数量失败，继续执行");
        }
        sleep(500);
        
        // 第五步：设置止盈止损
        if (orderData.stopLoss || orderData.takeProfit) {
            setStopLossAndTakeProfit(orderData.stopLoss, orderData.takeProfit);
            sleep(500);
        }
        
        // todo 后续要根据前端的配置来设置是否直接下单。
        // 第六步：点击"开多"按钮
        let buyButton = desc("开多").findOne(3000);
        if (!buyButton) {
            buyButton = text("开多").findOne(3000);
        }
        if (!buyButton) {
            // 尝试查找包含"开多"的按钮
            let allViews = className("android.view.View").find();
            for (let i = 0; i < allViews.length; i++) {
                let desc = allViews[i].desc() || "";
                if (desc.includes("开多")) {
                    buyButton = allViews[i];
                    break;
                }
            }
        }
        
        if (buyButton) {
            buyButton.click();
            console.log("已点击开多按钮");
            toast("已提交买入订单");
            sleep(800);
            
            // 发送执行结果
            sendMessage({
                "type": "order_result",
                "action": "buy",
                "status": "success",
                "orderId": "ORDER_" + new Date().getTime(),
                "message": "买入订单已执行"
            });
            
            // 第七步：查看委托列表
            viewOrderList();
            
            return true;
        } else {
            console.log("未找到开多按钮");
            toast("未找到开多按钮");
            
            sendMessage({
                "type": "order_result",
                "action": "buy",
                "status": "error",
                "message": "未找到开多按钮"
            });
            return false;
        }
    } catch (e) {
        console.log("执行买入订单失败: " + e);
        toast("执行失败: " + e);
        
        sendMessage({
            "type": "order_result",
            "action": "buy",
            "status": "error",
            "message": "执行失败: " + e
        });
        return false;
    }
}

// 执行卖出订单
function executeSellOrder(orderData) {
    console.log("========== 执行卖出订单 ==========");
    console.log("交易对: " + orderData.symbol);
    console.log("数量: " + orderData.amount);
    console.log("价格: " + (orderData.price || "市价"));
    console.log("订单类型: " + orderData.orderType);
    console.log("止损: " + (orderData.stopLoss || "无"));
    console.log("止盈: " + (orderData.takeProfit || "无"));
    
    toast("执行卖出: " + orderData.symbol + " " + orderData.amount);
    
    try {
        // 操作表单前先滚动到顶部
        console.log("滚动到页面顶部...");
        try {
            scrollToBeginning();
        } catch (e) {
            // 如果 scrollToBeginning 不可用，尝试多次向上滚动
            for (let i = 0; i < 10; i++) {
                scrollUp();
                sleep(100);
            }
        }
        sleep(500);
        
        // 第一步：检查并选择币种（如果需要）
        if (orderData.symbol) {
            if (!selectSymbol(orderData.symbol)) {
                sendMessage({
                    "type": "order_result",
                    "action": "sell",
                    "status": "error",
                    "message": "无法选择币种: " + orderData.symbol
                });
                return false;
            }
            sleep(500);
        }
        
        // 第二步：检查全仓/分仓
        if (!checkMarginMode()) {
            sendMessage({
                "type": "order_result",
                "action": "sell",
                "status": "error",
                "message": "请选择全仓模式"
            });
            return false;
        }
        sleep(500);
        
        // 第三步：如果是限价单，确保切换到限价委托
        if (orderData.orderType === "limit") {
            if (!ensureLimitOrder()) {
                sendMessage({
                    "type": "order_result",
                    "action": "sell",
                    "status": "error",
                    "message": "无法切换到限价委托"
                });
                return false;
            }
            sleep(500);
            
            // 第四步：填写委托价格
            if (orderData.price) {
                if (!fillPrice(orderData.price)) {
                    console.log("填写价格失败，继续执行");
                }
                sleep(500);
            }
        }
        
        // 第四步：填写数量
        if (!fillAmount(orderData.amount)) {
            console.log("填写数量失败，继续执行");
        }
        sleep(500);
        
        // 第五步：设置止盈止损
        if (orderData.stopLoss || orderData.takeProfit) {
            setStopLossAndTakeProfit(orderData.stopLoss, orderData.takeProfit);
            sleep(500);
        }
        
        // 第六步：点击"开空"按钮
        let sellButton = desc("开空").findOne(3000);
        if (!sellButton) {
            sellButton = text("开空").findOne(3000);
        }
        if (!sellButton) {
            // 尝试查找包含"开空"的按钮
            let allViews = className("android.view.View").find();
            for (let i = 0; i < allViews.length; i++) {
                let desc = allViews[i].desc() || "";
                if (desc.includes("开空")) {
                    sellButton = allViews[i];
                    break;
                }
            }
        }
        
        if (sellButton) {
            sellButton.click();
            console.log("已点击开空按钮");
            toast("已提交卖出订单");
            sleep(800);
            
            // 发送执行结果
            sendMessage({
                "type": "order_result",
                "action": "sell",
                "status": "success",
                "orderId": "ORDER_" + new Date().getTime(),
                "message": "卖出订单已执行"
            });
            
            // 第七步：查看委托列表
            viewOrderList();
            
            return true;
        } else {
            console.log("未找到开空按钮");
            toast("未找到开空按钮");
            
            sendMessage({
                "type": "order_result",
                "action": "sell",
                "status": "error",
                "message": "未找到开空按钮"
            });
            return false;
        }
    } catch (e) {
        console.log("执行卖出订单失败: " + e);
        toast("执行失败: " + e);
        
        sendMessage({
            "type": "order_result",
            "action": "sell",
            "status": "error",
            "message": "执行失败: " + e
        });
        return false;
    }
}

// 启动 WebSocket 连接
initWebSocket();

toast("合约交易客户端已启动");

// ========== 以下代码用于调试时打印页面元素 ==========
// 打开易币应用并进入合约页面
function openYiBiApp() {
    console.log("========== 开始打开易币应用 ==========");
    
    // 直接使用已知的包名
    const packageName = "io.easiex.app";
    console.log("使用包名启动应用: " + packageName);
    
    try {
        // 使用包名启动应用
        app.launch(packageName);
        console.log("已通过包名启动应用: " + packageName);
        toast("正在打开易币应用...");
        sleep(3000); // 等待应用启动
    } catch (e) {
        console.log("启动应用失败: " + e);
        toast("无法启动易币应用，请手动打开");
        return false;
    }
    
    // 等待应用完全加载
    sleep(2000);
    
    // 打印元素节点树（用于调试广告层等问题）
    console.log("========== 开始打印元素节点树 ==========");
    try {
        // 打印所有可点击的元素
        console.log("--- 可点击的元素 ---");
        let clickableElements = className("android.view.View").clickable(true).find();
        console.log("可点击的 View 数量: " + clickableElements.length);
        for (let i = 0; i < Math.min(clickableElements.length, 50); i++) {
            let elem = clickableElements[i];
            let bounds = elem.bounds();
            let elemText = elem.text() || "";
            let elemDesc = elem.desc() || "";
            console.log("[" + i + "] 类名: " + elem.className() + ", 文本: \"" + elemText + "\", 描述: \"" + elemDesc + "\", 坐标: " + bounds.left + "," + bounds.top + "-" + bounds.right + "," + bounds.bottom + ", 可点击: " + elem.clickable());
        }
        
        // 打印所有 ImageView 元素（可能包含广告或关闭按钮）
        console.log("--- ImageView 元素 ---");
        let imageViews = className("android.widget.ImageView").find();
        console.log("ImageView 数量: " + imageViews.length);
        for (let i = 0; i < Math.min(imageViews.length, 50); i++) {
            let elem = imageViews[i];
            let bounds = elem.bounds();
            let elemText = elem.text() || "";
            let elemDesc = elem.desc() || "";
            console.log("[" + i + "] 文本: \"" + elemText + "\", 描述: \"" + elemDesc + "\", 坐标: " + bounds.left + "," + bounds.top + "-" + bounds.right + "," + bounds.bottom + ", 可点击: " + elem.clickable());
        }
        
        // 打印所有 TextView 元素（可能包含文本按钮）
        console.log("--- TextView 元素（前30个）---");
        let textViews = className("android.widget.TextView").find();
        console.log("TextView 数量: " + textViews.length);
        for (let i = 0; i < Math.min(textViews.length, 30); i++) {
            let elem = textViews[i];
            let bounds = elem.bounds();
            let elemText = elem.text() || "";
            let elemDesc = elem.desc() || "";
            console.log("[" + i + "] 文本: \"" + elemText + "\", 描述: \"" + elemDesc + "\", 坐标: " + bounds.left + "," + bounds.top + "-" + bounds.right + "," + bounds.bottom + ", 可点击: " + elem.clickable());
        }
        
        // 打印所有包含"关闭"、"跳过"、"X"等关键词的元素（可能是广告关闭按钮）
        console.log("--- 可能包含关闭/跳过按钮的元素 ---");
        let closeKeywords = ["关闭", "跳过", "X", "取消", "知道了", "不再提示"];
        for (let j = 0; j < closeKeywords.length; j++) {
            let keyword = closeKeywords[j];
            let closeElements = textContains(keyword).find();
            for (let i = 0; i < closeElements.length; i++) {
                let elem = closeElements[i];
                let bounds = elem.bounds();
                let elemText = elem.text() || "";
                let elemDesc = elem.desc() || "";
                console.log("关键词\"" + keyword + "\": 文本: \"" + elemText + "\", 描述: \"" + elemDesc + "\", 坐标: " + bounds.left + "," + bounds.top + "-" + bounds.right + "," + bounds.bottom + ", 可点击: " + elem.clickable());
            }
        }
        
        // 打印屏幕顶部的元素（可能是广告层）
        console.log("--- 屏幕顶部元素（可能是广告层）---");
        let screenHeight = device.height;
        let topElements = className("android.view.View").find();
        for (let i = 0; i < Math.min(topElements.length, 100); i++) {
            let elem = topElements[i];
            let bounds = elem.bounds();
            // 只打印屏幕顶部1/3区域的元素
            if (bounds.top < screenHeight / 3) {
                let elemText = elem.text() || "";
                let elemDesc = elem.desc() || "";
                console.log("顶部元素: 类名: " + elem.className() + ", 文本: \"" + elemText + "\", 描述: \"" + elemDesc + "\", 坐标: " + bounds.left + "," + bounds.top + "-" + bounds.right + "," + bounds.bottom + ", 可点击: " + elem.clickable());
            }
        }
        
        console.log("========== 元素节点树打印完成 ==========");
        
        // 检查是否有广告层，如果有就关闭
        console.log("========== 检查广告层 ==========");
        let screenWidth = device.width;
        // screenHeight 已在上面声明，这里直接使用
        
        // 查找全屏覆盖的可点击元素（可能是广告层）
        let fullScreenClickable = className("android.view.View").clickable(true).find();
        let adLayerFound = false;
        let closeButton = null;
        
        for (let i = 0; i < fullScreenClickable.length; i++) {
            let elem = fullScreenClickable[i];
            let bounds = elem.bounds();
            let elemDesc = elem.desc() || "";
            
            // 检查是否是全屏覆盖的元素（坐标接近 0,0-屏幕宽,屏幕高）
            if (bounds.left <= 10 && bounds.top <= 10 && 
                bounds.right >= screenWidth - 10 && bounds.bottom >= screenHeight - 10) {
                console.log("发现全屏覆盖元素，描述: \"" + elemDesc + "\", 可点击: " + elem.clickable());
                
                // 如果描述包含"关闭"，就是关闭按钮
                if (elemDesc && elemDesc.includes("关闭")) {
                    closeButton = elem;
                    adLayerFound = true;
                    console.log("找到广告关闭按钮");
                    break;
                }
            }
        }
        
        // 如果没找到，尝试查找描述为"关闭"的可点击元素
        if (!closeButton) {
            let closeElements = desc("关闭").clickable(true).find();
            if (closeElements.length > 0) {
                // 检查是否是全屏覆盖的元素
                for (let i = 0; i < closeElements.length; i++) {
                    let elem = closeElements[i];
                    let bounds = elem.bounds();
                    if (bounds.left <= 10 && bounds.top <= 10 && 
                        bounds.right >= screenWidth - 10 && bounds.bottom >= screenHeight - 10) {
                        closeButton = elem;
                        adLayerFound = true;
                        console.log("找到广告关闭按钮（通过描述查找）");
                        break;
                    }
                }
            }
        }
        
        // 如果找到广告层和关闭按钮，点击关闭
        if (adLayerFound && closeButton) {
            console.log("检测到广告层，正在关闭...");
            try {
                closeButton.click();
                console.log("已点击广告关闭按钮");
                sleep(1000); // 等待广告关闭
                toast("已关闭广告");
            } catch (e) {
                console.log("点击广告关闭按钮失败: " + e);
                // 如果点击失败，尝试按返回键
                try {
                    back();
                    sleep(1000);
                    console.log("已使用返回键关闭广告");
                } catch (e2) {
                    console.log("使用返回键失败: " + e2);
                }
            }
        } else {
            console.log("未检测到广告层，继续执行");
        }
        
    } catch (e) {
        console.log("打印元素节点树失败: " + e);
    }
    
    // 查找并点击底部的"合约"按钮
    console.log("正在查找合约按钮...");
    let contractButton = null;
    
    // 尝试多种方式查找合约按钮
    // 方式1: 通过文本查找
    contractButton = text("合约").findOne(3000);
    if (!contractButton) {
        // 方式2: 通过描述查找
        contractButton = desc("合约").findOne(3000);
    }
    if (!contractButton) {
        // 方式3: 通过包含"合约"的文本查找
        contractButton = textContains("合约").findOne(3000);
    }
    if (!contractButton) {
        // 方式4: 查找底部导航栏的可点击元素
        let clickableElements = className("android.widget.TextView").clickable(true).find();
        for (let i = 0; i < clickableElements.length; i++) {
            let text = clickableElements[i].text() || clickableElements[i].desc();
            if (text && text.includes("合约")) {
                contractButton = clickableElements[i];
                break;
            }
        }
    }
    
    if (contractButton) {
        console.log("找到合约按钮，准备点击");
        console.log("按钮信息 - 文本: " + (contractButton.text() || "(无)"));
        console.log("按钮信息 - 描述: " + (contractButton.desc() || "(无)"));
        console.log("按钮信息 - 类名: " + contractButton.className());
        console.log("按钮信息 - 坐标: " + contractButton.bounds());
        
        contractButton.click();
        toast("已点击合约按钮");
        console.log("已点击合约按钮");
        sleep(800); // 等待页面加载
        return true;
    } else {
        console.log("未找到合约按钮，请手动点击");
        
        toast("未找到合约按钮，请手动点击底部合约");
        return false;
    }
}

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

// 执行打开应用和打印元素流程
console.log("========== 开始执行应用打开和元素打印流程 ==========");

// 打开易币应用并进入合约页面
if (openYiBiApp()) {
    console.log("========== 应用已打开，开始打印页面元素 ==========");
    
    // 等待页面完全加载
    sleep(800);
    
    // 获取当前窗口的根节点
    let root = className("android.view.View").findOne(3000);
    if (!root) {
        root = className("android.widget.FrameLayout").findOne(3000);
    }
    if (!root) {
        root = className("android.widget.LinearLayout").findOne(3000);
    }
    if (!root) {
        root = className("android.widget.RelativeLayout").findOne(3000);
    }
    
    if (root) {
        console.log("找到根节点，开始递归打印...");
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
} else {
    console.log("应用打开失败，跳过元素打印");
}

// // ========== 测试代码：手动执行一条测试订单 ==========
// // 取消下面的注释来执行测试

// console.log("========== 开始测试订单执行 ==========");
// const testOrder = {
//     "action": "buy",
//     "symbol": "BTC/USDT",
//     "amount": 0.01,
//     "price": 50000,
//     "orderType": "limit",
//     "leverage": 10,
//     "stopLoss": 49000,
//     "takeProfit": 52000
// };

// // 等待应用打开并进入合约页面
// sleep(5000);
// handleMessage(JSON.stringify(testOrder));

