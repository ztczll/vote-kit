<template>
  <div class="push-to-acr">
    <div class="page-header">
      <h1>镜像构建与推送中心</h1>
      <p class="subtitle">将AI生成的应用程序构建为Docker镜像并推送到阿里云ACR个人版实例</p>
    </div>

    <div v-loading="loading" class="page-content">
      <EmptyState
        v-if="!loading && !app"
        illustration="no-data"
        title="应用不存在"
        description="未找到该应用，请从我的应用或应用市场选择有效应用后再推送"
      >
        <template #action>
          <el-button v-if="authStore.isAuthenticated" type="primary" @click="$router.push('/my-apps')">
            返回我的应用
          </el-button>
          <el-button type="primary" @click="$router.push('/app-store')">
            返回应用市场
          </el-button>
        </template>
      </EmptyState>

      <template v-else-if="app">
        <!-- 应用信息卡片 -->
        <el-card class="app-card" shadow="hover">
          <div class="app-header">
            <div class="app-info">
              <div class="app-title">
                <el-icon><Cpu /></el-icon>
                {{ app.name }} - AI生成应用
                <el-tag
                  :type="buildStatusType"
                  class="build-status"
                  size="default"
                >
                  {{ buildStatusText }}
                </el-tag>
              </div>
              <div class="app-meta">
                <span class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  生成时间: {{ formatDate(app.created_at) }}
                </span>
                <span class="meta-item">
                  <el-icon><Document /></el-icon>
                  Dockerfile: 已生成
                </span>
                <span class="meta-item">
                  <el-icon><Folder /></el-icon>
                  源码: 可下载
                </span>
              </div>
            </div>
            <div class="app-actions">
              <el-button
                type="primary"
                plain
                :loading="downloading"
                :disabled="app.status !== 'ready'"
                @click="downloadSource"
              >
                <el-icon><Download /></el-icon>
                下载源代码
              </el-button>
            </div>
          </div>

          <!-- 构建流程可视化 -->
          <div class="build-pipeline">
            <div
              v-for="(step, idx) in pipelineSteps"
              :key="idx"
              :class="['pipeline-step', step.status]"
            >
              <div class="step-icon">
                <el-icon><component :is="step.icon" /></el-icon>
              </div>
              <div class="step-title">{{ step.title }}</div>
              <div class="step-desc">{{ step.desc }}</div>
            </div>
          </div>

          <!-- 操作面板 -->
          <div class="action-panel">
            <div class="panel-header">
              <div class="panel-title">
                <el-icon><Monitor /></el-icon>
                构建与推送操作
              </div>
              <div class="mode-switch">
                <el-button
                  :type="currentMode === 'auto' ? 'primary' : 'default'"
                  size="small"
                  @click="switchMode('auto')"
                >
                  自动模式
                </el-button>
                <el-button
                  :type="currentMode === 'manual' ? 'primary' : 'default'"
                  size="small"
                  @click="switchMode('manual')"
                >
                  手动模式
                </el-button>
              </div>
            </div>

            <!-- 自动模式 -->
            <div v-show="currentMode === 'auto'" class="mode-content">
              <p>一键完成从构建到推送的全过程（演示模式）。请先配置您的ACR实例信息：</p>
              <div class="acr-config">
                <el-form label-width="100px">
                  <el-row :gutter="20">
                    <el-col :xs="24" :sm="12">
                      <el-form-item label="ACR地域">
                        <el-select v-model="acrConfig.region" style="width: 100%">
                          <el-option value="cn-hangzhou" label="华东1（杭州）" />
                          <el-option value="cn-shanghai" label="华东2（上海）" />
                          <el-option value="cn-beijing" label="华北2（北京）" />
                          <el-option value="cn-shenzhen" label="华南1（深圳）" />
                        </el-select>
                      </el-form-item>
                    </el-col>
                    <el-col :xs="24" :sm="12">
                      <el-form-item label="命名空间">
                        <el-input v-model="acrConfig.namespace" placeholder="myregistry" />
                      </el-form-item>
                    </el-col>
                  </el-row>
                  <el-form-item label="镜像名称">
                    <el-input v-model="acrConfig.imageName" :placeholder="app?.name || 'app-name'" />
                  </el-form-item>
                </el-form>
              </div>
              <div class="btn-group">
                <el-button
                  type="primary"
                  :loading="autoBuilding"
                  @click="startAutoBuild"
                >
                  <el-icon><Lightning /></el-icon>
                  一键构建并推送
                </el-button>
                <el-button plain @click="switchMode('manual')">
                  <el-icon><Document /></el-icon>
                  查看手动命令
                </el-button>
              </div>
            </div>

            <!-- 手动模式 -->
            <div v-show="currentMode === 'manual'" class="mode-content">
              <p>复制以下命令到本地终端执行：</p>
              <div class="terminal">
                <div class="terminal-header">
                  <span>终端 - Docker命令</span>
                  <el-button size="small" plain @click="copyAllCommands">
                    <el-icon><DocumentCopy /></el-icon>
                    复制所有命令
                  </el-button>
                </div>
                <div class="terminal-body">
                  <div class="terminal-line">
                    <span class="prompt">$</span>
                    <span class="command">{{ manualCommands[0] }}</span>
                  </div>
                  <div class="terminal-comment"># 进入AI生成的应用程序目录（先下载并解压源码）</div>
                  <div class="terminal-line">
                    <span class="prompt">$</span>
                    <span class="command">{{ manualCommands[1] }}</span>
                  </div>
                  <div class="terminal-comment"># 构建Docker镜像（步骤1）</div>
                  <div class="terminal-line">
                    <span class="prompt">$</span>
                    <span class="command">{{ manualCommands[2] }}</span>
                  </div>
                  <div class="terminal-comment"># 登录到您的ACR实例（步骤2）</div>
                  <div class="terminal-line">
                    <span class="prompt">$</span>
                    <span class="command">{{ manualCommands[3] }}</span>
                  </div>
                  <div class="terminal-comment"># 为镜像添加ACR标签（步骤3）</div>
                  <div class="terminal-line">
                    <span class="prompt">$</span>
                    <span class="command">{{ manualCommands[4] }}</span>
                  </div>
                  <div class="terminal-comment"># 推送镜像到ACR（步骤4）</div>
                  <div class="terminal-success">
                    <el-icon><CircleCheck /></el-icon>
                    推送成功后，镜像将在您的ACR仓库中可用
                  </div>
                </div>
              </div>
            </div>

            <!-- 构建日志 -->
            <div v-show="currentMode === 'auto' && buildLogEntries.length > 0" class="build-log">
              <div
                v-for="(entry, idx) in buildLogEntries"
                :key="idx"
                :class="['log-entry', `log-${entry.type}`]"
              >
                <span class="log-time">{{ entry.time }}</span>
                <span>{{ entry.message }}</span>
              </div>
            </div>
          </div>

          <!-- ACR镜像信息 -->
          <el-card v-show="showAcrInfo" class="acr-info-panel" shadow="hover">
            <template #header>
              <div class="panel-title">
                <el-icon><UploadFilled /></el-icon>
                ACR镜像信息
              </div>
            </template>
            <div class="acr-info-grid">
              <div class="acr-info-item">
                <div class="label">镜像地址</div>
                <div class="value word-break">{{ finalImageUrl }}</div>
              </div>
              <div class="acr-info-item">
                <div class="label">状态</div>
                <div class="value success">已推送</div>
              </div>
              <div class="acr-info-item">
                <div class="label">大小</div>
                <div class="value">-</div>
              </div>
              <div class="acr-info-item">
                <div class="label">最后推送</div>
                <div class="value">刚刚</div>
              </div>
            </div>
            <div class="btn-group">
              <el-button type="success" @click="goToDeploy">
                <el-icon><Promotion /></el-icon>
                立即部署此镜像
              </el-button>
              <el-button plain @click="openACRConsole">
                <el-icon><Link /></el-icon>
                在ACR控制台中查看
              </el-button>
            </div>
          </el-card>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Cpu,
  Calendar,
  Document,
  Folder,
  Download,
  Monitor,
  Lightning,
  DocumentCopy,
  CircleCheck,
  UploadFilled,
  Promotion,
  Link,
  DocumentRemove,
  Tools,
  PriceTag,
  Upload,
  Check,
} from '@element-plus/icons-vue';
import EmptyState from '@/components/EmptyState.vue';
import api from '@/api';
import { useAuthStore } from '@/stores/auth';

