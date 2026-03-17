<template>
  <div class="prototype-preview-page">
    <header class="page-header">
      <h1>Vote-Kit AI 应用生成流程</h1>
      <p class="subtitle">从需求到原型的可视化验证，再到最终代码生成</p>
    </header>

    <!-- 步骤指示器 -->
    <div class="step-indicator">
      <div class="step completed">
        <div class="step-circle">1</div>
        <div class="step-label">提交需求</div>
      </div>
      <div class="step active">
        <div class="step-circle">2</div>
        <div class="step-label">原型预览与确认</div>
      </div>
      <div class="step">
        <div class="step-circle">3</div>
        <div class="step-label">生成代码</div>
      </div>
    </div>

    <div class="main-content">
      <!-- 原型预览区域 -->
      <div class="preview-area">
        <div class="panel-header">
          <h2>AI 生成原型预览</h2>
          <p>基于您的需求描述，designfast 已生成交互式原型。请仔细检查，确认满意后可继续生成完整代码。</p>
        </div>

        <div class="prototype-container">
          <!-- 加载状态 -->
          <div v-if="state === 'loading'" class="loading-placeholder">
            <el-icon class="spinner" :size="48"><Loading /></el-icon>
            <p>正在调用 designfast 生成交互原型，请稍候...</p>
            <p class="version-info">这通常需要 10-20 秒</p>
          </div>

          <!-- 原型展示 -->
          <div v-else-if="state === 'success'" class="prototype-state">
            <!-- 版本切换 -->
            <div v-if="availableVersions.length > 1" class="version-selector">
              <el-radio-group v-model="selectedVersion" @change="switchVersion">
                <el-radio-button v-for="v in availableVersions" :key="v.version" :label="v.version">
                  v{{ v.version }}
                </el-radio-button>
              </el-radio-group>
            </div>
            
            <iframe
              v-if="iframeSrc || iframeSrcdoc"
              :src="prototypeUrl || (prototypeHtml ? 'about:blank' : undefined)"
              :srcdoc="prototypeHtml || undefined"
              class="prototype-frame"
              title="原型预览"
            />
            <p class="version-info">原型版本: v{{ selectedVersion }} | 基于需求: {{ requirementTitle }}</p>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="state === 'error'" class="error-placeholder">
            <el-icon :size="48" color="var(--color-warning-500)"><WarningFilled /></el-icon>
            <h3>原型生成失败</h3>
            <p>{{ errorMessage || 'AI 生成过程中遇到了问题，请尝试调整需求描述后重新生成。' }}</p>
            <el-button type="default" @click="retryGenerate">重试生成</el-button>
          </div>
        </div>
      </div>

      <!-- 操作面板 -->
      <aside class="action-panel">
        <el-tag v-if="state === 'success'" type="success" class="status-badge">原型已生成</el-tag>
        <h3>下一步操作</h3>

        <div v-if="state === 'success'" class="publish-option">
          <el-checkbox v-model="publishToSquare">
            公开到应用广场
          </el-checkbox>
          <p class="publish-hint">勾选后，应用将在应用广场展示，他人可查看与使用；不勾选则仅在自己的「我的应用」中可见。</p>
        </div>
        <el-button
          v-if="canConfirm"
          type="primary"
          class="confirm-btn"
          :loading="confirming"
          :disabled="state !== 'success'"
          @click="confirmPrototype"
        >
          {{ confirming ? '处理中...' : '确认并生成完整代码' }}
        </el-button>
        <p v-if="state === 'success'" class="panel-hint">
          确认后，系统将基于此原型调用 Forge 引擎生成可部署的应用代码。
        </p>

        <div class="iteration-section">
          <h3>不满意？调整后重新生成</h3>
          <el-input
            v-model="feedback"
            type="textarea"
            :rows="4"
            placeholder="输入您的调整意见，例如：&#10;1. 将侧边栏移到右侧&#10;2. 主色调改为蓝色&#10;3. 增加一个用户头像区域"
          />
          <el-button
            type="default"
            class="regenerate-btn"
            :loading="regenerating"
            @click="regeneratePrototype"
          >
            重新生成原型
          </el-button>
          <p class="iteration-hint">系统将结合原始需求和您的意见，通过 designfast 生成新的原型版本。</p>
        </div>

        <div class="nav-links">
          <router-link :to="`/requirement/${requirementId}`" class="nav-link">← 返回修改需求</router-link>
        </div>

        <el-alert v-if="confirmSuccess" type="success" :closable="false" show-icon class="success-message">
          原型已确认！正在跳转到应用广场...
        </el-alert>
        <el-alert v-if="regenerateSuccess" type="success" :closable="false" show-icon class="success-message">
          新版本原型已生成，请查看左侧预览区域。
        </el-alert>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Loading, WarningFilled } from '@element-plus/icons-vue';
import api from '@/api';
import { aiApi } from '@/api/client';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const requirementId = computed(() => route.params.id as string || '');

