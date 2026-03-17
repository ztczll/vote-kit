<template>
  <div class="verify-page">
    <div class="verify-card">
      <div class="icon success">
        <el-icon><CircleCheck /></el-icon>
      </div>
      <h1 class="title">邮箱验证成功</h1>
      <p class="message">
        您的邮箱已通过验证，现在可以完整体验 Vote-Kit 的全部功能。
      </p>
      <div class="actions">
        <el-button type="primary" size="large" @click="$router.push('/login')">
          去登录
        </el-button>
        <el-button size="large" @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck } from '@element-plus/icons-vue';
</script>

<style scoped>
.verify-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-2xl);
}

.verify-card {
  max-width: 420px;
  width: 100%;
  text-align: center;
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-md);
}

.icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-xl);
  font-size: 36px;
}

.icon.success {
  background: rgba(46, 204, 113, 0.12);
  color: #2ecc71;
}

.title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 var(--space-md) 0;
  color: var(--color-text-primary);
}

.message {
  margin: 0 0 var(--space-xl) 0;
  font-size: 15px;
  color: var(--color-text-secondary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .actions {
    flex-direction: column;
  }
  .actions .el-button {
    width: 100%;
  }
}
</style>