interface App {
  id: number;
  name: string;
  description: string;
  subdomain: string;
  status: string;
  created_at: string;
}

const route = useRoute();
const authStore = useAuthStore();
const loading = ref(false);
const app = ref<App | null>(null);
const downloading = ref(false);
const currentMode = ref<'auto' | 'manual'>('auto');
const buildStatus = ref<'default' | 'building' | 'pushed'>('default');
const autoBuilding = ref(false);
const buildLogEntries = ref<{ time: string; message: string; type: string }[]>([]);
const showAcrInfo = ref(false);

const acrConfig = ref({
  region: 'cn-shanghai',
  namespace: 'myregistry',
  imageName: '',
});

// 根据 app 和 acrConfig 计算镜像名
const effectiveImageName = computed(() => {
  const name = acrConfig.value.imageName || app.value?.name || 'app';
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'app';
});

const finalImageUrl = computed(() => {
  const { region, namespace } = acrConfig.value;
  return `registry.${region}.aliyuncs.com/${namespace}/${effectiveImageName.value}:latest`;
});

const buildStatusType = computed(() => {
  const map: Record<string, string> = {
    default: 'info',
    building: 'warning',
    pushed: 'success',
  };
  return map[buildStatus.value] || 'info';
});

const buildStatusText = computed(() => {
  const map: Record<string, string> = {
    default: '未构建',
    building: '构建中...',
    pushed: '已推送至ACR',
  };
  return map[buildStatus.value] || '未构建';
});

