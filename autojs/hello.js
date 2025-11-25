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
            sleep(1000);
            
            // 再次检查是否切换成功
            let newOrderType = desc("限价委托").findOne(2000);
            if (newOrderType) {
                console.log("已切换为限价委托");
                return true;
            } else {
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
        return false;
    }
    
    stopLossBtn.click();
    console.log("已点击止盈/止损按钮");
    sleep(1500); // 等待弹窗或界面展开
    
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
            }
        } else {
            console.log("警告：未找到止盈标签");
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
            }
        } else {
            console.log("警告：未找到止损标签");
        }
    }
    
    // 4. 确认设置（如果有确认按钮，可能需要点击）
    // 如果没有确认按钮，可能点击空白处关闭或自动保存
    sleep(500);
    
    return true;
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
        // 第一步：检查全仓/分仓
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
        
        // 第二步：如果是限价单，确保切换到限价委托
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
            
            // 第三步：填写委托价格
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
        // // 第六步：点击"开多"按钮
        // let buyButton = desc("开多").findOne(3000);
        // if (!buyButton) {
        //     buyButton = text("开多").findOne(3000);
        // }
        // if (!buyButton) {
        //     // 尝试查找包含"开多"的按钮
        //     let allViews = className("android.view.View").find();
        //     for (let i = 0; i < allViews.length; i++) {
        //         let desc = allViews[i].desc() || "";
        //         if (desc.includes("开多")) {
        //             buyButton = allViews[i];
        //             break;
        //         }
        //     }
        // }
        
        // if (buyButton) {
        //     buyButton.click();
        //     console.log("已点击开多按钮");
        //     toast("已提交买入订单");
        //     sleep(1000);
            
        //     // 发送执行结果
        //     sendMessage({
        //         "type": "order_result",
        //         "action": "buy",
        //         "status": "success",
        //         "orderId": "ORDER_" + new Date().getTime(),
        //         "message": "买入订单已执行"
        //     });
        //     return true;
        // } else {
        //     console.log("未找到开多按钮");
        //     toast("未找到开多按钮");
            
        //     sendMessage({
        //         "type": "order_result",
        //         "action": "buy",
        //         "status": "error",
        //         "message": "未找到开多按钮"
        //     });
        //     return false;
        // }
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
        // 第一步：检查全仓/分仓
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
        
        // 第二步：如果是限价单，确保切换到限价委托
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
            
            // 第三步：填写委托价格
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
            sleep(1000);
            
            // 发送执行结果
            sendMessage({
                "type": "order_result",
                "action": "sell",
                "status": "success",
                "orderId": "ORDER_" + new Date().getTime(),
                "message": "卖出订单已执行"
            });
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
        sleep(2000); // 等待页面加载
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
    sleep(2000);
    
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

// ========== 测试代码：手动执行一条测试订单 ==========
// 取消下面的注释来执行测试

console.log("========== 开始测试订单执行 ==========");
const testOrder = {
    "action": "buy",
    "symbol": "BTC/USDT",
    "amount": 0.01,
    "price": 50000,
    "orderType": "limit",
    "leverage": 10,
    "stopLoss": 49000,
    "takeProfit": 52000
};

// 等待应用打开并进入合约页面
sleep(5000);
handleMessage(JSON.stringify(testOrder));

