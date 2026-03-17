<template>
  <section class="showcase-section animate-fade-in">
    <div class="showcase-section-header">
      <h2 class="showcase-section-title">社区诞生的应用</h2>
      <p class="showcase-section-desc">
        以下应用均由社区投票选出，并由 AI 驱动生成和部署。点击「立即体验」感受成果。
      </p>
    </div>
    <div class="showcase-grid">
      <ShowcaseCard
        v-for="item in items"
        :key="item.id"
        :title="item.title"
        :description="item.description"
        :vote-count="item.vote_count"
        :tech-stack="item.techStack"
        :cover-image="item.coverImage"
        :cover-label="item.coverLabel"
        :placeholder-icon="item.placeholderIcon"
        :requirement-id="item.id"
        :experience-link="item.experienceLink"
      />
    </div>
    <p v-if="items.length === 0" class="showcase-empty">
      暂无已上线的应用，高票需求开发完成后会在此展示。
    </p>
  </section>
</template>

<script setup lang="ts">
import ShowcaseCard from './ShowcaseCard.vue';

export interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  vote_count: number;
  coverImage?: string;
  techStack?: string[];
  experienceLink?: string;
  coverLabel?: string;
  placeholderIcon?: string;
}

interface Props {
  items: ShowcaseItem[];
}

defineProps<Props>();
</script>

<style scoped>
.showcase-section {
  margin-bottom: var(--space-2xl);
}

.showcase-section-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.showcase-section-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-4) 0;
}

.showcase-section-desc {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  max-width: 42rem;
  margin: 0 auto;
  line-height: 1.6;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--space-8);
}

@media (min-width: 640px) {
  .showcase-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .showcase-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .showcase-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.showcase-empty {
  text-align: center;
  padding: var(--space-12);
  font-size: var(--text-base);
  color: var(--color-text-tertiary);
  margin: 0;
}
</style>
