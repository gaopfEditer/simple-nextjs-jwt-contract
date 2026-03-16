#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 3123 端口 OpenClaw WebSocket 与 Webhook（与 test-openclaw-ws-webhook.js 流程一致）

1. 连接 ws://localhost:3123/api/ws?type=openclaw
2. 收到 welcome 后调用 POST /api/openclaw/webhook 发送 nextRole
3. 验证 WebSocket 收到 openclaw_next_role

运行: python test/test_3123.py
请先启动服务: npm run dev 或 node server.js
"""

import asyncio
import json
import os
import sys

import aiohttp
import websockets

PORT = int(os.environ.get("PORT", "3123"))
WS_URI = f"ws://localhost:{PORT}/api/ws?type=openclaw"
WEBHOOK_URL = f"http://localhost:{PORT}/api/openclaw/webhook"


async def call_webhook(next_role: str) -> dict:
    """调用 OpenClaw Webhook"""
    payload = {"nextRole": next_role}
    async with aiohttp.ClientSession() as session:
        async with session.post(WEBHOOK_URL, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            text = await resp.text()
            body = json.loads(text) if text.strip() else {}
            return {"status": resp.status, "body": body}


async def run_test():
    print("OpenClaw 测试 (WebSocket + Webhook)")
    print(f"端口: {PORT}")
    print()
    print(f"> 连接 WebSocket: {WS_URI}")

    try:
        async with websockets.connect(
            WS_URI,
            ping_interval=20,
            ping_timeout=10,
            close_timeout=5,
        ) as ws:
            print("> WebSocket 已连接")

            # 1. 等待 welcome
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            msg = json.loads(raw)
            if msg.get("type") != "welcome":
                print(f"> 收到非 welcome: {msg.get('type')}")
            else:
                print(f"> 收到 welcome, clientId: {msg.get('clientId')}")

            # 2. 调用 webhook
            print("> 调用 OpenClaw Webhook, nextRole: TestRole_1")
            result = await call_webhook("TestRole_1")
            print(f"> Webhook 响应: {result['status']}", json.dumps(result["body"], indent=2, ensure_ascii=False))
            if result["status"] != 200:
                raise RuntimeError(f"Webhook 返回 {result['status']}")

            # 3. 等待 openclaw_next_role
            raw = await asyncio.wait_for(ws.recv(), timeout=5.0)
            msg = json.loads(raw)
            if msg.get("type") != "openclaw_next_role":
                raise RuntimeError(f"未收到 openclaw_next_role，收到: {msg.get('type')}")
            next_role = msg.get("nextRole")
            print(f"> 收到 openclaw_next_role: {next_role}")

        print()
        print("[OK] 测试通过，收到的 nextRole:", next_role)
        return True

    except asyncio.TimeoutError as e:
        print(f"\n[FAIL] 测试失败: 超时 - {e}")
        return False
    except (websockets.exceptions.InvalidMessage, ConnectionRefusedError, OSError) as e:
        print(f"\n[FAIL] 连接失败: {e}")
        print("  请确认服务已启动: npm run dev 或 node server.js")
        return False
    except Exception as e:
        print(f"\n[FAIL] 测试失败: {e}")
        return False


def main():
    ok = asyncio.run(run_test())
    exit(0 if ok else 1)


if __name__ == "__main__":
    main()
