<template>
  <el-button
    :type="type"
    :size="size"
    :plain="variant === 'secondary'"
    :class="['vk-base-button', `vk-button--${variant}`, { 'vk-button--full': fullWidth }]"
    v-bind="$attrs"
  >
    <slot />
  </el-button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'default' | 'large' | 'small';

interface Props {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'default',
  fullWidth: false,
});

const type = computed(() => {
  if (props.variant === 'primary') return 'primary';
  if (props.variant === 'secondary') return 'default';
  return 'default';
});

const size = computed(() => {
  if (props.size === 'large') return 'large';
  if (props.size === 'small') return 'small';
  return 'default';
});
</script>

<style scoped>
.vk-base-button {
  border-radius: var(--radius-lg);
  font-weight: var(--font-medium);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transition: all var(--transition-base);
}

.vk-base-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.vk-base-button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.vk-button--primary {
  box-shadow: var(--shadow-primary);
}

.vk-button--secondary {
  border-color: var(--color-primary-200);
  background-color: var(--color-bg-primary);
}

.vk-button--ghost {
  border-color: transparent;
  background-color: transparent;
  color: var(--color-text-secondary);
}

.vk-button--full {
  width: 100%;
  justify-content: center;
}

.vk-button--ghost:hover {
  background-color: rgba(15, 23, 42, 0.03);
}
</style>

