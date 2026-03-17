<template>
  <div class="stat-card" :class="{ 'stat-card--pencil': variant === 'pencil' }">
    <div v-if="variant !== 'pencil' && $slots.icon" class="stat-icon" :style="{ background: iconBg }">
      <slot name="icon"></slot>
    </div>
    <div class="stat-content">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value">{{ value }}</div>
      <div v-if="trend" class="stat-trend" :class="trendClass">
        {{ trend }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: string | number;
  label: string;
  iconBg?: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'pencil';
}

const props = withDefaults(defineProps<Props>(), {
  iconBg: '#0f172a',
  trendType: 'neutral',
  variant: 'pencil'
});

const trendClass = computed(() => {
  return `trend-${props.trendType}`;
});
</script>

<style scoped>
.stat-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-trend {
  font-size: 12px;
  font-weight: 400;
  display: inline-block;
}

.trend-up {
  color: #6ee7b7;
}

.trend-down {
  color: #fca5a5;
}

.trend-neutral {
  color: #9ca3af;
}
</style>
