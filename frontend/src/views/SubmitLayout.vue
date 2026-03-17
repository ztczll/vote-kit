<template>
  <div class="submit-layout">
    <div class="container">
      <div class="progress-steps">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          class="step-item"
          :class="{ active: index <= currentStep, completed: index < currentStep }"
        >
          <div class="step-circle">
            <span v-if="index < currentStep">✓</span>
            <span v-else>{{ index + 1 }}</span>
          </div>
          <span class="step-label">{{ step }}</span>
        </div>
      </div>
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const steps = ['填写需求', '确认预览', '提交完成'];

const currentStep = computed(() => {
  const path = route.path;
  if (path.includes('/preview')) return 1;
  if (path.includes('/done')) return 2;
  return 0;
});
</script>

<style scoped>
.submit-layout {
  min-height: calc(100vh - 80px);
  background: var(--color-surface);
  padding: var(--space-2xl) 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.progress-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-2xl);
  position: relative;
}

.progress-steps::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--color-surface-dark);
  z-index: 0;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--color-surface-light);
  border: 2px solid var(--color-surface-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--color-text-tertiary);
  transition: all var(--transition-base);
}

.step-item.active .step-circle {
  border-color: var(--color-accent-500);
  color: var(--color-accent-500);
  background: rgba(255, 107, 53, 0.1);
}

.step-item.completed .step-circle {
  background: var(--color-accent-500);
  border-color: var(--color-accent-500);
  color: white;
}

.step-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  transition: color var(--transition-base);
}

.step-item.active .step-label {
  color: var(--color-text-primary);
  font-weight: 600;
}

@media (max-width: 768px) {
  .step-label {
    font-size: 12px;
  }
  
  .step-circle {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>
