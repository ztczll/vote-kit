<template>
  <div class="log-card">
    <div class="log-header">
      <div class="log-meta">
        <el-tag :type="getLogTypeColor(log.log_type)" size="small">
          {{ getLogTypeLabel(log.log_type) }}
        </el-tag>
        <span class="log-date">{{ formatDate(log.created_at) }}</span>
        <span class="log-author">by {{ log.developer_name }}</span>
      </div>
    </div>

    <h4 class="log-title">{{ log.title }}</h4>
    <p class="log-content">{{ log.content }}</p>

    <div class="log-actions">
      <el-button
        :type="isLiked ? 'primary' : 'default'"
        size="small"
        @click="toggleLike"
      >
        <el-icon><Star /></el-icon>
        {{ log.likes_count }}
      </el-button>
      <el-button size="small" @click="showComments = !showComments">
        <el-icon><ChatDotRound /></el-icon>
        {{ log.comments_count }}
      </el-button>
    </div>

    <div v-if="showComments" class="comments-section">
      <div class="comment-form">
        <el-input
          v-model="newComment"
          placeholder="发表评论..."
          size="small"
        />
        <el-button type="primary" size="small" @click="submitComment">
          发表
        </el-button>
      </div>
      <div class="comments-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <span class="comment-user">{{ comment.username }}:</span>
          <span class="comment-content">{{ comment.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Star, ChatDotRound } from '@element-plus/icons-vue';
import api from '@/api/client';
import type { DevLog } from '@/types';

const props = defineProps<{
  log: DevLog;
  isLiked: boolean;
}>();

const emit = defineEmits<{
  like: [logId: string];
  unlike: [logId: string];
  comment: [logId: string, content: string];
}>();

const showComments = ref(false);
const comments = ref<any[]>([]);
const newComment = ref('');

function toggleLike() {
  if (props.isLiked) {
    emit('unlike', props.log.id);
  } else {
    emit('like', props.log.id);
  }
}

async function loadComments() {
  if (comments.value.length > 0) return;
  
  try {
    const { data } = await api.get(`/requirements/${props.log.requirement_id}/dev-logs/${props.log.id}/comments`);
    comments.value = data.data.comments || [];
  } catch (error) {
    // Ignore
  }
}

function submitComment() {
  if (!newComment.value.trim()) return;
  
  emit('comment', props.log.id, newComment.value);
  newComment.value = '';
  loadComments();
}

function getLogTypeLabel(type: string) {
  const map: Record<string, string> = {
    feature: '⚙️ 功能实现',
    design: '🎨 界面设计',
    bugfix: '🐛 问题修复',
    milestone: '🎯 里程碑'
  };
  return map[type] || type;
}

function getLogTypeColor(type: string) {
  const map: Record<string, any> = {
    feature: 'primary',
    design: 'warning',
    bugfix: 'danger',
    milestone: 'success'
  };
  return map[type] || 'info';
}

function formatDate(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

onMounted(() => {
  if (showComments.value) {
    loadComments();
  }
});
</script>

<style scoped>
.log-card {
  padding: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-accent-500);
}

.log-header {
  margin-bottom: var(--space-md);
}

.log-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  font-size: 14px;
}

.log-date {
  color: var(--color-text-secondary);
}

.log-author {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.log-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 var(--space-md) 0;
}

.log-content {
  color: var(--color-text-secondary);
  line-height: 1.8;
  margin: 0 0 var(--space-lg) 0;
  white-space: pre-wrap;
}

.log-actions {
  display: flex;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-surface-dark);
}

.comments-section {
  margin-top: var(--space-lg);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-surface-dark);
}

.comment-form {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.comment-item {
  padding: var(--space-sm);
  background: var(--color-surface-light);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.comment-user {
  font-weight: 600;
  margin-right: var(--space-xs);
}

.comment-content {
  color: var(--color-text-secondary);
}
</style>
