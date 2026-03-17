<template>
  <div class="not-found-page">
    <div class="error-container">
      <div class="error-illustration">
        <img src="/images/illustrations/errors/404.webp" alt="" />
      </div>
      <h1 class="error-title">页面不存在</h1>
      <p class="error-desc">您访问的页面可能已被移除或链接有误</p>
      <el-button type="primary" size="large" @click="$router.push('/')">
        返回首页
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.not-found-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: var(--space-xl);
}

.error-container {
  text-align: center;
  max-width: 420px;
}

.error-illustration img {
  max-width: 240px;
  margin: 0 auto var(--space-xl);
  display: block;
}

.error-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-md) 0;
}

.error-desc {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-xl) 0;
}
</style>