const pipelineSteps = computed(() => {
  const step2Status =
    buildStatus.value === 'default'
      ? 'active'
      : buildStatus.value === 'building'
        ? 'active'
        : 'completed';
  const step3Status =
    buildStatus.value === 'pushed' ? 'completed' : buildStatus.value === 'building' ? 'active' : '';
  const step4Status = step3Status;
  const step5Status = buildStatus.value === 'pushed' ? 'completed' : '';

  return [
    { title: 'AI代码生成', desc: '生成Dockerfile和应用代码', status: 'completed', icon: DocumentRemove },
    { title: '本地镜像构建', desc: '执行 docker build 命令', status: step2Status || '', icon: Tools },
    { title: '镜像标记', desc: '执行 docker tag 命令', status: step3Status, icon: PriceTag },
    { title: '推送至ACR', desc: '执行 docker push 命令', status: step4Status, icon: Upload },
    { title: '镜像就绪', desc: '可在ACR中查看和部署', status: step5Status, icon: Check },
  ];
});

const manualCommands = computed(() => {
  const { region, namespace } = acrConfig.value;
  const imageName = effectiveImageName.value;
  const appName = app.value?.name || 'app';
  const cdPath = `/path/to/ai-generated-${appName.replace(/[^a-zA-Z0-9-_]/g, '-')}`;
  const registry = `registry.${region}.aliyuncs.com`;
  return [
    `cd ${cdPath}`,
    `docker build -t ${imageName}:latest .`,
    `docker login --username=您的用户名 ${registry}`,
    `docker tag ${imageName}:latest ${registry}/${namespace}/${imageName}:latest`,
    `docker push ${registry}/${namespace}/${imageName}:latest`,
  ];
});

