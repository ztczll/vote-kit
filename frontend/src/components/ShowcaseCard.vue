<template>
  <article class="showcase-card card-hover">
    <div class="showcase-card-cover">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="title"
        class="showcase-card-cover-img"
      />
      <div v-else class="showcase-card-cover-placeholder" :style="placeholderGradient">
        <span class="showcase-card-cover-icon" aria-hidden="true">{{ placeholderIcon }}</span>
        <span class="showcase-card-cover-label">{{ coverLabel }}</span>
      </div>
    </div>
    <div class="showcase-card-body">
      <div class="showcase-card-header">
        <h3 class="showcase-card-title">{{ title }}</h3>
        <span class="showcase-card-votes" v-if="voteCount !== undefined">
          🔥 {{ voteCount }} 票
        </span>
      </div>
      <p class="showcase-card-desc">{{ description }}</p>
      <div v-if="techStack && techStack.length" class="showcase-card-tags">
        <span
          v-for="(tech, i) in techStack"
          :key="i"
          class="showcase-card-tag"
        >
          {{ tech }}
        </span>
      </div>
      <a
        :href="experienceHref"
        class="showcase-card-cta"
        @click.prevent="handleExperienceClick"
      >
        👉 立即体验
      </a>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Props {
  title: string;
  description: string;
  voteCount?: number;
  techStack?: string[];
  coverImage?: string;
  coverLabel?: string;
  placeholderIcon?: string;
  requirementId: string;
  experienceLink?: string;
}

const props = withDefaults(defineProps<Props>(), {
  coverLabel: '应用预览',
  placeholderIcon: '📱',
});

const router = useRouter();

const placeholderGradient = { background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)' };

const experienceHref = computed(() =>
  props.experienceLink || `/requirement/${props.requirementId}`
);

function handleExperienceClick() {
  if (props.experienceLink?.startsWith('http')) {
    window.open(props.experienceLink, '_blank', 'noopener,noreferrer');
    return;
  }
  if (props.experienceLink) {
    router.push(props.experienceLink);
    return;
  }
  router.push(`/requirement/${props.requirementId}`);
}
</script>

<style scoped>
.showcase-card {
  background: #ffffff;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.showcase-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: #c7d2fe;
}

.showcase-card-cover {
  height: 140px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%);
}

.showcase-card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.showcase-card-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.showcase-card-cover-icon {
  font-size: 2rem;
}

.showcase-card-cover-label {
  font-size: 13px;
  font-weight: 500;
  color: #6366f1;
}

.showcase-card-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.showcase-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.showcase-card-title {
  font-size: 17px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  line-height: 1.4;
  flex: 1;
  min-width: 0;
}

.showcase-card-votes {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  padding: 4px 12px;
  border-radius: 999px;
}

.showcase-card-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.6;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.showcase-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.showcase-card-tag {
  font-size: 12px;
  font-weight: 500;
  background: #f3f4f6;
  color: #6b7280;
  padding: 4px 12px;
  border-radius: 6px;
}

.showcase-card-cta {
  display: block;
  width: 100%;
  text-align: center;
  background: #2979ff;
  color: #ffffff;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 16px;
  border-radius: 999px;
  text-decoration: none;
  transition: all 0.15s ease;
  margin-top: auto;
}

.showcase-card-cta:hover {
  background: #1d6ae5;
  opacity: 0.95;
}
</style>
