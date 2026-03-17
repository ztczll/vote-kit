<template>
  <div class="register-done-page">
    <div class="done-container">
      <div class="done-illustration">
        <img src="/images/illustrations/success/registration-complete.webp" alt="" />
      </div>
      <h1 class="done-title">注册成功，需验证邮箱</h1>
      <p class="done-message">
        我们已经向
        <strong>{{ displayEmail }}</strong>
        发送了一封验证邮件，请在 24 小时内点击邮件中的链接完成验证。
      </p>
      <p class="done-hint">如果长时间未收到邮件，请检查垃圾邮箱，或稍后重新发送。</p>
      <div class="done-actions">
        <el-button size="large" @click="$router.push('/')">返回首页</el-button>
        <el-button type="primary" size="large" @click="$router.push('/login')">
          去登录
        </el-button>
      </div>
      <div class="resend-block">
        <span>没有收到验证邮件？</span>
        <el-button
          type="text"
          :loading="resending"
          :disabled="!email"
          @click="handleResend"
        >
          重新发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authApi } from '@/api/auth';

const route = useRoute();
const email = computed(() => (route.query.email as string) || '');
const displayEmail = computed(() => email.value || '您的注册邮箱');
const resending = ref(false);

async function handleResend() {
  if (!email.value) {
    ElMessage.warning('缺少邮箱信息，请返回重新注册或登录后重试');
    return;
  }
  resending.value = true;
  try {
    await authApi.resendVerification(email.value);
    ElMessage.success('验证邮件已重新发送，请稍候查收');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '重发失败，请稍后再试');
  } finally {
    resending.value = false;
  }
}
</script>

<style scoped>
.register-done-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-2xl);
}

.done-container {
  text-align: center;
  max-width: 420px;
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-md);
}

.done-illustration img {
  max-width: 180px;
  margin: 0 auto var(--space-xl);
  display: block;
}

.done-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.done-message {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-xl) 0;
}

.done-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-lg) 0;
}

.done-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
}

.resend-block {
  margin-top: var(--space-lg);
  font-size: 14px;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .done-actions {
    flex-direction: column;
  }
  .done-actions .el-button {
    width: 100%;
  }
}
</style>
