<template>
  <div class="empty-state">
    <div v-if="illustration" class="empty-illustration">
      <img :src="illustrationSrc" :alt="title" />
    </div>
    <div v-else class="empty-icon">{{ icon }}</div>
    <h3 class="empty-title">{{ title }}</h3>
    <p class="empty-description">{{ description }}</p>
    <slot name="action"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type IllustrationType = 'no-tasks' | 'no-results' | 'no-messages' | 'no-data';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  illustration?: IllustrationType;
}

const props = withDefaults(defineProps<Props>(), {
  icon: '📭',
  description: '',
  illustration: undefined
});

const illustrationSrc = computed(() =>
  props.illustration
    ? `/images/illustrations/empty-states/${props.illustration}.webp`
    : ''
);
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: var(--space-2xl) var(--space-lg);
  background: radial-gradient(circle at top, rgba(248, 250, 252, 0.9), #ffffff);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-md);
  border: 1px dashed rgba(148, 163, 184, 0.8);
}

.empty-illustration {
  margin-bottom: var(--space-lg);
}

.empty-illustration img {
  max-width: 220px;
  height: auto;
  display: block;
  margin: 0 auto;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--space-lg);
  opacity: 0.9;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.empty-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-lg) 0;
  line-height: 1.6;
}
</style>
