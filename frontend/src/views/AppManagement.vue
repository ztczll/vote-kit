<template>
  <div class="app-management">
    <el-header class="management-header">
      <div class="page-header-inner">
        <h1>
          我的应用
        </h1>
        <div class="feedback-note">
          如需调整设计或部署流程，欢迎随时反馈
        </div>
      </div>
      <p class="management-subtitle">管理由 AI 生成的应用，查看状态并一键部署 / 推送到 ACR</p>
    </el-header>

    <el-main>
      <div class="management-content" v-loading="loading">
        <EmptyState
          v-if="apps.length === 0 && !loading"
          illustration="no-data"
          title="您还没有生成任何应用"
          description="去发现需求并参与投票，高票创意将有机会被 AI 生成应用"
        >
          <template #action>
            <el-button type="primary" @click="$router.push('/')">
              去发现需求
            </el-button>
          </template>
        </EmptyState>

        <div v-else class="apps-list">
          <el-card v-for="app in apps" :key="app.id" class="app-item app-card-elevated">
            <div class="card-header">
              <button
                class="preview-link"
                type="button"
                @click="goToPrototype(app)"
              >
                <div class="preview-thumb" v-if="getPrototypeCoverUrl(app)">
                  <img
                    :src="getPrototypeCoverUrl(app)!"
                    :alt="app.requirement_title || app.name"
                  />
                </div>
                <div class="preview-thumb preview-thumb-placeholder" v-else>
                  <span class="preview-thumb-title">原型预览</span>
                  <span class="preview-thumb-sub">点击查看需求与流程</span>
                </div>
              </button>
              <div class="info-area">
                <div class="info-row">
                  <span class="subdomain">
                    <el-link
                      :href="getAppUrl(app)"
                      target="_blank"
                      :disabled="app.status !== 'running'"
                    >
                      {{ app.subdomain }}
                    </el-link>
                  </span>
                  <span class="created">
                    <span class="created-label">创建于</span>
                    {{ formatDate(app.created_at) }}
                  </span>
                </div>
                <div class="status-toggle-row">
                  <span
                    class="status-badge"
                    :class="statusBadgeClass(app.status)"
                  >
                    {{ getStatusText(app.status) }}
                  </span>
                  <div class="public-control">
                    <span class="public-label">
                      应用广场
                    </span>
                    <el-switch
                      :model-value="!!app.is_public"
                      :loading="visibilityLoading.has(app.id)"
                      active-text="已公开"
                      inactive-text="仅自己可见"
                      @update:model-value="(val: boolean) => toggleVisibility(app, val)"
                    />
                  </div>
                </div>
                <button
                  v-if="app.requirement_id"
                  type="button"
                  class="req-link"
                  @click="goToPrototype(app)"
                >
                  需求与原型 · 查看详情
                </button>
                <p v-else-if="app.description" class="app-description">
                  {{ app.description }}
                </p>
              </div>
            </div>

            <div class="action-buttons">
              <el-button
                class="btn"
                :disabled="app.status !== 'running'"
                @click="openApp(app)"
              >
                打开应用
              </el-button>
              <el-button
                class="btn"
                :disabled="app.status !== 'ready' && app.status !== 'running'"
                @click="downloadSource(app)"
                :loading="downloadingApps.has(app.id)"
              >
                下载源码
              </el-button>
              <el-button
                class="btn"
                @click="viewLogs(app)"
              >
                查看日志
              </el-button>
              <el-button
                class="btn"
                :disabled="app.status === 'generating'"
                @click="restartApp(app)"
              >
                重启
              </el-button>
              <el-button
                v-if="app.status === 'ready' || app.status === 'running'"
                class="btn btn-acr"
                @click="$router.push({ name: 'app-push', params: { id: String(app.id) } })"
              >
                推送到 ACR
              </el-button>
              <el-button
                class="btn btn-deploy"
                :disabled="!(app.status === 'ready' || app.status === 'error')"
                @click="deployApp(app)"
              >
                部署
              </el-button>
              <el-button
                v-if="app.status === 'generating' || app.status === 'deploying'"
                class="btn"
                type="warning"
                :loading="resettingStatus.has(app.id)"
                @click="resetAppStatus(app)"
              >
                重置状态
              </el-button>
              <el-dropdown @command="handleAction" class="more-actions-dropdown">
                <el-button link>
                  更多操作
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item 
                      :command="`open-${app.id}`"
                      :disabled="app.status !== 'running'"
                    >
                      打开应用
                    </el-dropdown-item>
                    <el-dropdown-item :command="`logs-${app.id}`">
                      查看日志
                    </el-dropdown-item>
                    <el-dropdown-item 
                      :command="`restart-${app.id}`"
                      :disabled="app.status === 'generating'"
                    >
                      重启应用
                    </el-dropdown-item>
                    <el-dropdown-item 
                      :command="`stop-${app.id}`"
                      :disabled="app.status !== 'running'"
                    >
                      停止应用
                    </el-dropdown-item>
                    <el-dropdown-item 
                      :command="`deploy-${app.id}`"
                      :disabled="!(app.status === 'ready' || app.status === 'error')"
                    >
                      部署（Jenkins）
                    </el-dropdown-item>
                    <template v-if="app.status === 'generating' || app.status === 'deploying'">
                      <el-dropdown-item :command="`reset-ready-${app.id}`">
                        重置为就绪
                      </el-dropdown-item>
                      <el-dropdown-item :command="`reset-error-${app.id}`">
                        标记为失败
                      </el-dropdown-item>
                      <el-dropdown-item v-if="app.status === 'deploying'" :command="`reset-running-${app.id}`">
                        设为已运行
                      </el-dropdown-item>
                    </template>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </el-card>
        </div>
      </div>
    </el-main>

    <!-- Logs Dialog -->
    <el-dialog v-model="logsVisible" title="应用日志" width="800px">
      <div class="logs-container">
        <pre class="logs-content">{{ currentLogs }}</pre>
      </div>
      <template #footer>
        <el-button @click="logsVisible = false">关闭</el-button>
        <el-button type="primary" @click="refreshLogs">刷新日志</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, Link, Document, Refresh, Download, Upload } from '@element-plus/icons-vue';
