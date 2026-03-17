<template>
  <div class="vk-card" :class="[{ 'vk-card--interactive': interactive }, `vk-card--${padding}`]">
    <header v-if="$slots.header" class="vk-card__header">
      <slot name="header" />
    </header>
    <section class="vk-card__body">
      <slot />
    </section>
    <footer v-if="$slots.footer" class="vk-card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
type Padding = 'normal' | 'compact';

interface Props {
  interactive?: boolean;
  padding?: Padding;
}

withDefaults(defineProps<Props>(), {
  interactive: false,
  padding: 'normal',
});
</script>

<style scoped>
.vk-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  border: 1px solid var(--color-gray-200);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color var(--transition-base), background var(--transition-base);
}

.vk-card--interactive {
  cursor: pointer;
}

.vk-card--interactive:hover {
  border-color: var(--color-primary-200);
  background: var(--color-bg-secondary);
}

.vk-card--interactive:active {
  border-color: var(--color-primary-300);
}

.vk-card--normal {
  padding: 20px;
}

.vk-card--compact {
  padding: 16px;
}

.vk-card__header {
  margin-bottom: 12px;
}

.vk-card__body {
  flex: 1;
}

.vk-card__footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-gray-100);
}
</style>

