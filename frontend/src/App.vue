<template>
  <div id="app">
    <el-container>
      <el-header class="app-header">
        <div class="header-content">
          <div class="logo" @click="$router.push('/')">
            <img src="/images/logos/votekit-logo-64x64.png" alt="Vote-Kit" class="logo-img" />
            <span class="logo-text">Vote-Kit</span>
          </div>
          <div class="nav">
            <el-button @click="$router.push('/prototypes')" class="nav-btn">
              <el-icon><Document /></el-icon>
              <span class="nav-btn-text">原型广场</span>
            </el-button>
            <el-button @click="$router.push('/app-store')" class="nav-btn">
              <el-icon><Shop /></el-icon>
              <span class="nav-btn-text">应用广场</span>
            </el-button>
            <el-button @click="$router.push('/templates')" class="nav-btn">
              <el-icon><Document /></el-icon>
              <span class="nav-btn-text">模板</span>
            </el-button>
            <el-button @click="$router.push('/pricing')" class="nav-btn">
              <el-icon><Ticket /></el-icon>
              <span class="nav-btn-text">定价</span>
            </el-button>
            <el-button
              v-if="authStore.isAuthenticated"
              type="primary"
              @click="$router.push('/submit')"
              class="nav-btn primary-btn"
            >
              <el-icon><Plus /></el-icon>
              <span class="nav-btn-text">提交需求</span>
            </el-button>
            <el-button
              v-if="authStore.isAdmin"
              type="warning"
              @click="$router.push('/admin')"
              class="nav-btn"
            >
              <el-icon><Setting /></el-icon>
              <span class="nav-btn-text">管理后台</span>
            </el-button>

            <el-dropdown v-if="authStore.isAuthenticated" trigger="click">
              <el-button circle class="user-avatar-btn">
                <el-icon class="user-avatar-icon"><User /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item disabled>{{ authStore.user?.username }}</el-dropdown-item>
                  <el-dropdown-item @click="$router.push('/dashboard')">
                    <el-icon><Coin /></el-icon>
                    工作台（我的额度）
                  </el-dropdown-item>
                  <el-dropdown-item @click="$router.push('/my-apps')">
                    <el-icon><Setting /></el-icon>
                    我的应用
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="handleLogout">登出</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

            <el-button v-if="showAuthButtons" @click="$router.push('/login')" class="nav-btn">
              登录
            </el-button>
            <el-button
              v-if="showAuthButtons"
              type="primary"
              @click="$router.push('/register')"
              class="nav-btn primary-btn"
            >
              注册
            </el-button>
          </div>
        </div>
      </el-header>
      <el-main class="app-main">
        <el-alert
          v-if="authStore.isAuthenticated && !authStore.isEmailVerified"
          type="warning"
          show-icon
          class="verify-banner"
        >
          <template #title>
            您的邮箱尚未完成验证，请前往邮箱点击验证链接。
            <el-button type="text" size="small" @click="goRegisterDone">
              重新发送验证邮件
            </el-button>
          </template>
        </el-alert>
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
      <el-footer class="app-footer">
        <p>
          © 2026 Vote-Kit - 用投票决定下一款要做的应用
          ·
          <router-link to="/user-agreement">用户协议</router-link>
          ·
          <router-link to="/privacy-policy">隐私政策</router-link>
        </p>
      </el-footer>
    </el-container>

    <FeedbackWidget ref="feedbackWidgetRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, provide } from 'vue';
import { Plus, Setting, User, Shop, Ticket, Coin, Document } from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import FeedbackWidget from '@/components/FeedbackWidget.vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const feedbackWidgetRef = ref<InstanceType<typeof FeedbackWidget> | null>(null);
provide('openFeedback', () => feedbackWidgetRef.value?.openDialog());

const showAuthButtons = computed(() => !authStore.isAuthenticated);

function handleLogout() {
  authStore.logout();
  router.push('/');
}

function goRegisterDone() {
  if (authStore.user?.email) {
    router.push({ path: '/register/done', query: { email: authStore.user.email } });
  } else {
    router.push('/register');
  }
}
</script>

<style scoped>
#app {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  min-height: 100vh;
  background: var(--color-bg-secondary);
  position: relative;
  overflow-x: hidden;
}

.el-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Header */
.app-header {
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-gray-200);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
}

.logo-img {
  height: 40px;
  width: auto;
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.logo-text {
  font-size: 24px;
  font-weight: var(--font-extrabold);
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
}

/* Navigation */
.nav {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.nav-btn {
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
}

.user-avatar-icon {
  font-size: var(--text-xl);
}

/* Main Content */
.app-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-4) var(--space-6) var(--space-8);
}

.verify-banner {
  margin-bottom: var(--space-4);
}

/* Footer */
.app-footer {
  background: var(--color-bg-primary);
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-6);
  margin-top: auto;
  border-top: 1px solid var(--color-gray-200);
  font-size: var(--text-sm);
}

.app-footer p {
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .logo-img {
    height: 32px;
  }

  .logo-text {
    display: none;
  }

  .nav-btn-text {
    display: none;
  }

  .nav {
    gap: var(--space-2);
  }

  .app-main {
    padding: var(--space-6) var(--space-4);
  }

  .header-content {
    padding: 0 var(--space-4);
  }
}

/* Route Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all var(--transition-base);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Animation */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
</style>