import EmptyState from '@/components/EmptyState.vue';
import api from '@/api';
import { getPrototypeImageUrl } from '@/utils/prototypeImage';

const router = useRouter();

interface App {
  id: number;
  name: string;
  description: string;
  subdomain: string;
  status: string;
  created_at: string;
  is_public?: boolean;
  requirement_id?: string;
  requirement_title?: string;
  prototype_screenshot_url?: string | null;
  /** 公网访问地址（与 Jenkins 部署域名一致，无需开放端口） */
  access_url?: string;
}

const loading = ref(false);
const apps = ref<App[]>([]);
const logsVisible = ref(false);
const currentLogs = ref('');
const selectedApp = ref<App | null>(null);
const downloadingApps = ref(new Set<number>());
const visibilityLoading = ref(new Set<number>());
const resettingStatus = ref(new Set<number>());

const loadApps = async () => {
  loading.value = true;
  try {
    const response = await api.get('/app-generation/my-apps');
    apps.value = response.data.data;
  } catch (error) {
    ElMessage.error('加载应用列表失败');
  } finally {
    loading.value = false;
  }
};

const toggleVisibility = async (app: App, isPublic: boolean) => {
  visibilityLoading.value.add(app.id);
  visibilityLoading.value = new Set(visibilityLoading.value);
  try {
    const res = await api.patch(`/app-generation/${app.id}/visibility`, { is_public: isPublic });
    if (res.data.success) {
      app.is_public = isPublic;
      if (!isPublic) {
        ElMessage.success('已设为私有，应用将从应用广场隐藏，仅您可见。');
      } else {
        ElMessage.success('已公开到应用广场');
      }
    } else {
      app.is_public = !isPublic;
      ElMessage.error(res.data.message || '更新失败');
    }
  } catch (err: any) {
    app.is_public = !isPublic;
    ElMessage.error(err.response?.data?.message || '更新失败');
  } finally {
    visibilityLoading.value.delete(app.id);
    visibilityLoading.value = new Set(visibilityLoading.value);
  }
};

