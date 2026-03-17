<template>
  <div class="app-store">
    <div class="store-header">
      <h1>🚀 应用广场</h1>
      <p>发现由 AI 自动生成的精彩应用</p>
    </div>

    <div class="store-content">
      <div class="search-section">
        <div class="search-bar">
          <el-input
            v-model="searchQuery"
            placeholder="🔍 搜索应用名称、描述或需求..."
            prefix-icon="Search"
            size="large"
            clearable
            @input="filterApps"
          />
        </div>
        <div class="search-stats" v-if="searchQuery">
          <el-text size="small" type="info">
            找到 {{ filteredApps.length }} 个相关应用
          </el-text>
        </div>
      </div>

      <div class="apps-grid" v-loading="loading">
        <el-card 
          v-for="app in filteredApps" 
          :key="app.id"
          class="app-card"
          shadow="hover"
        >
          <template #header>
            <div class="card-header">
              <span class="app-name">{{ app.name }}</span>
              <el-tag :type="getStatusType(app.status)">{{ getStatusText(app.status) }}</el-tag>
            </div>
          </template>
          
          <div class="app-content">
            <p class="app-description">{{ truncateText(app.description, 100) }}</p>
            <div class="app-meta">
              <el-text size="small" type="info">
                基于需求: {{ truncateText(app.requirement_title, 30) }}
              </el-text>
              <br>
              <el-text size="small" type="info">
                创建者: {{ app.username }}
              </el-text>
            </div>
          </div>

          <template #footer>
            <div class="card-footer">
              <div class="primary-actions">
                <BaseButton
                  variant="primary"
                  size="small"
                  :disabled="app.status !== 'running'"
                  @click="openApp(app)"
                >
                  {{ app.status === 'running' ? '打开应用' : '应用未运行' }}
                </BaseButton>
                <BaseButton
                  v-if="app.status === 'ready' || app.status === 'running'"
                  variant="secondary"
                  size="small"
                  @click="$router.push({ name: 'app-push', params: { id: String(app.id) } })"
                >
                  推送 ACR
                </BaseButton>
              </div>
              <div class="secondary-actions">
                <BaseButton
                  variant="primary"
                  size="small"
                  :disabled="app.status !== 'ready'"
                  @click="downloadSource(app)"
                  :loading="downloadingApps.has(app.id)"
                >
                  {{ app.status === 'ready' ? '下载' : app.status === 'generating' ? '生成中' : '不可用' }}
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="small"
                  @click="viewDetails(app)"
                >
                  详情
                </BaseButton>
              </div>
            </div>
          </template>
        </el-card>
      </div>

      <EmptyState
        v-if="!loading && filteredApps.length === 0"
        illustration="no-data"
        title="暂无应用"
        :description="searchQuery ? '未找到匹配的应用，试试其他关键词' : '应用广场暂时没有应用，参与投票让高票需求被生成吧'"
      />
    </div>

    <!-- App Details Dialog -->
    <el-dialog v-model="detailsVisible" title="应用详情" width="600px">
      <div v-if="selectedApp">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="应用名称">{{ selectedApp.name }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedApp.status)">
              {{ getStatusText(selectedApp.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="子域名">{{ selectedApp.subdomain }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedApp.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="创建者">{{ selectedApp.username }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ selectedApp.description }}</el-descriptions-item>
          <el-descriptions-item v-if="isAppCreator(selectedApp)" label="应用广场">
            <el-switch
              :model-value="selectedApp.is_public"
              :loading="visibilityLoading.has(selectedApp.id)"
              active-text="已公开"
              inactive-text="仅自己可见"
              @change="(val: boolean) => toggleVisibility(selectedApp!, val)"
            />
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailsVisible = false">关闭</el-button>
        <el-button 
          type="success" 
          :disabled="!selectedApp || selectedApp.status !== 'ready'"
          @click="downloadSource(selectedApp)"
          :loading="selectedApp && downloadingApps.has(selectedApp.id)"
        >
          {{ selectedApp && selectedApp.status === 'ready' ? '下载源码' : '生成中...' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import EmptyState from '@/components/EmptyState.vue';
import api from '@/api';
import BaseButton from '@/components/BaseButton.vue';
import { useAuthStore } from '@/stores/auth';

interface App {
  id: number;
  name: string;
  description: string;
  subdomain: string;
  status: string;
  requirement_title: string;
  username: string;
  created_at: string;
  created_by?: string;
  is_public?: boolean;
  /** 公网访问地址（与 Jenkins 部署域名一致） */
  access_url?: string;
  deployment_url?: string;
}

const loading = ref(false);
const searchQuery = ref('');
const apps = ref<App[]>([]);
const filteredApps = ref<App[]>([]);
const authStore = useAuthStore();
const detailsVisible = ref(false);
const selectedApp = ref<App | null>(null);
const downloadingApps = ref(new Set<number>());
const visibilityLoading = ref(new Set<number>());

const loadApps = async () => {
  loading.value = true;
  try {
    const response = await api.get('/app-generation/marketplace');
    apps.value = response.data.data;
    filteredApps.value = apps.value;
    
    // Auto refresh if any app is generating
    const hasGenerating = apps.value.some(app => app.status === 'generating');
    if (hasGenerating) {
      setTimeout(() => {
        loadApps();
      }, 5000); // Refresh every 5 seconds if generating
    }
  } catch (error) {
    ElMessage.error('加载应用列表失败');
  } finally {
    loading.value = false;
  }
};

const filterApps = () => {
  if (!searchQuery.value) {
    filteredApps.value = apps.value;
    return;
  }
  
  const query = searchQuery.value.toLowerCase();
  filteredApps.value = apps.value.filter(app => 
    app.name.toLowerCase().includes(query) ||
    app.description.toLowerCase().includes(query) ||
    app.requirement_title.toLowerCase().includes(query)
  );
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

const isAppCreator = (app: App) => authStore.user?.id && app.created_by === authStore.user.id;

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

const openApp = (app: App | null) => {
  if (!app || app.status !== 'running') {
    ElMessage.warning('应用尚未运行');
    return;
  }
  // 优先使用公网地址 access_url（与 Jenkins 部署域名一致，无需开放端口）
  const url = app.access_url || app.deployment_url || `http://${app.subdomain}.apps.qietugf.top`;
  window.open(url, '_blank');
};

const downloadSource = async (app: App | null) => {
  if (!app) {
    return;
  }
  
  // 只有状态为 ready 的应用才能下载
  if (app.status !== 'ready') {
    ElMessage.warning('应用正在生成中，请稍候...');
    return;
  }

  downloadingApps.value.add(app.id);
  
  try {
    ElMessage.info('正在准备源码下载...');
    
    const response = await api.get(`/app-generation/${app.id}/download-source`);
    
    if (response.data.success && response.data.data.download_url) {
      const downloadUrl = response.data.data.download_url;
      const filename = response.data.data.filename || `${app.name}-source.zip`;
      
      // 确保下载链接使用与当前页面相同的协议（HTTPS/HTTP）
      // 如果 downloadUrl 是相对路径，浏览器会自动使用当前页面的协议
      // 如果是绝对路径但协议不匹配，需要修正
      let finalUrl = downloadUrl;
      if (downloadUrl.startsWith('http://') && window.location.protocol === 'https:') {
        // 如果页面是 HTTPS，但链接是 HTTP，转换为 HTTPS
        finalUrl = downloadUrl.replace('http://', 'https://');
      } else if (downloadUrl.startsWith('/')) {
        // 相对路径，使用当前页面的 origin 和协议
        finalUrl = `${window.location.origin}${downloadUrl}`;
      }
      
      // 创建下载链接
      const link = document.createElement('a');
      link.href = finalUrl;
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
    downloadingApps.value.delete(app.id);
  }
};

const viewDetails = (app: App) => {
  selectedApp.value = app;
  detailsVisible.value = true;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN');
};

const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

onMounted(() => {
  loadApps();
});
</script>

<style scoped>
.app-store {
  min-height: 100vh;
  background: var(--color-bg-secondary);
  padding-bottom: var(--space-3xl);
}

.store-content {
  max-width: 1200px;
  margin: 0 auto;
}

.store-header {
  text-align: center;
  padding: var(--space-3xl) var(--space-lg) var(--space-2xl);
  margin-bottom: var(--space-2xl);
  background: radial-gradient(circle at top, rgba(248, 250, 252, 0.95), #ffffff);
  border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

.store-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(25, 136, 235, 0.35) 25%,
    rgba(255, 145, 0, 0.4) 50%,
    rgba(25, 136, 235, 0.35) 75%,
    transparent 100%
  );
}

.store-header h1 {
  margin: 0 0 var(--space-sm) 0;
  font-size: 2.3rem;
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-accent-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.store-header p {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
}

.search-section {
  max-width: 600px;
  margin: 0 auto var(--space-xl) auto;
  padding: 0 var(--space-lg);
}

.search-bar {
  position: relative;
  margin-bottom: var(--space-md);
}

.search-stats {
  text-align: center;
  opacity: 0.8;
}

.search-bar :deep(.el-input) {
  height: 56px; /* 增加高度 */
}

.search-bar :deep(.el-input__wrapper) {
  background: var(--color-bg-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-lg);
  border: 2px solid rgba(25, 136, 235, 0.2);
  padding: 0 var(--space-lg);
  transition: all var(--transition-base);
}

.search-bar :deep(.el-input__wrapper:hover) {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(25, 136, 235, 0.4);
  transform: translateY(-2px);
}

.search-bar :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 8px 25px rgba(25, 136, 235, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 1);
  border-color: var(--color-primary-500);
  transform: translateY(-2px);
}

.search-bar :deep(.el-input__inner) {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.search-bar :deep(.el-input__inner::placeholder) {
  color: var(--color-text-tertiary);
  font-weight: 400;
}

.search-bar :deep(.el-input__prefix) {
  color: var(--color-primary-500);
  font-size: 18px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-lg);
  padding: 0 var(--space-lg);
  max-width: 1200px;
  margin: 0 auto;
}

.app-card {
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-gray-200);
  height: 300px;
  display: flex;
  flex-direction: column;
}

.app-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top left, rgba(25, 136, 235, 0.08), transparent 60%);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-base);
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: rgba(25, 136, 235, 0.45);
}

.app-card:hover::before {
  opacity: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid rgba(163, 177, 198, 0.2);
}

.app-name {
  font-weight: 600;
  font-size: 1.1em;
  color: var(--color-text-primary);
}

.app-content {
  flex: 1; /* 占据剩余空间 */
  padding: var(--space-md) 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-description {
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
  line-height: 1.6;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3; /* 限制为3行 */
  -webkit-box-orient: vertical;
}

.app-meta {
  font-size: 0.9em;
  color: var(--color-text-tertiary);
  margin-top: auto; /* 推到底部 */
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding-top: var(--space-md);
  border-top: 1px solid rgba(163, 177, 198, 0.2);
}

.primary-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: space-between;
}

.secondary-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: space-between;
}

.card-footer .el-button {
  border-radius: var(--radius-md);
  transition: all var(--transition-spring);
}

.card-footer .el-button--primary {
  background: var(--neu-bg);
  border: none;
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  color: var(--color-text-primary);
}

.card-footer .el-button--primary:hover {
  box-shadow: var(--neu-shadow-hover);
  transform: translateY(-2px);
}

.card-footer .el-button--primary:active {
  box-shadow: var(--neu-shadow-pressed);
  transform: translateY(0);
}

.card-footer .el-button--success {
  background: linear-gradient(135deg, var(--color-success) 0%, #4CD964 100%);
  border: none;
  box-shadow: 4px 4px 8px rgba(52, 199, 89, 0.3),
              -4px -4px 8px rgba(76, 217, 100, 0.2);
  color: var(--color-text-inverse);
}

.card-footer .el-button--success:hover {
  box-shadow: 6px 6px 12px rgba(52, 199, 89, 0.4),
              -6px -6px 12px rgba(76, 217, 100, 0.3);
  transform: translateY(-2px);
}

.card-footer .el-button--success:active {
  box-shadow: inset 3px 3px 6px rgba(52, 199, 89, 0.3),
              inset -3px -3px 6px rgba(76, 217, 100, 0.2);
  transform: translateY(0);
}

.card-footer .el-button--info {
  background: var(--neu-bg);
  border: none;
  box-shadow: var(--neu-shadow-soft);
  color: var(--color-text-secondary);
}

.card-footer .el-button--info:hover {
  box-shadow: var(--neu-shadow-outer-light),
              var(--neu-shadow-outer-dark);
  transform: translateY(-1px);
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

:deep(.el-dialog__footer) {
  background: var(--neu-bg);
  border-top: 1px solid rgba(163, 177, 198, 0.2);
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

/* Element Plus Card 布局优化 */
:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
}

:deep(.el-card__header) {
  padding: var(--space-md);
  flex-shrink: 0;
}

:deep(.el-card__footer) {
  padding: var(--space-md);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .apps-grid {
    grid-template-columns: 1fr;
    padding: 0 var(--space-md);
    gap: var(--space-md);
  }
  
  .app-card {
    height: 340px; /* 移动端稍微高一点以适应两行按钮 */
  }
  
  .search-section {
    padding: 0 var(--space-md);
  }
  
  .search-bar :deep(.el-input) {
    height: 52px; /* 移动端稍微小一点 */
  }
  
  .search-bar :deep(.el-input__inner) {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  .store-header {
    padding: var(--space-xl) var(--space-md);
  }
  
  .store-header h1 {
    font-size: 2em;
  }
  
  .card-footer {
    gap: var(--space-xs);
  }
  
  .primary-actions,
  .secondary-actions {
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .primary-actions .el-button,
  .secondary-actions .el-button {
    width: 100%;
  }
}
</style>
