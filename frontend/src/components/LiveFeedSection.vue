<template>
  <section class="live-feed-section animate-fade-in">
    <div class="live-feed-card">
      <div class="live-feed-header">
        <span class="live-feed-icon" aria-hidden="true">📢</span>
        <h2 class="live-feed-title">平台动态</h2>
        <span class="live-feed-badge">实时</span>
      </div>
      <div class="live-feed-list">
        <article
          v-for="(activity, index) in displayActivities"
          :key="`${activity.time}-${index}`"
          class="live-feed-item"
        >
          <div
            class="live-feed-item-icon"
            :style="{ background: getIconBg(activity.type) }"
            aria-hidden="true"
          >
            {{ getIcon(activity.type) }}
          </div>
          <div class="live-feed-item-content">
            <p class="live-feed-item-text">
              <template v-if="activity.type === 'submit'">
                用户 <span class="live-feed-username">@{{ activity.username }}</span> 提交了需求
                <strong class="live-feed-target">「{{ activity.target }}」</strong>
              </template>
              <template v-else-if="activity.type === 'vote'">
                <span class="live-feed-username">@{{ activity.username }}</span> 投票支持了
                <strong class="live-feed-target">「{{ activity.target }}」</strong>
              </template>
              <template v-else-if="activity.type === 'launched'">
                用户 <span class="live-feed-username">@{{ activity.username }}</span> 的需求
                <strong class="live-feed-target">「{{ activity.target }}」</strong> 已生成上线！
              </template>
              <template v-else>
                <span class="live-feed-username">@{{ activity.username }}</span> 评论了
                <strong class="live-feed-target">「{{ activity.target }}」</strong>
              </template>
            </p>
            <p class="live-feed-item-meta">
              <span class="live-feed-item-time">{{ formatTime(activity.time) }}</span>
              <template v-if="(activity as ActivityWithId).requirement_id">
                <span class="live-feed-item-sep">·</span>
                <router-link
                  :to="`/requirement/${(activity as ActivityWithId).requirement_id}`"
                  class="live-feed-item-link"
                >
                  {{ getActionLinkText(activity.type) }}
                </router-link>
              </template>
            </p>
          </div>
        </article>
        <p v-if="displayActivities.length === 0" class="live-feed-empty">
          暂无动态，提交或投票后这里会显示最新动态。
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Activity {
  type: 'vote' | 'submit' | 'comment' | 'launched';
  username: string;
  target: string;
  time: string;
}

interface ActivityWithId extends Activity {
  requirement_id?: string;
}

interface Props {
  activities: ActivityWithId[];
  maxItems?: number;
}

const props = withDefaults(defineProps<Props>(), {
  maxItems: 8,
});

const displayActivities = computed(() =>
  props.activities.slice(0, props.maxItems)
);

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    vote: '🔥',
    submit: '🚀',
    comment: '💬',
    launched: '✅',
  };
  return icons[type] || '📌';
}

function getIconBg(type: string): string {
  const colors: Record<string, string> = {
    vote: 'linear-gradient(135deg, #FF6B35 0%, #E55525 100%)',
    submit: 'linear-gradient(135deg, #1988EB 0%, #47A1EF 100%)',
    comment: 'linear-gradient(135deg, #19D7EC 0%, #47DFF0 100%)',
    launched: 'linear-gradient(135deg, #0BB065 0%, #3CC084 100%)',
  };
  return colors[type] || 'linear-gradient(135deg, #A8A29E 0%, #78716C 100%)';
}

function getActionLinkText(type: string): string {
  const texts: Record<string, string> = {
    vote: '去投票',
    submit: '查看需求',
    comment: '查看讨论',
    launched: '立即体验',
  };
  return texts[type] || '查看';
}

function formatTime(time: string): string {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}
</script>

<style scoped>
.live-feed-section {
  margin-bottom: var(--space-2xl);
}

.live-feed-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-gray-200);
  max-width: 56rem;
  margin: 0 auto;
}

.live-feed-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.live-feed-icon {
  font-size: 1.25rem;
  margin-right: var(--space-3);
}

.live-feed-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.live-feed-badge {
  margin-left: var(--space-3);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: var(--text-xs);
  font-weight: 600;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
}

.live-feed-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.live-feed-item {
  display: flex;
  align-items: flex-start;
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-gray-100);
}

.live-feed-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.live-feed-item-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
  margin-right: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.live-feed-item-content {
  flex: 1;
  min-width: 0;
}

.live-feed-item-text {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.5;
  margin: 0;
}

.live-feed-username {
  color: var(--color-primary-600);
  font-weight: 500;
}

.live-feed-target {
  color: var(--color-text-primary);
  font-weight: 600;
}

.live-feed-item-meta {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  margin: var(--space-1) 0 0 0;
}

.live-feed-item-sep {
  margin: 0 var(--space-2);
}

.live-feed-item-link {
  color: var(--color-primary-500);
  font-weight: 500;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.live-feed-item-link:hover {
  color: var(--color-primary-600);
  text-decoration: underline;
}

.live-feed-empty {
  margin: 0;
  padding: var(--space-lg) 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}
</style>