const getStatusType = (status: string) => {
  const types: { [key: string]: string } = {
    'running': 'success',
    'generating': 'warning',
    'deploying': 'warning',
    'ready': 'info',
    'stopped': 'info',
    'error': 'danger'
  };
  return types[status] || 'info';
};

const getStatusText = (status: string) => {
  const texts: { [key: string]: string } = {
    'running': '运行中',
    'generating': '生成中',
    'deploying': '部署中',
    'ready': '就绪',
    'stopped': '已停止',
    'error': '错误'
  };
  return texts[status] || status;
};

const statusBadgeClass = (status: string) => {
  if (status === 'running') return 'status-running';
  if (status === 'generating' || status === 'deploying') return 'status-generating';
  if (status === 'error') return 'status-error';
  if (status === 'stopped') return 'status-stopped';
  return 'status-default';
};

const getAppUrl = (app: App) => {
  if (app.status !== 'running') return '#';
  // 优先使用后端返回的公网地址（与 Jenkins 部署域名一致，走 Caddy 无需开放端口）
  if (app.access_url) return app.access_url;
  const port = 4000 + (app.id % 1000);
  return `http://${app.subdomain}.localhost:${port}`;
};

/** 需求原型封面图 URL（优先走前端挂载的 /uploads/prototypes/，后期可改为 OSS） */
const getPrototypeCoverUrl = (app: App): string | null => {
  const pathOrUrl = getPrototypeImageUrl(app.prototype_screenshot_url);
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${window.location.origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

/** 点击卡片封面：跳转到该需求的原型页（AI 应用生成流程） */
const goToPrototype = (app: App) => {
  if (app.requirement_id) {
    router.push(`/requirement/${app.requirement_id}/prototype`);
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const openApp = (app: App) => {
  if (app.status !== 'running') {
    ElMessage.warning('应用尚未运行');
    return;
  }
  window.open(getAppUrl(app), '_blank');
};

const viewLogs = async (app: App) => {
  selectedApp.value = app;
  logsVisible.value = true;
  await refreshLogs();
};

const refreshLogs = async () => {
  if (!selectedApp.value) return;
  
  try {
    const response = await api.get(`/app-generation/${selectedApp.value.id}/logs`);
    currentLogs.value = response.data.data.logs || '暂无日志';
  } catch (error) {
    currentLogs.value = '获取日志失败';
    ElMessage.error('获取日志失败');
  }
};

const restartApp = async (app: App) => {
  try {
    await ElMessageBox.confirm(
      `确定要重启应用 "${app.name}" 吗？`,
      '确认重启',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await api.post(`/app-generation/${app.id}/restart`);
    if (response.data.success) {
      ElMessage.success('应用重启成功');
      loadApps(); // Refresh the list
    } else {
      ElMessage.error('应用重启失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('应用重启失败');
    }
  }
};

const stopApp = async (app: App) => {
  try {
    await ElMessageBox.confirm(
      `确定要停止应用 "${app.name}" 吗？`,
      '确认停止',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await api.post(`/app-generation/${app.id}/stop`);
    if (response.data.success) {
      ElMessage.success('应用已停止');
      loadApps(); // Refresh the list
    } else {
      ElMessage.error('停止应用失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('停止应用失败');
    }
  }
};

const downloadSource = async (app: App) => {
  if (app.status !== 'ready' && app.status !== 'running') {
    ElMessage.warning('应用尚未生成完成，无法下载源码');
    return;
  }

  downloadingApps.value.add(app.id);
  
  try {
    const response = await api.get(`/app-generation/${app.id}/download-source`);
    
    if (response.data.success) {
      const { download_url, file_name } = response.data.data;
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = download_url;
      link.download = file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      ElMessage.success('源码下载已开始');
    } else {
      ElMessage.error('获取下载链接失败');
    }
  } catch (error: any) {
    console.error('Download error:', error);
    ElMessage.error('下载源码失败: ' + (error.response?.data?.message || error.message));
  } finally {
    downloadingApps.value.delete(app.id);
  }
};

const deployApp = async (app: App) => {
  if (!(app.status === 'ready' || app.status === 'error')) {
    ElMessage.warning('仅当应用就绪（ready）或处于错误（error）状态时才可以触发部署');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要为应用 "${app.name}" 触发部署吗？这将启动 Jenkins 流水线。`,
      '确认部署',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );

    const response = await api.post(`/app-generation/${app.id}/deploy`);
    if (response.data.success) {
      ElMessage.success('部署已启动，应用状态更新为部署中');
      app.status = 'deploying';
      // 也可以刷新列表以与后端完全对齐
      // await loadApps();
    } else {
      ElMessage.error(response.data.message || '部署触发失败');
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.message || '部署触发失败');
    }
  }
};

const resetAppStatus = async (app: App, newStatus?: string) => {
  if (app.status !== 'generating' && app.status !== 'deploying') return;
  const statusToSet = newStatus || 'ready';
  try {
    await ElMessageBox.confirm(
      `将「${app.name}」状态设为「${statusToSet === 'ready' ? '就绪' : statusToSet === 'error' ? '失败' : '已运行'}」？`,
      '重置状态',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );
  } catch {
    return;
  }
  resettingStatus.value.add(app.id);
  resettingStatus.value = new Set(resettingStatus.value);
  try {
    const res = await api.patch(`/app-generation/${app.id}/status`, { status: statusToSet });
    if (res.data.success) {
      app.status = statusToSet;
      ElMessage.success('状态已更新');
      loadApps();
    } else {
      ElMessage.error(res.data.message || '重置失败');
    }
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '重置失败');
  } finally {
    resettingStatus.value.delete(app.id);
    resettingStatus.value = new Set(resettingStatus.value);
  }
};

const handleAction = (command: string) => {
  if (command.startsWith('reset-')) {
    const parts = command.split('-');
    const statusPart = parts[1];
    const idStr = parts.slice(2).join('-');
    const app = apps.value.find(a => a.id === parseInt(idStr, 10));
    if (app && (statusPart === 'ready' || statusPart === 'error' || statusPart === 'running')) {
      resetAppStatus(app, statusPart);
    }
    return;
  }
  const [action, appId] = command.split('-');
  const app = apps.value.find(a => a.id === parseInt(appId, 10));
  if (!app) return;

  switch (action) {
    case 'open':
      openApp(app);
      break;
    case 'logs':
      viewLogs(app);
      break;
    case 'restart':
      restartApp(app);
      break;
    case 'stop':
      stopApp(app);
      break;
    case 'deploy':
      deployApp(app);
      break;
  }
};

onMounted(() => {
  loadApps();
});
</script>

<style scoped>
.app-management {
  min-height: 100vh;
  background: radial-gradient(circle at top left, rgba(25, 136, 235, 0.06), transparent 55%),
    radial-gradient(circle at bottom right, rgba(255, 145, 0, 0.05), transparent 55%),
    var(--color-bg-secondary);
}

.management-header {
  padding: 40px 16px 20px;
  border-bottom: 1px solid var(--color-gray-200);
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.96),
    rgba(239, 246, 255, 0.96)
  );
  backdrop-filter: blur(10px);
}

.page-header-inner {
  max-width: 1200px;
  margin: 0 auto 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.management-header h1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-extrabold);
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
}

.management-subtitle {
  max-width: 1200px;
  margin: 8px auto 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.feedback-note {
  background: rgba(248, 250, 252, 0.9);
  border-radius: var(--radius-full);
  padding: 6px 16px;
  font-size: var(--text-sm);
  color: var(--color-primary-700);
  border: 1px dashed rgba(148, 163, 184, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.feedback-note::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary-500);
  box-shadow: 0 0 0 6px rgba(25, 136, 235, 0.16);
}

.management-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px 32px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.app-item {
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: radial-gradient(circle at top left, rgba(148, 163, 184, 0.12), transparent 55%),
    var(--color-bg-primary);
  transition: transform var(--transition-base), box-shadow var(--transition-base),
    border-color var(--transition-base), background var(--transition-base);
}

.app-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: rgba(25, 136, 235, 0.4);
  background: radial-gradient(circle at top left, rgba(25, 136, 235, 0.12), transparent 55%),
    var(--color-bg-primary);
}

.card-header {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  align-items: stretch;
  flex-wrap: wrap;
}

.preview-link {
  border: 0;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  width: 130px;
  height: 96px;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  box-shadow: 0 8px 18px -8px rgba(15, 23, 42, 0.35);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast),
    border-color var(--transition-fast);
  position: relative;
}

.preview-link::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(248, 250, 252, 0.05),
    rgba(191, 219, 254, 0.1)
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

.preview-link:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 14px 26px -10px rgba(37, 99, 235, 0.45);
}

.preview-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-thumb-placeholder {
  flex-direction: column;
  padding: 10px;
  text-align: center;
}

.preview-thumb-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 4px;
}

.preview-thumb-sub {
  font-size: 0.72rem;
  color: #64748b;
}

.info-area {
  flex: 1;
  min-width: 260px;
}

.info-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.subdomain {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.created {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: rgba(15, 23, 42, 0.02);
  padding: 4px 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.created-label {
  opacity: 0.85;
}

.status-toggle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.status-running {
  background: rgba(16, 185, 129, 0.12);
  color: #0f766e;
  border-color: rgba(45, 212, 191, 0.7);
}

.status-generating {
  background: rgba(251, 191, 36, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.7);
}

.status-error {
  background: rgba(248, 113, 113, 0.15);
  color: #b91c1c;
  border-color: rgba(248, 113, 113, 0.8);
}

.status-stopped,
.status-default {
  background: rgba(148, 163, 184, 0.12);
  color: #4b5563;
  border-color: rgba(148, 163, 184, 0.7);
}

.public-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.public-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.req-link {
  margin-top: 8px;
  background: rgba(219, 234, 254, 0.7);
  border-radius: 999px;
  padding: 4px 14px;
  border: 1px solid rgba(129, 140, 248, 0.9);
  font-size: 0.82rem;
  color: #1d4ed8;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast);
}

.req-link:hover {
  background: rgba(191, 219, 254, 1);
  border-color: #2563eb;
  color: #1d4ed8;
  transform: translateY(-1px);
}

.app-description {
  margin-top: 6px;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 16px;
  margin-top: 4px;
  border-top: 1px dashed rgba(203, 213, 225, 0.8);
  align-items: center;
}

.btn {
  border-radius: 999px;
  font-size: 0.82rem;
  padding: 6px 14px;
}

.btn-deploy {
  background: rgba(239, 246, 255, 0.9);
  border-color: #a9c1f0;
  color: #1d4ed8;
}

.btn-deploy:hover {
  background: #dde5fe;
  border-color: #3b6cf4;
}

.btn-acr {
  background: rgba(237, 233, 254, 0.95);
  border-color: #cbc4fa;
  color: #5142a6;
}

.more-actions-dropdown {
  margin-left: auto;
}

.logs-container {
  max-height: 400px;
  overflow-y: auto;
  background: #0b1120;
  border-radius: var(--radius-lg);
  padding: 16px;
  color: #e5e7eb;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.7);
}

.logs-content {
  font-family: 'SF Mono', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (max-width: 768px) {
  .page-header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .feedback-note {
    width: 100%;
    text-align: left;
  }

  .card-header {
    flex-direction: column;
  }

  .preview-link {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .more-actions-dropdown {
    align-self: flex-start;
    margin-left: 0;
  }
}
</style>
