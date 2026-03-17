<template>
  <div class="credit-dashboard">
    <el-header class="dashboard-header">
      <h1>信用点仪表盘</h1>
      <p>查看额度、消费记录与套餐信息</p>
    </el-header>

    <el-main v-loading="loading">
      <template v-if="!loading && usage">
        <!-- 1. 核心状态区 -->
        <section class="core-section">
          <div class="balance-block">
            <div class="balance-label">当前可用信用点</div>
            <div class="balance-value">{{ formatNumber(usage.creditsRemaining) }}</div>
          </div>
          <div class="progress-block">
            <div class="progress-header">
              <span>已用 {{ usage.creditsLimit ? Math.round((usage.creditsUsed / usage.creditsLimit) * 100) : 0 }}%</span>
              <span>{{ formatNumber(usage.creditsUsed) }} / {{ formatNumber(usage.creditsLimit) }}</span>
            </div>
            <el-progress
              :percentage="usage.creditsLimit ? Math.min(100, Math.round((usage.creditsUsed / usage.creditsLimit) * 100)) : 0"
              :color="progressColor"
              :stroke-width="12"
            />
          </div>
          <div class="plan-info">
            <span>当前套餐：{{ planLabel }}</span>
            <span class="sep">|</span>
            <span>月度重置</span>
            <span class="sep">|</span>
            <span>{{ usage.resetLabel || '每月 1 日重置' }}</span>
          </div>
        </section>

        <!-- 2. 快捷操作区 -->
        <section class="quick-section">
          <el-button type="primary" @click="$router.push('/pricing')">升级套餐</el-button>
          <el-button type="success" plain @click="topupDialogVisible = true">购买加油包</el-button>
          <el-button type="info" plain @click="$router.push('/')">去发现需求</el-button>
        </section>

        <!-- 3. 消费透明区 -->
        <section class="consume-section">
          <h3>近期消费记录</h3>
          <el-table :data="usage.recentConsumption || []" stripe style="width: 100%">
            <el-table-column prop="createdAt" label="时间" width="180">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="taskType" label="任务类型" width="100" />
            <el-table-column prop="taskLabel" label="描述" min-width="160" show-overflow-tooltip />
            <el-table-column prop="credits" label="消耗点数" width="100" align="right" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getTaskStatusType(row.status)" size="small">{{ getTaskStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
          <div class="bill-link">
            <el-link type="primary" :underline="false" @click="$router.push('/app-tasks')">
              查看完整账单（任务列表）
            </el-link>
          </div>
        </section>

        <!-- 4. 辅助信息区 -->
        <section class="aux-section">
          <p class="credits-hint">
            1 信用点 ≈ 1 次需求/原型生成；生成 1 个完整应用约消耗 25 信用点。
          </p>
        </section>
      </template>

      <el-empty v-else-if="!loading && !usage" description="无法加载用量数据" />

      <el-dialog v-model="topupDialogVisible" title="购买 Credits 加油包" width="420px">
        <el-radio-group v-model="topupPkg" class="topup-group">
          <el-radio label="starter">入门包 · 500 Credits · ¥6</el-radio>
          <el-radio label="pro">专业包 · 2000 Credits · ¥20</el-radio>
          <el-radio label="team">团队包 · 8000 Credits · ¥72</el-radio>
        </el-radio-group>
        <template #footer>
          <el-button @click="topupDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="topupLoading" @click="handleTopup">确认购买（测试环境直接到账）</el-button>
        </template>
      </el-dialog>
    </el-main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '@/api/client';

const loading = ref(true);
const usage = ref<{
  plan: string;
  planExpiresAt: string | null;
  resetLabel: string;
  creditsUsed: number;
  creditsLimit: number;
  creditsRemaining: number;
  recentConsumption: Array<{
    taskId: string;
    createdAt: string;
    taskType: string;
    taskLabel: string;
    credits: number;
    status: string;
  }>;
} | null>(null);

const planLabels: Record<string, string> = {
  free: '免费版',
  pro: 'Pro 版',
  pro_plus: 'Pro+ 版',
  enterprise: '企业版',
};

const progressColors: Record<string, string> = {
  free: '#909399',
  pro: '#409eff',
  pro_plus: '#67c23a',
  enterprise: '#e6a23c',
};

const planLabel = ref('免费版');
const progressColor = ref('#409eff');

const topupDialogVisible = ref(false);
const topupPkg = ref<'starter' | 'pro' | 'team'>('starter');
const topupLoading = ref(false);

function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(v: string): string {
  if (!v) return '-';
  const d = new Date(v);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTaskStatusType(status: string): string {
  const map: Record<string, string> = {
    pending: 'info',
    running: 'warning',
    completed: 'success',
    failed: 'danger',
    ready: 'success',
  };
  return map[status] || 'info';
}

function getTaskStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理',
    running: '进行中',
    completed: '已完成',
    failed: '失败',
    ready: '就绪',
  };
  return map[status] || status;
}

async function loadUsage() {
  loading.value = true;
  try {
    const { data } = await api.get<{ success: boolean; data: typeof usage.value }>('/subscriptions/usage');
    if (data?.success && data.data) {
      usage.value = data.data;
      planLabel.value = planLabels[data.data.plan] || data.data.plan;
      progressColor.value = progressColors[data.data.plan] || '#409eff';
    }
  } catch {
    usage.value = null;
  } finally {
    loading.value = false;
  }
}

async function handleTopup() {
  if (!topupPkg.value) return;
  topupLoading.value = true;
  try {
    await api.post('/subscriptions/topup', { pkg: topupPkg.value });
    topupDialogVisible.value = false;
    ElMessage?.success?.('加油包已到账（测试环境）');
    await loadUsage();
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    topupLoading.value = false;
  }
}

onMounted(loadUsage);
</script>

<style scoped>
.credit-dashboard {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px 24px;
}

.dashboard-header {
  padding: 24px 0 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.dashboard-header h1 {
  margin: 0 0 8px;
  font-size: 1.5rem;
}

.dashboard-header p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.core-section {
  margin: 24px 0;
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.balance-block {
  margin-bottom: 16px;
}

.balance-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.balance-value {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.progress-block {
  margin-bottom: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--el-text-color-regular);
  margin-bottom: 6px;
}

.plan-info {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.plan-info .sep {
  margin: 0 8px;
  color: var(--el-border-color);
}

.quick-section {
  margin-bottom: 28px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.consume-section {
  margin-bottom: 24px;
}

.consume-section h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.bill-link {
  margin-top: 12px;
}

.aux-section {
  padding: 12px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.credits-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
}
</style>
