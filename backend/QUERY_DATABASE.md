# 查询 generated_apps 表

## 连接到 MySQL

根据你的配置（`.env` 文件），使用以下命令连接：

```bash
mysql -h localhost -P 3306 -u root -p vote_kit_dev
```

或者如果使用 Docker：

```bash
docker exec -it <mysql_container_name> mysql -u root -p vote_kit_dev
```

## 基本查询命令

### 1. 查看所有应用

```sql
SELECT * FROM generated_apps ORDER BY created_at DESC;
```

### 2. 查看应用数量

```sql
SELECT COUNT(*) as total FROM generated_apps;
```

### 3. 查看应用及其关联的需求和用户信息

```sql
SELECT 
    ga.*,
    r.title as requirement_title,
    u.username as creator_username
FROM generated_apps ga
LEFT JOIN requirements r ON ga.requirement_id = r.id
LEFT JOIN users u ON ga.created_by = u.id
ORDER BY ga.created_at DESC;
```

### 4. 查看特定状态的应用

```sql
SELECT * FROM generated_apps WHERE status = 'generating';
```

### 5. 查看最近创建的应用

```sql
SELECT * FROM generated_apps ORDER BY created_at DESC LIMIT 10;
```

### 6. 查看应用的表结构

```sql
DESCRIBE generated_apps;
```

或者：

```sql
SHOW CREATE TABLE generated_apps;
```

### 7. 查看特定应用

```sql
SELECT * FROM generated_apps WHERE id = 24;
```

### 8. 查看应用及其 tokens 和费用

```sql
SELECT 
    id,
    name,
    status,
    tokens_used,
    cost_cents,
    billing_status,
    created_at
FROM generated_apps
ORDER BY created_at DESC;
```

## 调试查询

### 检查是否有数据

```sql
SELECT COUNT(*) as count, status FROM generated_apps GROUP BY status;
```

### 检查外键关联

```sql
-- 检查 requirement_id 是否都能找到对应的需求
SELECT ga.id, ga.requirement_id, r.id as req_exists
FROM generated_apps ga
LEFT JOIN requirements r ON ga.requirement_id = r.id
WHERE r.id IS NULL;

-- 检查 created_by 是否都能找到对应的用户
SELECT ga.id, ga.created_by, u.id as user_exists
FROM generated_apps ga
LEFT JOIN users u ON ga.created_by = u.id
WHERE u.id IS NULL;
```

### 查看最新的应用记录

```sql
SELECT 
    id,
    name,
    requirement_id,
    created_by,
    status,
    created_at
FROM generated_apps
ORDER BY id DESC
LIMIT 5;
```

## 环境变量

确保你的 `.env` 文件包含正确的数据库配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vote_kit_dev
```

## 使用 Node.js 查询（用于调试）

你也可以在代码中添加临时查询：

```typescript
// 在路由中添加调试代码
const testApps = await db('generated_apps').select('*');
console.log('All apps:', testApps);
```

