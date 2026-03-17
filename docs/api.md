# API 文档

Base URL: `http://localhost:3000/api`

认证方式：`Authorization: Bearer <token>`（登录后获取）

---

## 认证

### 注册
`POST /auth/register`

```json
{ "email": "user@example.com", "password": "yourpassword", "username": "yourname" }
```

### 登录
`POST /auth/login`

```json
{ "email": "user@example.com", "password": "yourpassword" }
```

返回 `{ "token": "..." }`

---

## 需求

### 获取需求列表
`GET /requirements`

查询参数：`status`、`limit`、`offset`

### 获取需求详情
`GET /requirements/:id`

### 提交需求
`POST /requirements` 🔒

```json
{ "title": "需求标题", "description": "详细描述" }
```

### 审核需求（管理员）
`POST /requirements/:id/approve` 🔒👑  
`POST /requirements/:id/reject` 🔒👑

---

## 投票

### 投票
`POST /votes` 🔒

```json
{ "requirementId": 1 }
```

### 查询剩余票数
`GET /votes/limit` 🔒

---

## 评论

### 获取评论
`GET /comments/requirement/:requirementId`

### 发表评论
`POST /comments` 🔒

```json
{ "requirementId": 1, "content": "评论内容" }
```

---

## AI 生成

### 生成应用原型
`POST /app-generation/generate` 🔒

```json
{ "requirementId": 1 }
```

### 查询生成状态
`GET /app-generation/status/:taskId` 🔒

---

## 积分

### 查询积分余额
`GET /credits/balance` 🔒

### 积分消费记录
`GET /credits/history` 🔒

---

🔒 需要登录  
👑 需要管理员权限
