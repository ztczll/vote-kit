<template>
  <div class="log-timeline">
    <div v-if="logs.length === 0" class="empty">暂无开发日志</div>
    <div v-else>
      <div class="progress-overview">
        <div class="progress-item">
          <span class="progress-label">当前阶段:</span>
          <el-tag type="success">{{ currentPhase }}</el-tag>
        </div>
      </div>

      <div class="timeline">
        <LogCard
          v-for="log in logs"
          :key="log.id"
          :log="log"
          :is-liked="isLiked(log.id)"
          @like="handleLike"
          @unlike="handleUnlike"
          @comment="handleComment"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import LogCard from './LogCard.vue';
import type { DevLog } from '@/types';

const props = defineProps<{
  requirementId: string;
}>();

const authStore = useAuthStore();
const logs = ref<DevLog[]>([]);
const userLikes = ref<string[]>([]);
const loading = ref(true);

const currentPhase = computed(() => {
  if (logs.value.length === 0) return '准备中';
  const latest = logs.value[0];
  const typeMap: Record<string, string> = {
    milestone: '里程碑',
    feature: '功能开发',
    design: '界面设计',
    bugfix: '问题修复'
  };
  return typeMap[latest.log_type] || '开发中';
});

onMounted(() => {
  loadLogs();
});

async function loadLogs() {
  try {
    const { data } = await api.get(`/requirements/${props.requirementId}/dev-logs`);
    logs.value = data.data.logs || [];
    userLikes.value = data.data.userLikes || [];
  } catch (error) {
    ElMessage.error('加载日志失败');
  } finally {
    loading.value = false;
  }
}

function isLiked(logId: string) {
  return userLikes.value.includes(logId);
}

async function handleLike(logId: string) {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录');
    return;
  }

  try {
    await api.post(`/requirements/${props.requirementId}/dev-logs/${logId}/like`);
    userLikes.value.push(logId);
    
    const log = logs.value.find(l => l.id === logId);
    if (log) {
      log.likes_count++;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '点赞失败');
  }
}

async function handleUnlike(logId: string) {
  try {
    await api.delete(`/requirements/${props.requirementId}/dev-logs/${logId}/like`);
    userLikes.value = userLikes.value.filter(id => id !== logId);
    
    const log = logs.value.find(l => l.id === logId);
    if (log) {
      log.likes_count--;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '取消点赞失败');
  }
}

async function handleComment(logId: string, content: string) {
  if (!authStore.isAuthenticated) {
    ElMessage.warning('请先登录');
    return;
  }

  try {
    await api.post(`/requirements/${props.requirementId}/dev-logs/${logId}/comments`, { content });
    ElMessage.success('评论成功！');
    
    const log = logs.value.find(l => l.id === logId);
    if (log) {
      log.comments_count++;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '评论失败');
  }
}
</script>

<style scoped>
.log-timeline {
  padding: var(--space-lg) 0;
}

.progress-overview {
  margin-bottom: var(--space-2xl);
  padding: var(--space-lg);
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 107, 53, 0.05) 100%);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-accent-500);
}

.progress-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.progress-label {
  font-weight: 600;
  color: var(--color-text-primary);
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.empty {
  text-align: center;
  padding: var(--space-4xl);
  color: var(--color-text-secondary);
}
</style>