const state = ref<'loading' | 'success' | 'error'>('loading');
const prototypeHtml = ref<string>('');
const prototypeUrl = ref<string>('');
const selectedVersion = ref(1);
const availableVersions = ref<Array<{ version: number; file: string; createdAt: string }>>([]);
const requirementTitle = ref('');
const requirementData = ref<{ features?: string; scene?: string; pain?: string } | null>(null);
const publishToSquare = ref(false);
const errorMessage = ref('');
const feedback = ref('');
const confirming = ref(false);
const regenerating = ref(false);
const confirmSuccess = ref(false);
const regenerateSuccess = ref(false);

const canConfirm = computed(() => authStore.isAuthenticated);

const iframeSrc = computed(() => !!prototypeUrl.value || !!prototypeHtml.value);
const iframeSrcdoc = computed(() => prototypeHtml.value || undefined);

async function loadRequirement() {
  if (!requirementId.value) return;
  try {
    const { data } = await api.get(`/requirements/${requirementId.value}`);
    requirementTitle.value = data.requirement?.title || '需求';
    requirementData.value = data.requirement || null;
  } catch {
    requirementTitle.value = '需求';
  }
}

async function loadCachedVersions() {
  if (!requirementId.value) return false;
  try {
    const { data } = await api.get(`/prototype/artifacts/${requirementId.value}/versions`);
    if (data.success && data.data.versions && data.data.versions.length > 0) {
      availableVersions.value = data.data.versions;
      selectedVersion.value = availableVersions.value[0].version;
      return true;
    }
  } catch {
    // No cached versions
  }
  return false;
}

async function loadPrototypeVersion(version: number) {
  try {
    const { data } = await api.get(`/prototype/artifacts/${requirementId.value}?version=${version}`, {
      responseType: 'text'
    });
    prototypeHtml.value = data;
    prototypeUrl.value = '';
    state.value = 'success';
  } catch (err: any) {
    state.value = 'error';
    errorMessage.value = '加载原型失败';
    ElMessage.error(errorMessage.value);
  }
}

function switchVersion(version: number) {
  state.value = 'loading';
  loadPrototypeVersion(version);
}

async function generatePrototype(feedbackText?: string) {
  state.value = 'loading';
  errorMessage.value = '';
  try {
    const endpoint = feedbackText != null && feedbackText.trim() ? '/prototype/regenerate' : '/prototype/generate';
    const body = feedbackText != null && feedbackText.trim()
      ? { requirementId: requirementId.value, feedback: feedbackText }
      : { requirementId: requirementId.value };
    
    // 启动异步任务
    const { data } = await aiApi.post(endpoint, body);
    if (!data.success || !data.taskId) throw new Error(data.message || '任务创建失败');
    
    // 轮询任务状态
    const taskId = data.taskId;
    const pollInterval = setInterval(async () => {
      try {
        const { data: statusData } = await api.get(`/prototype/status/${taskId}`);
        
        if (statusData.status === 'success') {
          clearInterval(pollInterval);
          const d = statusData.data;
          if (d.url) {
            prototypeUrl.value = d.url;
            prototypeHtml.value = '';
          } else if (d.html) {
            prototypeHtml.value = d.html;
            prototypeUrl.value = '';
          } else {
            throw new Error('未返回原型内容');
          }
          state.value = 'success';
        } else if (statusData.status === 'error') {
          clearInterval(pollInterval);
          throw new Error(statusData.error || '生成失败');
        }
      } catch (err: any) {
        clearInterval(pollInterval);
        state.value = 'error';
        errorMessage.value = err.response?.data?.message || err.message || '原型生成失败';
        ElMessage.error(errorMessage.value);
      }
    }, 2000); // 每2秒轮询一次
    
    // 5分钟后超时
    setTimeout(() => {
      clearInterval(pollInterval);
      if (state.value === 'loading') {
        state.value = 'error';
        errorMessage.value = '生成超时，请重试';
        ElMessage.error(errorMessage.value);
      }
    }, 300000);
    
  } catch (err: any) {
    state.value = 'error';
    const code = err.response?.data?.code;
    if (code === 'QUOTA_EXCEEDED') {
      errorMessage.value = '信用点不足，请升级套餐或购买加油包。';
    } else {
      errorMessage.value = err.response?.data?.message || err.message || '原型生成失败';
    }
    ElMessage.error(errorMessage.value);
  }
}

function buildDevPlan() {
  const r = requirementData.value;
  if (!r) return '';
  const parts = [r.features || ''];
  if (r.scene) parts.push(`场景: ${r.scene}`);
  if (r.pain) parts.push(`痛点: ${r.pain}`);
  return parts.filter(Boolean).join('\n\n');
}

