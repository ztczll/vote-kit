<template>
  <div class="verify-page">
    <div class="verify-card">
      <div class="icon error">
        <el-icon><Warning /></el-icon>
      </div>
      <h1 class="title">验证链接无效或已过期</h1>
      <p class="message">
        {{ reasonMessage }}
      </p>
      <p class="hint">
        您可以尝试重新登录后，在提示条中重新发送验证邮件，或返回注册页重新注册。
      </p>
      <div class="actions">
        <el-button type="primary" size="large" @click="$router.push('/login')">
          去登录
        </el-button>
        <el-button size="large" @click="$router.push('/register')">重新注册</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Warning } from '@element-plus/icons-vue';

const route = useRoute();

const reasonMessage = computed(() => {
  const reason = (route.query.reason as string) || '';
  if (reason === 'TOKEN_EXPIRED') {
    return '验证链接已过期，请重新发送验证邮件。';
  }
  if (reason === 'TOKEN_ALREADY_USED') {
    return '该验证链接已被使用，请重新登录并重新发送验证邮件。';
  }
  if (reason === 'INVALID_TOKEN') {
    return '验证链接无效或已被篡改，请重新获取链接。';
  }
  return '验证失败，请重新获取验证链接后再试。';
});
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
  max-width: 480px;
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

.icon.error {
  background: rgba(245, 108, 108, 0.12);
  color: #f56c6c;
}

.title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 var(--space-md) 0;
  color: var(--color-text-primary);
}

.message {
  margin: 0 0 var(--space-sm) 0;
  font-size: 15px;
  color: var(--color-text-secondary);
}

.hint {
  margin: 0 0 var(--space-xl) 0;
  font-size: 14px;
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

