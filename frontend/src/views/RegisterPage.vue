<template>
  <div class="register-page">
    <div class="register-container animate-scale-in">
      <div class="register-illus">
        <img src="/images/illustrations/auth/register.webp" alt="" />
      </div>
      <div class="register-form-wrap">
        <div class="register-header">
          <h2 class="title">加入 VoteKit</h2>
          <p class="subtitle">一起创造未来，让好创意变成现实</p>
        </div>

        <el-form :model="form" @submit.prevent="handleRegister" class="register-form">
          <el-form-item>
            <el-input 
              v-model="form.username" 
              placeholder="用户名"
              size="large"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input 
              v-model="form.email" 
              type="email" 
              placeholder="邮箱地址" 
              size="large"
            />
          </el-form-item>
          
          <el-form-item>
            <el-input 
              v-model="form.password" 
              type="password" 
              placeholder="密码 (至少6个字符)" 
              size="large"
              show-password
            />
          </el-form-item>

          <el-form-item class="agreement-item">
            <el-checkbox v-model="form.agreed">
              我已阅读并同意
              <a href="/user-agreement" target="_blank">《用户协议》</a>
              和
              <a href="/privacy-policy" target="_blank">《隐私政策》</a>
            </el-checkbox>
          </el-form-item>
          
          <el-button 
            type="primary" 
            native-type="submit" 
            size="large" 
            class="submit-btn"
            :loading="loading"
          >
            注册
          </el-button>
          
          <div class="footer-link">
            已有账号? 
            <el-button text type="primary" @click="$router.push('/login')">
              立即登录
            </el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const authStore = useAuthStore();
const form = ref({ username: '', email: '', password: '', agreed: false });
const loading = ref(false);

async function handleRegister() {
  if (!form.value.username || !form.value.email || !form.value.password) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  if (!form.value.agreed) {
    ElMessage.warning('请先阅读并同意《用户协议》和《隐私政策》');
    return;
  }
  if (form.value.password.length < 6) {
    ElMessage.warning('密码至少需要6个字符');
    return;
  }
  loading.value = true;
  try {
    await authStore.register(form.value.username, form.value.email, form.value.password);
    ElMessage.success('注册成功！请前往邮箱完成验证');
    router.push({ path: '/register/done', query: { email: form.value.email } });
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.register-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-lg);
}

.register-container {
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

.register-illus {
  display: flex;
  align-items: center;
  justify-content: center;
}

.register-illus img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.register-form-wrap {
  min-width: 0;
}

.register-header {
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

.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.register-form :deep(.el-input__wrapper) {
  border-radius: var(--radius-md);
  padding: var(--space-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.register-form :deep(.el-input__wrapper:hover) {
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
}

.register-type-switch {
  margin-bottom: var(--space-xl);
}

.register-type-switch :deep(.el-segmented__item) {
  padding: var(--space-md) var(--space-lg);
  font-weight: 500;
}

@media (max-width: 768px) {
  .register-container {
    grid-template-columns: 1fr;
    padding: var(--space-xl);
    max-width: 420px;
  }
  
  .register-illus {
    order: -1;
    max-height: 160px;
  }
  
  .register-illus img {
    max-height: 160px;
  }
  
  .title {
    font-size: 24px;
  }
}
</style>