async function confirmPrototype() {
  if (!requirementId.value || !canConfirm.value) return;
  confirming.value = true;
  confirmSuccess.value = false;
  try {
    const devPlan = buildDevPlan();
    const { data } = await api.post('/app-generation/generate', {
      requirementId: requirementId.value,
      devPlan: devPlan || requirementTitle.value,
      publishToSquare: publishToSquare.value,
    });
    if (!data.success) throw new Error(data.message);
    confirmSuccess.value = true;
    ElMessage.success('应用生成任务已提交！');
    setTimeout(() => {
      router.push('/app-store');
    }, 1500);
  } catch (err: any) {
    const code = err.response?.data?.code;
    const msg = err.response?.data?.message || err.message || '提交失败';
    if (code === 'QUOTA_EXCEEDED') {
      ElMessage.error('信用点不足，请升级套餐或购买加油包。');
    } else {
      ElMessage.error(msg);
    }
  } finally {
    confirming.value = false;
  }
}

async function regeneratePrototype() {
  regenerating.value = true;
  regenerateSuccess.value = false;
  const feedbackText = feedback.value.trim();
  await generatePrototype(feedbackText);
  regenerating.value = false;
  if (state.value === 'success') {
    await loadCachedVersions();
    regenerateSuccess.value = true;
    feedback.value = '';
    setTimeout(() => { regenerateSuccess.value = false; }, 3000);
  }
}

function retryGenerate() {
  generatePrototype();
}

onMounted(async () => {
  await loadRequirement();
  const hasCached = await loadCachedVersions();
  if (hasCached) {
    await loadPrototypeVersion(selectedVersion.value);
  } else {
    await generatePrototype();
  }
});

watch(requirementId, async () => {
  if (requirementId.value) {
    await loadRequirement();
    const hasCached = await loadCachedVersions();
    if (hasCached) {
      await loadPrototypeVersion(selectedVersion.value);
    } else {
      await generatePrototype();
    }
  }
});
</script>

<style scoped>
.prototype-preview-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background: var(--color-gray-50, #f5f7fa);
  min-height: 100vh;
}

.page-header {
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--color-gray-200, #eaeaea);
}

.page-header h1 {
  color: var(--color-gray-900, #2c3e50);
  margin-bottom: 10px;
}

.subtitle {
  color: var(--color-gray-600, #7f8c8d);
  font-size: 1.1em;
}

.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  position: relative;
}

.step-indicator::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 10%;
  width: 80%;
  height: 2px;
  background: var(--color-gray-200, #e0e0e0);
  z-index: 0;
}

.step {
  text-align: center;
  position: relative;
  z-index: 1;
  flex: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin: 0 auto 10px;
  background: var(--color-gray-200, #ecf0f1);
  color: var(--color-gray-500, #95a5a6);
  border: 3px solid var(--color-gray-200, #ecf0f1);
}

.step.active .step-circle {
  background: var(--color-primary-500, #3498db);
  color: white;
  border-color: var(--color-primary-500, #3498db);
}

.step.completed .step-circle {
  background: var(--color-success-500, #2ecc71);
  color: white;
  border-color: var(--color-success-500, #2ecc71);
}

.step-label {
  font-size: 0.9em;
  color: var(--color-gray-600, #7f8c8d);
}

.step.active .step-label {
  color: var(--color-primary-600, #2980b9);
  font-weight: 600;
}

.main-content {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.preview-area {
  flex: 1;
  min-width: 300px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--color-gray-200, #eee);
  background: var(--color-gray-50, #f8fafc);
}

.panel-header h2 {
  color: var(--color-gray-900, #2c3e50);
  margin-bottom: 5px;
}

.panel-header p {
  color: var(--color-gray-600, #7f8c8d);
  font-size: 0.95em;
}

.prototype-container {
  flex: 1;
  padding: 20px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-placeholder,
.error-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-gray-600, #7f8c8d);
}

.loading-placeholder .spinner {
  display: block;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-placeholder h3 {
  margin: 15px 0 10px;
  color: var(--color-gray-900, #2c3e50);
}

.prototype-state {
  width: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.version-selector {
  margin-bottom: 15px;
  text-align: center;
}

.prototype-frame {
  width: 100%;
  flex: 1;
  min-height: 400px;
  border: none;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.version-info {
  font-size: 0.85em;
  color: var(--color-gray-500, #95a5a6);
  margin-top: 12px;
  text-align: center;
}

.action-panel {
  width: 320px;
  flex-shrink: 0;
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  align-self: flex-start;
}

.status-badge {
  margin-bottom: 20px;
}

.action-panel h3 {
  font-size: 1em;
  margin-bottom: 15px;
  color: var(--color-gray-900, #2c3e50);
}

.confirm-btn,
.regenerate-btn {
  width: 100%;
  margin-bottom: 15px;
}

.publish-option {
  margin-bottom: 12px;
}
.publish-option .publish-hint {
  font-size: 0.8em;
  color: var(--color-gray-600, #7f8c8d);
  margin: 6px 0 0 22px;
}
.panel-hint,
.iteration-hint {
  font-size: 0.85em;
  color: var(--color-gray-600, #7f8c8d);
  margin-bottom: 20px;
}

.iteration-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-gray-200, #eee);
}

.iteration-section :deep(.el-textarea) {
  margin-bottom: 12px;
}

.nav-links {
  text-align: center;
  margin-top: 20px;
}

.nav-link {
  color: var(--color-primary-500, #3498db);
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.success-message {
  margin-top: 20px;
}
</style>
