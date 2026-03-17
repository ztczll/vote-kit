<template>
  <div class="task-management">
    <div class="page-header">
      <h1>📊 AI生成任务管理</h1>
      <p>查看所有AI生成应用的任务状态、Tokens消耗和费用</p>
    </div>

    <div class="task-content">
      <div class="filter-bar">
        <el-select v-model="statusFilter" placeholder="筛选状态" clearable style="width: 200px">
          <el-option label="全部" value="" />
          <el-option label="生成中" value="generating" />
          <el-option label="就绪" value="ready" />
          <el-option label="错误" value="error" />
        </el-select>
        <el-button @click="loadTasks" :loading="loading">刷新</el-button>
      </div>

      <EmptyState
        v-if="!loading && filteredTasks.length === 0"
        :illustration="tasks.length === 0 ? 'no-tasks' : 'no-results'"
        :title="tasks.length === 0 ? '还没有任何任务' : '当前筛选下暂无任务'"
        :description="tasks.length === 0 ? '在需求详情页使用「AI 生成应用」后，任务会出现在这里' : '试试其他筛选条件'"
      />
      <el-table 
        v-else
        :data="filteredTasks" 
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="应用名称" min-width="150" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tokens_used" label="Tokens消耗" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.tokens_used">{{ row.tokens_used.toLocaleString() }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="cost_cents" label="费用" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.cost_cents">¥{{ (row.cost_cents / 100).toFixed(2) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="billing_status" label="计费状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getBillingStatusType(row.billing_status)" size="small">
              {{ getBillingStatusText(row.billing_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="viewDetails(row)"
            >
              详情
            </el-button>
            <el-button 
              type="success" 
              size="small" 
              :disabled="row.status !== 'ready'"
              @click="downloadSource(row)"
              :loading="downloadingTasks.has(row.id)"
            >
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Summary Card -->
      <el-card class="summary-card" v-if="tasks.length > 0">
        <template #header>
          <span>统计信息</span>
        </template>
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ tasks.length }}</div>
              <div class="stat-label">总任务数</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ totalTokens.toLocaleString() }}</div>
              <div class="stat-label">总Tokens</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">¥{{ totalCost.toFixed(2) }}</div>
              <div class="stat-label">总费用</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-item">
              <div class="stat-value">{{ readyCount }}</div>
              <div class="stat-label">已完成</div>
            </div>
          </el-col>
        </el-row>
      </el-card>
    </div>

    <!-- Details Dialog -->
    <el-dialog v-model="detailsVisible" title="任务详情" width="600px">
      <div v-if="selectedTask">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="应用ID">{{ selectedTask.id }}</el-descriptions-item>
          <el-descriptions-item label="应用名称">{{ selectedTask.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedTask.status)">
              {{ getStatusText(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Tokens消耗">
            {{ selectedTask.tokens_used ? selectedTask.tokens_used.toLocaleString() : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="费用">
            {{ selectedTask.cost_cents ? `¥${(selectedTask.cost_cents / 100).toFixed(2)}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="计费状态">
            <el-tag :type="getBillingStatusType(selectedTask.billing_status)" size="small">
              {{ getBillingStatusText(selectedTask.billing_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedTask.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" v-if="selectedTask.updated_at">
            {{ formatDate(selectedTask.updated_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" v-if="selectedTask.error_message">
            <el-text type="danger">{{ selectedTask.error_message }}</el-text>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import EmptyState from '@/components/EmptyState.vue';
import api from '@/api';

interface Task {
  id: number;
  name: string;
  description: string;
  status: string;
  tokens_used: number | null;
  cost_cents: number | null;
  billing_status: string;
  created_at: string;
  updated_at: string | null;
  error_message: string | null;
}

const loading = ref(false);
const tasks = ref<Task[]>([]);
const statusFilter = ref('');
const detailsVisible = ref(false);
const selectedTask = ref<Task | null>(null);
const downloadingTasks = ref(new Set<number>());

const filteredTasks = computed(() => {
  if (!statusFilter.value) {
    return tasks.value;
  }
  return tasks.value.filter(task => task.status === statusFilter.value);
});

const totalTokens = computed(() => {
  return tasks.value.reduce((sum, task) => sum + (task.tokens_used || 0), 0);
});

const totalCost = computed(() => {
  return tasks.value.reduce((sum, task) => sum + (task.cost_cents || 0), 0) / 100;
});

const readyCount = computed(() => {
  return tasks.value.filter(task => task.status === 'ready').length;
});

const loadTasks = async () => {
  loading.value = true;
  try {
    const response = await api.get('/app-generation/my-apps');
    tasks.value = response.data.data;
  } catch (error) {
    ElMessage.error('加载任务列表失败');
  } finally {
    loading.value = false;
  }
};

const getStatusType = (status: string) => {
  const types: { [key: string]: string } = {
    'generating': 'warning',
    'ready': 'success',
    'error': 'danger',
    'deploying': 'info',
    'stopped': 'info'
  };
  return types[status] || 'info';
};

const getStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    'generating': '生成中',
    'ready': '就绪',
    'error': '错误',
    'deploying': '部署中',
    'stopped': '已停止'
  };
  return texts[status] || status;
};

const getBillingStatusType = (status: string) => {
  const types: { [key: string]: string } = {
    'pending': 'info',
    'calculated': 'success',
    'paid': 'success',
    'free': 'info'
  };
  return types[status] || 'info';
};

const getBillingStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    'pending': '待计算',
    'calculated': '已计算',
    'paid': '已支付',
    'free': '免费'
  };
  return texts[status] || status;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const viewDetails = (task: Task) => {
  selectedTask.value = task;
  detailsVisible.value = true;
};

const downloadSource = async (task: Task) => {
  if (task.status !== 'ready') {
    ElMessage.warning('只能下载就绪状态的应用源码');
    return;
  }

  downloadingTasks.value.add(task.id);
  
  try {
    const response = await api.get(`/app-generation/${task.id}/download-source`);
    
    if (response.data.success && response.data.data.download_url) {
      const downloadUrl = response.data.data.download_url;
      const filename = response.data.data.file_name || `${task.name}-source.zip`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      ElMessage.success(`源码下载已开始: ${filename}`);
    } else {
      throw new Error(response.data.message || '下载链接获取失败');
    }
  } catch (error: any) {
    console.error('Source download error:', error);
    ElMessage.error('源码下载失败: ' + (error.response?.data?.message || error.message));
  } finally {
    downloadingTasks.value.delete(task.id);
  }
};

onMounted(() => {
  loadTasks();
  
  // Auto refresh every 10 seconds if any task is generating
  setInterval(() => {
    const hasGenerating = tasks.value.some(task => task.status === 'generating');
    if (hasGenerating) {
      loadTasks();
    }
  }, 10000);
});
</script>

<style scoped>
.task-management {
  min-height: 100vh;
  background: var(--neu-bg);
  padding-bottom: var(--space-2xl);
}

.task-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.page-header {
  text-align: center;
  padding: var(--space-3xl) var(--space-lg);
  margin-bottom: var(--space-2xl);
  background: var(--neu-bg);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  position: relative;
  overflow: hidden;
}

.page-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(0, 122, 255, 0.3) 20%,
    rgba(255, 149, 0, 0.3) 50%,
    rgba(0, 122, 255, 0.3) 80%,
    transparent 100%);
}

.page-header h1 {
  margin: 0 0 var(--space-sm) 0;
  font-size: 2.5em;
  background: linear-gradient(135deg, var(--neu-accent-blue) 0%, var(--neu-accent-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
}

.page-header p {
  margin: 0;
  font-size: 1.2em;
  color: var(--color-text-secondary);
}

.filter-bar {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: 0 var(--space-lg);
  align-items: center;
}

.filter-bar :deep(.el-select) {
  width: 200px;
}

.filter-bar :deep(.el-select .el-input__wrapper) {
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-inner-light),
              var(--neu-shadow-inner-dark);
  border-radius: var(--radius-md);
  border: none;
}

.filter-bar :deep(.el-select .el-input__wrapper:hover) {
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
}

.filter-bar .el-button {
  background: var(--neu-bg);
  border: none;
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  border-radius: var(--radius-md);
  transition: all var(--transition-spring);
}

.filter-bar .el-button:hover {
  box-shadow: var(--neu-shadow-hover);
  transform: translateY(-2px);
}

.filter-bar .el-button:active {
  box-shadow: var(--neu-shadow-pressed);
  transform: translateY(0);
}

:deep(.el-table) {
  background: var(--neu-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  overflow: hidden;
}

:deep(.el-table th) {
  background: var(--neu-bg);
  color: var(--color-text-primary);
  font-weight: 600;
  border-bottom: 2px solid rgba(163, 177, 198, 0.3);
}

:deep(.el-table td) {
  background: var(--neu-bg);
  border-bottom: 1px solid rgba(163, 177, 198, 0.2);
}

:deep(.el-table tr:hover > td) {
  background: rgba(0, 122, 255, 0.05);
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: rgba(163, 177, 198, 0.05);
}

.summary-card {
  margin-top: var(--space-xl);
  background: var(--neu-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  border: none;
}

.summary-card :deep(.el-card__header) {
  background: var(--neu-bg);
  border-bottom: 1px solid rgba(163, 177, 198, 0.2);
  padding: var(--space-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.summary-card :deep(.el-card__body) {
  background: var(--neu-bg);
  padding: var(--space-lg);
}

.stat-item {
  text-align: center;
  padding: var(--space-lg);
  background: var(--neu-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--neu-shadow-soft);
  transition: all var(--transition-base);
}

.stat-item:hover {
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  transform: translateY(-2px);
}

.stat-value {
  font-size: 2.5em;
  font-weight: 700;
  background: linear-gradient(135deg, var(--neu-accent-blue) 0%, var(--neu-accent-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-sm);
  line-height: 1;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.9em;
  font-weight: 500;
}

.text-muted {
  color: var(--color-text-tertiary);
}

:deep(.el-tag) {
  border: none;
  border-radius: var(--radius-full);
  font-weight: 500;
  padding: var(--space-xs) var(--space-md);
}

:deep(.el-tag--success) {
  background: linear-gradient(135deg, var(--color-success) 0%, #4CD964 100%);
  color: var(--color-text-inverse);
  box-shadow: 2px 2px 4px rgba(52, 199, 89, 0.3),
              -2px -2px 4px rgba(76, 217, 100, 0.2);
}

:deep(.el-tag--warning) {
  background: linear-gradient(135deg, var(--color-warning) 0%, var(--neu-accent-orange-light) 100%);
  color: var(--color-text-inverse);
  box-shadow: 2px 2px 4px rgba(255, 149, 0, 0.3),
              -2px -2px 4px rgba(255, 179, 64, 0.2);
}

:deep(.el-tag--info) {
  background: linear-gradient(135deg, var(--color-info) 0%, var(--neu-accent-blue-light) 100%);
  color: var(--color-text-inverse);
  box-shadow: 2px 2px 4px rgba(0, 122, 255, 0.3),
              -2px -2px 4px rgba(90, 200, 250, 0.2);
}

:deep(.el-tag--danger) {
  background: linear-gradient(135deg, var(--color-error) 0%, #FF6B6B 100%);
  color: var(--color-text-inverse);
  box-shadow: 2px 2px 4px rgba(255, 59, 48, 0.3),
              -2px -2px 4px rgba(255, 107, 107, 0.2);
}

:deep(.el-button) {
  border-radius: var(--radius-md);
  transition: all var(--transition-spring);
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, var(--neu-accent-blue) 0%, var(--neu-accent-blue-light) 100%);
  border: none;
  box-shadow: 4px 4px 8px rgba(0, 122, 255, 0.3),
              -4px -4px 8px rgba(90, 200, 250, 0.2);
  color: var(--color-text-inverse);
}

:deep(.el-button--primary:hover) {
  box-shadow: 6px 6px 12px rgba(0, 122, 255, 0.4),
              -6px -6px 12px rgba(90, 200, 250, 0.3);
  transform: translateY(-2px);
}

:deep(.el-button--primary:active) {
  box-shadow: inset 3px 3px 6px rgba(0, 122, 255, 0.3),
              inset -3px -3px 6px rgba(90, 200, 250, 0.2);
  transform: translateY(0);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, var(--color-success) 0%, #4CD964 100%);
  border: none;
  box-shadow: 4px 4px 8px rgba(52, 199, 89, 0.3),
              -4px -4px 8px rgba(76, 217, 100, 0.2);
  color: var(--color-text-inverse);
}

:deep(.el-button--success:hover) {
  box-shadow: 6px 6px 12px rgba(52, 199, 89, 0.4),
              -6px -6px 12px rgba(76, 217, 100, 0.3);
  transform: translateY(-2px);
}

:deep(.el-button--success:active) {
  box-shadow: inset 3px 3px 6px rgba(52, 199, 89, 0.3),
              inset -3px -3px 6px rgba(76, 217, 100, 0.2);
  transform: translateY(0);
}

:deep(.el-dialog) {
  border-radius: var(--radius-xl);
  background: var(--neu-bg);
  box-shadow: var(--neu-shadow-hover);
  border: none;
}

:deep(.el-dialog__header) {
  background: var(--neu-bg);
  border-bottom: 1px solid rgba(163, 177, 198, 0.2);
  padding: var(--space-lg);
}

:deep(.el-dialog__body) {
  background: var(--neu-bg);
  padding: var(--space-lg);
}

:deep(.el-descriptions) {
  background: var(--neu-bg);
}

:deep(.el-descriptions__label) {
  color: var(--color-text-secondary);
  font-weight: 500;
}

:deep(.el-descriptions__content) {
  color: var(--color-text-primary);
}

@media (max-width: 768px) {
  .page-header {
    padding: var(--space-xl) var(--space-md);
  }
  
  .page-header h1 {
    font-size: 2em;
  }
  
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-bar :deep(.el-select) {
    width: 100%;
  }
}
</style>

