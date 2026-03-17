<template>
  <div class="forgot-password-page">
    <div class="forgot-container animate-scale-in">
      <div class="forgot-illus">
        <img src="/images/illustrations/auth/forgot-password.webp" alt="" />
      </div>
      <div class="forgot-form-wrap">
        <div class="forgot-header">
          <h2 class="title">找回密码</h2>
          <p class="subtitle">输入注册邮箱，我们将发送重置链接（功能开发中）</p>
        </div>

        <el-form :model="form" @submit.prevent="handleSubmit" class="forgot-form">
          <el-form-item>
            <el-input
              v-model="form.email"
              type="email"
              placeholder="注册邮箱"
              size="large"
              prefix-icon="Message"
            />
          </el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            size="large"
            class="submit-btn"
            :loading="loading"
          >
            发送重置链接
          </el-button>
        </el-form>

        <div class="footer-link">
          <el-button text type="primary" @click="$router.push('/login')">
            返回登录
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const router = useRouter();
const form = ref({ email: '' });
const loading = ref(false);

function handleSubmit() {
  if (!form.value.email) {
    ElMessage.warning('请填写邮箱');
    return;
  }
  ElMessage.info('找回密码功能开发中，敬请期待');
}
</script>

<style scoped>
.forgot-password-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-lg);
}

.forgot-container {
  width: 100%;
  max-width: 780px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2xl);
  align-items: center;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--glass-border);
}

.forgot-illus img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.forgot-form-wrap {
  min-width: 0;
}

.forgot-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.forgot-form {
  margin-bottom: var(--space-lg);
}

.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-md);
  font-weight: 600;
}

.footer-link {
  text-align: center;
}

@media (max-width: 768px) {
  .forgot-container {
    grid-template-columns: 1fr;
    max-width: 420px;
  }
  .forgot-illus {
    order: -1;
  }
  .forgot-illus img {
    max-height: 160px;
  }
}
</style>
