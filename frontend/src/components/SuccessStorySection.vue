<template>
  <section class="success-story-section animate-fade-in">
    <div
      v-for="(story, index) in displayStories"
      :key="story.id"
      class="success-story-card"
      :class="{ 'success-story-card-single': displayStories.length === 1 }"
    >
      <div class="success-story-content">
        <span class="success-story-badge">成功案例</span>
        <h2 class="success-story-title">{{ story.title }}</h2>
        <blockquote class="success-story-testimonial">
          「{{ story.testimonial }}」
        </blockquote>
        <div class="success-story-body">
          <p>
            <strong class="success-story-label">用户与痛点：</strong>
            「{{ story.userQuote }}」——
            <span class="success-story-username">用户 @{{ story.userName }}</span>
          </p>
          <p>
            <strong class="success-story-label">平台过程：</strong>
            {{ story.process }}
          </p>
          <p>
            <strong class="success-story-label">解决方案：</strong>
            {{ story.solution }}
          </p>
        </div>
        <a
          v-if="story.experienceLink"
          :href="story.experienceLink"
          :target="story.experienceLink.startsWith('http') ? '_blank' : '_self'"
          :rel="story.experienceLink.startsWith('http') ? 'noopener noreferrer' : ''"
          class="success-story-link"
        >
          阅读更多成功故事
          <span class="success-story-link-arrow">→</span>
        </a>
      </div>
      <div class="success-story-visual">
        <div class="success-story-app-card">
          <div class="success-story-app-header">
            <div class="success-story-app-icon" aria-hidden="true">⭐</div>
            <div>
              <h3 class="success-story-app-name">{{ story.appName }}</h3>
              <p class="success-story-app-by">由 @{{ story.userName }} 的创意驱动</p>
            </div>
          </div>
          <div class="success-story-app-preview">
            <span class="success-story-app-preview-icon" aria-hidden="true">📱</span>
            <p class="success-story-app-preview-text">拖拽图片、链接，一键收藏并自动分类</p>
            <a
              v-if="story.experienceLink"
              :href="story.experienceLink"
              :target="story.experienceLink.startsWith('http') ? '_blank' : '_self'"
              :rel="story.experienceLink.startsWith('http') ? 'noopener noreferrer' : ''"
              class="success-story-app-cta"
            >
              立即体验此应用
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { successStories, type SuccessStory } from '@/data/successStories';

interface Props {
  stories?: SuccessStory[];
  maxItems?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 2,
});

const displayStories = computed(() =>
  (props.stories ?? successStories).slice(0, props.maxItems)
);
</script>

<style scoped>
.success-story-section {
  margin-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.success-story-card {
  background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-primary-50) 100%);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
}

.success-story-card-single {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (min-width: 768px) {
  .success-story-card:not(.success-story-card-single) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 767px) {
  .success-story-card-single {
    grid-template-columns: 1fr;
  }
}

.success-story-content {
  padding: var(--space-8) var(--space-10);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.success-story-badge {
  display: inline-block;
  background: var(--color-primary-100);
  color: var(--color-primary-800);
  font-size: var(--text-sm);
  font-weight: 600;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-full);
  width: fit-content;
}

.success-story-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.success-story-testimonial {
  border-left: 4px solid var(--color-primary-500);
  padding-left: var(--space-6);
  margin: 0;
  font-style: italic;
  color: var(--color-text-secondary);
  font-size: var(--text-lg);
  line-height: 1.6;
}

.success-story-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.success-story-body p {
  margin: 0;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  line-height: 1.6;
}

.success-story-label {
  color: var(--color-text-primary);
}

.success-story-username {
  color: var(--color-primary-600);
  font-weight: 500;
}

.success-story-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-primary-600);
  font-weight: 600;
  font-size: var(--text-base);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.success-story-link:hover {
  color: var(--color-primary-700);
}

.success-story-link-arrow {
  font-size: 1.25em;
}

.success-story-visual {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-accent-500) 100%);
  padding: var(--space-8) var(--space-10);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-story-app-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-2xl);
  padding: var(--space-6);
  max-width: 22rem;
  width: 100%;
  transform: rotate(2deg);
}

.success-story-app-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.success-story-app-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.success-story-app-name {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.success-story-app-by {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: var(--space-1) 0 0 0;
}

.success-story-app-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.success-story-app-preview-icon {
  font-size: 2rem;
  text-align: center;
  opacity: 0.8;
}

.success-story-app-preview-text {
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
}

.success-story-app-cta {
  display: block;
  text-align: center;
  background: var(--color-primary-600);
  color: var(--color-text-inverse);
  font-weight: 600;
  font-size: var(--text-sm);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: background var(--transition-fast);
}

.success-story-app-cta:hover {
  background: var(--color-primary-700);
}
</style>
