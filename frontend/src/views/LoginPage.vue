<template>
  <div class="login-page">
    <div class="login-container animate-scale-in">
      <div class="login-illus">
        <img src="/images/illustrations/auth/login.webp" alt="" />
      </div>
      <div class="login-form-wrap">
        <div class="login-header">
          <h2 class="title">欢迎回来</h2>
          <p class="subtitle">登录 VoteKit 继续你的创意之旅</p>
        </div>

        <el-form :model="form" @submit.prevent="handleLogin" class="login-form">
          <el-form-item>
            <el-input 
              v-model="form.username" 
              placeholder="用户名或邮箱"
              size="large"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="密码" 
              size="large"
              show-password
            />
          </el-form-item>
          
          <el-button 
            type="primary" 
            native-type="submit" 
            size="large" 
            class="submit-btn"
            :loading="loading"
          >
            登录
          </el-button>
          
          <div class="footer-link">
            还没有账号?
            <el-button text type="primary" @click="$router.push('/register')">
              立即注册
            </el-button>
            <span class="footer-sep">·</span>
            <el-button text type="info" @click="$router.push('/forgot-password')">
              忘记密码？
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const form = ref({ username: '', password: '' });
const loading = ref(false);

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  loading.value = true;
  try {
    await authStore.login(form.value.username, form.value.password);
    ElMessage.success('登录成功！');
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-lg);
}

.login-container {
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

.login-illus {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-illus img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.login-form-wrap {
  min-width: 0;
}

.login-header {
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

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.login-form :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: var(--shadow-md);
}

.submit-btn {
  width: 100%;
  height: 48px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 16px;
  background: linear-gradient(135deg, var(--color-accent-500) 0%, var(--color-accent-700) 100%);
  border: none;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.submit-btn:active {
  transform: translateY(0);
}

.footer-link {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs, 6px);
  flex-wrap: wrap;
}

.footer-sep {
  opacity: 0.6;
}

.login-type-switch {
  margin-bottom: var(--space-xl);
}

.login-type-switch :deep(.el-segmented__item) {
  padding: var(--space-md) var(--space-lg);
  font-weight: 500;
}

@media (max-width: 768px) {
  .login-container {
    grid-template-columns: 1fr;
    padding: var(--space-xl);
    max-width: 420px;
  }
  
  .login-illus {
    order: -1;
    max-height: 160px;
  }
  
  .login-illus img {
    max-height: 160px;
  }
  
  .title {
    font-size: 24px;
  }
}
</style>
