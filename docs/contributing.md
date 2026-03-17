# 贡献指南

## 开发流程

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'feat: add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 发起 Pull Request

## Commit 规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `refactor:` 重构
- `chore:` 构建/工具变更

## 本地开发

见 [getting-started.md](getting-started.md)。

## 代码规范

后端使用 ESLint + Prettier，提交前运行：

```bash
cd backend
npm run lint
npm run format
```

## 安全

**不要**在代码或 commit 中包含任何 API 密钥、密码或私钥。所有敏感配置通过 `.env` 文件管理，`.env` 已在 `.gitignore` 中排除。

发现安全漏洞请通过 Issue 私下报告，不要公开披露。