const loadApp = async () => {
  const id = route.params.id;
  if (!id) return;

  loading.value = true;
  try {
    let found: App | undefined;
    // 已登录时先从「我的应用」拉取，可拿到私有应用；否则再从应用广场拉取
    if (authStore.isAuthenticated) {
      const myRes = await api.get('/app-generation/my-apps');
      const myApps = (myRes.data.data || []) as App[];
      found = myApps.find((a) => String(a.id) === String(id));
    }
    if (!found) {
      const response = await api.get('/app-generation/marketplace');
      const apps = (response.data.data || []) as App[];
      found = apps.find((a) => String(a.id) === String(id));
    }
    if (found) {
      app.value = found;
      if (!acrConfig.value.imageName) {
        acrConfig.value.imageName = found.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() || 'app';
      }
    } else {
      app.value = null;
    }
  } catch {
    ElMessage.error('加载应用失败');
    app.value = null;
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
};

const downloadSource = async () => {
  if (!app.value || app.value.status !== 'ready') {
    ElMessage.warning('应用正在生成中，请稍候...');
    return;
  }

  downloading.value = true;
  try {
    ElMessage.info('正在准备源码下载...');
    const response = await api.get(`/app-generation/${app.value.id}/download-source`);
    if (response.data.success && response.data.data.download_url) {
      const downloadUrl = response.data.data.download_url;
      const filename = response.data.data.filename || `${app.value.name}-source.zip`;
      let finalUrl = downloadUrl;
      if (downloadUrl.startsWith('/')) {
        finalUrl = `${window.location.origin}${downloadUrl}`;
      }
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
    ElMessage.error('源码下载失败: ' + (error.response?.data?.message || error.message));
  } finally {
    downloading.value = false;
  }
};

const switchMode = (mode: 'auto' | 'manual') => {
  currentMode.value = mode;
};

const addLogEntry = (message: string, type: string) => {
  const time = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  buildLogEntries.value.push({ time, message, type });
};

const startAutoBuild = () => {
  buildLogEntries.value = [];
  buildStatus.value = 'building';
  autoBuilding.value = true;
  addLogEntry('开始自动构建过程...（演示模式）', 'info');

  // 步骤2: 本地构建
  setTimeout(() => {
    addLogEntry('步骤1: 正在执行 docker build...', 'info');
  }, 500);

  setTimeout(() => {
    addLogEntry(`✓ Docker镜像构建成功: ${effectiveImageName.value}:latest`, 'success');
    addLogEntry('步骤2: 正在标记镜像...', 'info');
  }, 3500);

  setTimeout(() => {
    addLogEntry(
      `✓ 镜像标记完成: registry.${acrConfig.value.region}.aliyuncs.com/${acrConfig.value.namespace}/${effectiveImageName.value}:latest`,
      'success'
    );
    addLogEntry('步骤3: 正在推送到ACR...', 'info');
  }, 4500);

  setTimeout(() => {
    addLogEntry('✓ 镜像推送成功!', 'success');
  }, 6500);

  setTimeout(() => {
    buildStatus.value = 'pushed';
    showAcrInfo.value = true;
    autoBuilding.value = false;
    addLogEntry('构建与推送流程完成', 'success');
    document.querySelector('.acr-info-panel')?.scrollIntoView({ behavior: 'smooth' });
  }, 7500);
};

const copyAllCommands = async () => {
  const text = manualCommands.value.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success('所有命令已复制到剪贴板');
  } catch {
    ElMessage.error('复制失败，请手动选择复制');
  }
};

const goToDeploy = () => {
  ElMessage.info('即将跳转到部署页面（功能开发中）');
};

const openACRConsole = () => {
  const { region } = acrConfig.value;
  const url = `https://cr.console.aliyun.com/${region}/instances`;
  window.open(url, '_blank');
};

watch(
  () => route.params.id,
  () => loadApp(),
  { immediate: false }
);

onMounted(() => {
  loadApp();
});
</script>

<style scoped>
.push-to-acr {
  min-height: 100vh;
  background: var(--neu-bg);
  padding-bottom: var(--space-2xl, 2rem);
}

.page-header {
  text-align: center;
  padding: var(--space-2xl, 2rem) var(--space-lg, 1rem);
  margin-bottom: var(--space-xl, 1.5rem);
  background: var(--neu-bg);
  border-radius: 0 0 var(--radius-xl, 12px) var(--radius-xl);
  box-shadow: var(--neu-shadow-outer-light), var(--neu-shadow-outer-dark);
}

.page-header h1 {
  margin: 0 0 var(--space-sm, 0.5rem) 0;
  font-size: 1.8rem;
  color: var(--color-text-primary, #1f2d3d);
}

.subtitle {
  margin: 0;
  color: var(--color-text-secondary, #8c8c8c);
  font-size: 1rem;
}

.page-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--space-lg, 1rem);
}

.app-card {
  border-radius: var(--radius-lg, 8px);
  border-left: 4px solid var(--color-primary-500, #1988eb);
  margin-bottom: var(--space-lg, 1rem);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: var(--space-md, 1rem);
  margin-bottom: var(--space-xl, 1.5rem);
  padding-bottom: var(--space-lg, 1rem);
  border-bottom: 1px solid var(--el-border-color);
}

.app-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.app-title .el-icon {
  font-size: 1.4rem;
}

.build-status {
  margin-left: var(--space-sm, 0.5rem);
}

.app-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-lg, 1rem);
  margin-top: var(--space-sm, 0.5rem);
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 0.25rem);
}

