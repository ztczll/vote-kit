<template>
  <div class="feature-voting">
    <div v-if="!plan" class="empty">暂无开发计划</div>
    <div v-else>
      <div class="voting-header">
        <h3>功能清单共识投票</h3>
        <div v-if="isVoting" class="countdown">
          <el-icon><Clock /></el-icon>
          剩余 {{ daysLeft }} 天
        </div>
        <div v-else class="voting-ended">
          <el-icon><Check /></el-icon>
          投票已结束
        </div>
      </div>

      <div v-if="!isVoting && features.length > 0" class="voting-result">
        <el-alert type="success" :closable="false">
          <template #title>
            根据 {{ totalVoters }} 位用户投票，我们将优先开发以下功能
          </template>
        </el-alert>
      </div>

      <div class="features-list">
        <div v-for="feature in features" :key="feature.id" class="feature-item">
          <div class="feature-info">
            <h4 class="feature-title">{{ feature.title }}</h4>
            <p class="feature-desc">{{ feature.description }}</p>
          </div>

          <div class="feature-votes">
            <el-button
              :type="getUserVote(feature.id) === 'must_have' ? 'primary' : 'default'"
              :disabled="!isVoting || !authStore.isAuthenticated"
              @click="handleVote(feature.id, 'must_have')"
              class="vote-btn"
            >
              👍 必须有 ({{ feature.must_have_votes }})
            </el-button>
            <el-button
              :type="getUserVote(feature.id) === 'nice_to_have' ? 'warning' : 'default'"
              :disabled="!isVoting || !authStore.isAuthenticated"
              @click="handleVote(feature.id, 'nice_to_have')"
              class="vote-btn"
            >
              ✨ 最好有 ({{ feature.nice_to_have_votes }})
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="!authStore.isAuthenticated" class="login-tip">
        <el-button type="primary" @click="$router.push('/login')">登录后投票</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Clock, Check } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import type { DevelopmentPlan, PlanFeature } from '@/types';

const props = defineProps<{
  requirementId: string;
}>();

const authStore = useAuthStore();

const plan = ref<DevelopmentPlan | null>(null);
const features = ref<PlanFeature[]>([]);
const userVotes = ref<Record<string, string>>({});
const loading = ref(true);

const isVoting = computed(() => {
  if (!plan.value) return false;
  const endDate = new Date(plan.value.voting_end_date);
  return endDate > new Date() && plan.value.status === 'voting';
});

const daysLeft = computed(() => {
  if (!plan.value) return 0;
  const endDate = new Date(plan.value.voting_end_date);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const totalVoters = computed(() => {
  const voters = new Set<string>();
  features.value.forEach(f => {
    voters.add(`${f.must_have_votes}_${f.nice_to_have_votes}`);
  });
  return features.value.reduce((sum, f) => sum + f.must_have_votes + f.nice_to_have_votes, 0);
});

onMounted(() => {
  loadPlan();
});

async function loadPlan() {
  try {
    const { data } = await api.get(`/requirements/${props.requirementId}/dev-plan`);
    if (data.data.plan) {
      plan.value = data.data.plan;
      features.value = data.data.plan.features || [];
      userVotes.value = data.data.userVotes || {};
    }
  } catch (error) {
    // Plan doesn't exist yet
  } finally {
    loading.value = false;
  }
}

function getUserVote(featureId: string) {
  return userVotes.value[featureId];
}

async function handleVote(featureId: string, voteType: 'must_have' | 'nice_to_have') {
  try {
    await api.post(`/requirements/${props.requirementId}/features/${featureId}/vote`, { voteType });
    ElMessage.success('投票成功！');
    userVotes.value[featureId] = voteType;
    
    // 更新本地票数
    const feature = features.value.find(f => f.id === featureId);
    if (feature) {
      if (voteType === 'must_have') {
        feature.must_have_votes++;
        if (getUserVote(featureId) === 'nice_to_have') {
          feature.nice_to_have_votes--;
        }
      } else {
        feature.nice_to_have_votes++;
        if (getUserVote(featureId) === 'must_have') {
          feature.must_have_votes--;
        }
      }
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '投票失败');
  }
}
</script>

<style scoped>
.feature-voting {
  padding: var(--space-lg) 0;
}

.voting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.voting-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.countdown, .voting-ended {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-weight: 500;
}

.countdown {
  color: var(--color-warning);
}

.voting-ended {
  color: var(--color-success);
}

.voting-result {
  margin-bottom: var(--space-xl);
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.feature-item {
  padding: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-xl);
}

.feature-info {
  flex: 1;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 var(--space-sm) 0;
}

.feature-desc {
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.feature-votes {
  display: flex;
  gap: var(--space-md);
}

.vote-btn {
  min-width: 140px;
}

.login-tip {
  text-align: center;
  padding: var(--space-xl);
  margin-top: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.empty {
  text-align: center;
  padding: var(--space-4xl);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .feature-item {
    flex-direction: column;
    align-items: stretch;
  }

  .feature-votes {
    flex-direction: column;
  }

  .vote-btn {
    width: 100%;
  }
}
</style>
