<template>
  <div class="requirement-card card-hover" @click="$emit('click')">
    <div class="card-cover">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="title"
        class="card-cover-img"
      />
      <div v-else class="card-cover-placeholder" :style="placeholderGradient">
        <span class="card-cover-label">📱 原型生成中</span>
      </div>
    </div>
    <div class="card-body">
      <div class="card-header">
        <h3 class="card-title">{{ title }}</h3>
      </div>
      <div class="card-footer">
        <button
          class="vote-button"
          :class="{ 'voted': hasVoted }"
          @click.stop="handleVote"
          :disabled="!canVote"
        >
          <span class="vote-icon">🔥</span>
          <span class="vote-count">{{ voteCount }}</span>
        </button>
        <span class="status-badge" :class="statusBadgeClass">{{ status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  title: string;
  description: string;
  voteCount: number;
  status: string;
  category: string;
  canVote?: boolean;
  coverImage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  canVote: true
});

const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'vote'): void;
}>();

const hasVoted = ref(false);
const placeholderGradient = { background: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 50%, #A5B4FC 100%)' };

const statusBadgeClass = computed(() => {
  const map: Record<string, string> = {
    '待审核': 'status-warning',
    '投票中': 'status-primary',
    '已采纳': 'status-success',
    '已上线': 'status-success',
    '已拒绝': 'status-danger'
  };
  return map[props.status] || 'status-default';
});

function handleVote() {
  if (!props.canVote) return;
  hasVoted.value = true;
  emit('vote');
}
</script>

<style scoped>
.requirement-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
  aspect-ratio: 16 / 10;
}

.requirement-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-4px);
  border-color: #c7d2fe;
}

.requirement-card:active {
  transform: translateY(-2px);
}

.card-cover {
  flex: 1;
  background: #f2f1ed;
  overflow: hidden;
}

.card-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
  transition: transform 0.3s ease;
}

.requirement-card:hover .card-cover-img {
  transform: scale(1.05);
}

.card-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-cover-label {
  font-size: 14px;
  font-weight: 500;
  color: #6366f1;
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #ffffff;
}

.card-header {
  display: flex;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vote-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: none;
  background: #fef3c7;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 700;
  color: #92400e;
  font-size: 13px;
}

.vote-button:hover:not(:disabled) {
  background: #fde68a;
  transform: scale(1.03);
}

.vote-button:active:not(:disabled) {
  transform: scale(0.98);
}

.vote-button.voted {
  background: #fcd34d;
  color: #92400e;
}

.vote-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
  color: #9ca3af;
}

.vote-icon {
  font-size: 13px;
}

.vote-count {
  font-size: 13px;
  font-weight: 700;
}

.status-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.status-primary {
  background: #dbeafe;
  color: #2563eb;
}

.status-success {
  background: #d1fae5;
  color: #059669;
}

.status-warning {
  background: #fef3c7;
  color: #d97706;
}

.status-danger {
  background: #fee2e2;
  color: #dc2626;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}
</style>
