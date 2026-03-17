<template>
  <div class="activity-feed">
    <h3 class="feed-title">最近动态</h3>
    <div class="feed-list">
      <div v-for="(activity, index) in activities" :key="index" class="activity-item stagger-item">
        <div class="activity-icon" :style="{ background: getIconBg(activity.type) }">
          {{ getIcon(activity.type) }}
        </div>
        <div class="activity-content">
          <p class="activity-text">
            <strong>{{ activity.username }}</strong>
            {{ getActionText(activity.type) }}
            <span class="activity-target">{{ activity.target }}</span>
          </p>
          <span class="activity-time">{{ formatTime(activity.time) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Activity {
  type: 'vote' | 'submit' | 'comment';
  username: string;
  target: string;
  time: string;
}

interface Props {
  activities: Activity[];
}

defineProps<Props>();

function getIcon(type: string): string {
  const icons: Record<string, string> = {
    vote: '🔥',
    submit: '💡',
    comment: '💬'
  };
  return icons[type] || '📌';
}

function getIconBg(type: string): string {
  const colors: Record<string, string> = {
    vote: 'linear-gradient(135deg, #FF6B35 0%, #E55525 100%)',
    submit: 'linear-gradient(135deg, #34C759 0%, #28A745 100%)',
    comment: 'linear-gradient(135deg, #007AFF 0%, #0056CC 100%)'
  };
  return colors[type] || 'linear-gradient(135deg, #A8A29E 0%, #78716C 100%)';
}

function getActionText(type: string): string {
  const actions: Record<string, string> = {
    vote: '投票支持了',
    submit: '提交了新需求',
    comment: '评论了'
  };
  return actions[type] || '参与了';
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
.activity-feed {
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.feed-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-lg) 0;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.activity-item {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.activity-item:hover {
  background: var(--color-surface);
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.activity-text {
  font-size: 14px;
  color: var(--color-text-primary);
  line-height: 1.5;
  margin: 0;
}

.activity-text strong {
  font-weight: 600;
  color: var(--color-text-primary);
}

.activity-target {
  color: var(--color-accent-500);
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}
</style>
