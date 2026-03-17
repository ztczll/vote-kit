#!/bin/bash

# 快速测试应用生成功能

echo "🧪 测试应用生成功能"
echo "==================="

# 1. 注册测试用户
echo "👤 注册测试用户..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123"
  }')

echo "注册响应: $REGISTER_RESPONSE"

# 2. 登录获取token
echo "🔐 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }')

echo "登录响应: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:20}..."

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取token"
  exit 1
fi

# 3. 创建需求
echo "📋 创建测试需求..."
REQUIREMENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/requirements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "带呼吸灯的冥想web应用",
    "description": "生成一个带呼吸灯的冥想web应用，帮助用户放松和冥想",
    "category": "health",
    "priority": "medium"
  }')

echo "需求创建响应: $REQUIREMENT_RESPONSE"

REQUIREMENT_ID=$(echo $REQUIREMENT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "需求ID: $REQUIREMENT_ID"

if [ -z "$REQUIREMENT_ID" ]; then
  echo "❌ 需求创建失败"
  exit 1
fi

# 4. 测试应用生成
echo "🤖 测试应用生成..."
APP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/apps/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"requirementId\": \"$REQUIREMENT_ID\",
    \"devPlan\": \"创建一个现代化的冥想应用，包括：\\n1. 呼吸灯动画效果\\n2. 冥想计时器\\n3. 响应式设计\\n4. 舒缓的背景音乐\"
  }")

echo "应用生成响应: $APP_RESPONSE"

# 检查是否成功
if echo $APP_RESPONSE | grep -q '"success":true'; then
  echo "✅ 应用生成请求成功提交！"
  APP_ID=$(echo $APP_RESPONSE | grep -o '"appId":[0-9]*' | cut -d':' -f2)
  echo "应用ID: $APP_ID"
  
  # 5. 查看应用状态
  echo "👀 查看应用状态..."
  STATUS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/apps/$APP_ID/status \
    -H "Authorization: Bearer $TOKEN")
  echo "状态响应: $STATUS_RESPONSE"
  
else
  echo "❌ 应用生成失败"
  echo "错误详情: $APP_RESPONSE"
fi

echo ""
echo "🎯 测试完成"
echo "现在可以通过前端界面 http://localhost 继续测试"