/* 构建管道 */
.build-pipeline {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-md, 1rem);
  margin: var(--space-xl, 1.5rem) 0;
  padding: 0 var(--space-md, 0.5rem);
  position: relative;
}

.build-pipeline::before {
  content: '';
  position: absolute;
  top: 22px;
  left: 60px;
  right: 60px;
  height: 3px;
  background: var(--el-border-color);
  z-index: 0;
}

@media (max-width: 768px) {
  .build-pipeline::before {
    display: none;
  }
}

.pipeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 120px;
  position: relative;
  z-index: 1;
}

.step-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--neu-bg);
  border: 3px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: var(--space-sm, 0.5rem);
  transition: all 0.3s;
}

.pipeline-step.active .step-icon {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
  color: white;
}

.pipeline-step.completed .step-icon {
  background: var(--color-success-500, #0bb065);
  border-color: var(--color-success-500);
  color: white;
}

.step-title {
  font-weight: 600;
  font-size: 0.95rem;
  text-align: center;
}

.step-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;
  min-height: 2.5em;
}

/* 操作面板 */
.action-panel {
  margin-top: var(--space-xl, 1.5rem);
  padding-top: var(--space-lg, 1rem);
  border-top: 1px solid var(--el-border-color);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg, 1rem);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
  font-size: 1.1rem;
  font-weight: 600;
}

.acr-config {
  margin: var(--space-lg, 1rem) 0;
  padding: var(--space-lg, 1rem);
  background: rgba(25, 136, 235, 0.05);
  border-radius: var(--radius-md, 6px);
}

.btn-group {
  display: flex;
  gap: var(--space-md, 1rem);
  margin-top: var(--space-lg, 1rem);
  flex-wrap: wrap;
}

/* 终端样式 */
.terminal {
  margin-top: var(--space-lg, 1rem);
  background: #1e1e1e;
  border-radius: var(--radius-md, 6px);
  overflow: hidden;
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md, 0.75rem) var(--space-lg, 1rem);
  background: #2d2d2d;
  color: #ccc;
  font-size: 0.9rem;
}

.terminal-body {
  padding: var(--space-lg, 1rem);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9rem;
  line-height: 1.6;
}

.terminal-line {
  margin-bottom: var(--space-sm, 0.5rem);
}

.terminal-line .prompt {
  color: #4ec9b0;
  margin-right: var(--space-sm, 0.5rem);
}

.terminal-line .command {
  color: #dcdcdc;
  word-break: break-all;
}

.terminal-comment {
  color: #6a9955;
  font-size: 0.85rem;
  margin-bottom: var(--space-md, 0.75rem);
  margin-left: 1.5em;
}

.terminal-success {
  margin-top: var(--space-lg, 1rem);
  color: #6a9955;
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.5rem);
}

/* 构建日志 */
.build-log {
  max-height: 240px;
  overflow-y: auto;
  margin-top: var(--space-lg, 1rem);
  padding: var(--space-md, 0.75rem);
  background: #f8f9fa;
  border-radius: var(--radius-md, 6px);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9rem;
}

.log-entry {
  margin-bottom: var(--space-xs, 0.25rem);
  padding: var(--space-xs, 0.25rem) 0;
}

.log-time {
  color: var(--color-text-secondary);
  margin-right: var(--space-sm, 0.5rem);
}

.log-info {
  color: var(--color-primary-500);
}

.log-success {
  color: var(--color-success-500);
}

.log-warning {
  color: var(--color-warning-500);
}

.log-error {
  color: var(--color-error);
}

/* ACR信息面板 */
.acr-info-panel {
  margin-top: var(--space-xl, 1.5rem);
  border-radius: var(--radius-lg, 8px);
}

.acr-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-lg, 1rem);
  margin-bottom: var(--space-lg, 1rem);
}

.acr-info-item .label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  margin-bottom: var(--space-xs, 0.25rem);
}

.acr-info-item .value {
  font-weight: 500;
}

.acr-info-item .value.success {
  color: var(--color-success-500);
}

.word-break {
  word-break: break-all;
}
</style>
