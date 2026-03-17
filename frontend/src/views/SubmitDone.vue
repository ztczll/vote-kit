<template>
  <div class="submit-done-page">
    <div class="success-container">
      <div class="success-illustration">
        <img src="/images/illustrations/success/taskcomplete.webp" alt="" />
      </div>
      <h1 class="success-title">提交成功！</h1>
      <p class="success-message">
        你的需求已成功提交，正在等待审核。<br>
        审核通过后将出现在投票广场，开始接受社区投票。
      </p>
      
      <div class="success-actions">
        <el-button size="large" @click="$router.push('/')">
          返回首页
        </el-button>
        <el-button type="primary" size="large" @click="handleSubmitAnother">
          提交另一个需求
        </el-button>
      </div>
      
      <div class="success-tips">
        <h3>💡 小贴士</h3>
        <ul>
          <li>高质量的需求描述更容易获得投票</li>
          <li>你可以在首页查看你提交的需求状态</li>
          <li>获得足够投票的需求将被优先开发</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function handleSubmitAnother() {
  // 清除可能残留的草稿
  localStorage.removeItem('votekit_draft');
  router.push('/submit');
}
</script>

<style scoped>
.submit-done-page {
  padding-bottom: var(--space-2xl);
}

.success-container {
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.8);
  text-align: center;
  animation: scaleIn 0.4s ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.success-illustration {
  margin-bottom: var(--space-lg);
}

.success-illustration img {
  max-width: 200px;
  height: auto;
  margin: 0 auto;
  display: block;
  animation: bounce 0.6s ease-out;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}

.success-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.success-message {
  font-size: 16px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 var(--space-2xl) 0;
}

.success-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-2xl);
}

.success-tips {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  text-align: left;
  margin-top: var(--space-2xl);
}

.success-tips h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.success-tips ul {
  margin: 0;
  padding-left: var(--space-lg);
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.success-tips li {
  margin-bottom: var(--space-sm);
}

@media (max-width: 768px) {
  .success-container {
    padding: var(--space-xl);
  }
  
  .success-illustration img {
    max-width: 160px;
  }
  
  .success-title {
    font-size: 24px;
  }
  
  .success-actions {
    flex-direction: column;
  }
  
  .success-actions .el-button {
    width: 100%;
  }
}
</style>
