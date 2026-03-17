<template>
  <div class="submit-form-page">
    <div class="form-container">
      <div class="form-header">
        <div class="header-content">
          <div>
            <h1 class="form-title">填写需求详情</h1>
            <p class="form-subtitle">请尽可能详细地描述你的想法，高质量的需求更容易获得投票和开发</p>
          </div>
          <el-button type="primary" @click="showQuickCapture = true" class="quick-capture-btn">
            <el-icon><MagicStick /></el-icon>
            快速捕获想法
          </el-button>
        </div>
      </div>

      <el-form :model="form" class="detail-form" label-position="top">
        <!-- 选择应用模板 -->
        <el-form-item label="应用模板">
          <template #label>
            <span>应用模板</span>
          </template>
          <el-select
            v-model="form.app_template_id"
            placeholder="选择一种应用类型作为基础（可选）"
            size="large"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="t in appTemplates"
              :key="t.id"
              :label="`${t.name} (${t.type_key})`"
              :value="t.id"
            />
          </el-select>
          <div class="form-hint">选择后可在该类型基础上填写需求，用于 AI 生成时生成更贴合的 Spec</div>
        </el-form-item>

        <!-- 标题 -->
        <el-form-item>
          <template #label>
            <div class="label-row">
              <span>需求标题 <span class="required">*</span></span>
              <span :class="['char-count', form.title.length > 60 ? 'error' : '']">
                {{ form.title.length }}/60
              </span>
            </div>
          </template>
          <el-input
            v-model="form.title"
            placeholder="用一句话说清楚你想要什么，例如：一个能自动归类微信聊天图片的小工具"
            size="large"
            maxlength="60"
            :class="{ 'input-error': errors.title }"
          />
          <div v-if="errors.title" class="error-message">{{ errors.title }}</div>
        </el-form-item>

        <!-- 使用场景 -->
        <el-form-item>
          <template #label>
            <div class="label-row">
              <span>你在什么场景下遇到问题？ <span class="required">*</span></span>
              <span :class="['char-count', form.scene.length < 30 ? 'warning' : 'success']">
                {{ form.scene.length }}字
              </span>
            </div>
          </template>
          <el-input
            v-model="form.scene"
            type="textarea"
            :rows="4"
            placeholder="例如：每次在微信群里看到有用的图片，都不得不手动保存到手机，非常杂乱"
            :class="{ 'input-error': errors.scene }"
          />
          <div v-if="errors.scene" class="error-message">{{ errors.scene }}</div>
        </el-form-item>

        <!-- 痛点 -->
        <el-form-item>
          <template #label>
            <div class="label-row">
              <span>你希望解决什么痛点？ <span class="required">*</span></span>
              <span :class="['char-count', form.pain.length < 30 ? 'warning' : 'success']">
                {{ form.pain.length }}字
              </span>
            </div>
          </template>
          <el-input
            v-model="form.pain"
            type="textarea"
            :rows="4"
            placeholder="例如：手动整理太耗时，且不同主题的图片混在一起，找起来很麻烦"
            :class="{ 'input-error': errors.pain }"
          />
          <div v-if="errors.pain" class="error-message">{{ errors.pain }}</div>
        </el-form-item>

        <!-- 核心功能 -->
        <el-form-item>
          <template #label>
            <div class="label-row">
              <span>你希望它有哪些核心功能？ <span class="required">*</span></span>
              <span :class="['char-count', form.features.length < 20 ? 'warning' : 'success']">
                {{ form.features.length }}字
              </span>
            </div>
          </template>
          <el-input
            v-model="form.features"
            type="textarea"
            :rows="5"
            placeholder="1. 能自动保存微信聊天中的图片到相册&#10;2. 能按聊天群组或关键词自动创建文件夹分类&#10;3. ..."
            :class="{ 'input-error': errors.features }"
          />
          <div v-if="errors.features" class="error-message">{{ errors.features }}</div>
        </el-form-item>

        <!-- 分类 -->
        <el-form-item label="需求分类">
          <template #label>
            <span>需求分类 <span class="required">*</span></span>
          </template>
          <el-select
            v-model="form.category"
            placeholder="选择一个分类"
            size="large"
            style="width: 100%"
            :class="{ 'input-error': errors.category }"
          >
            <el-option label="⚡️ 效率工具" value="效率工具" />
            <el-option label="🎮 生活娱乐" value="生活娱乐" />
            <el-option label="📚 学习助手" value="学习助手" />
            <el-option label="💬 社交相关" value="社交相关" />
            <el-option label="🧩 其他" value="其他" />
          </el-select>
          <div v-if="errors.category" class="error-message">{{ errors.category }}</div>
        </el-form-item>

        <!-- 补充信息 -->
        <el-form-item label="其他补充 (可选)">
          <el-input
            v-model="form.extra"
            type="textarea"
            :rows="3"
            placeholder="任何你觉得需要补充的信息，比如参考应用、特殊要求等"
          />
        </el-form-item>

        <!-- 按维度选择提示词 -->
        <el-form-item label="提示词（用于 AI 生成的风格与约束）">
          <template #label>
            <span>提示词</span>
          </template>
          <div class="prompt-dimensions">
            <div v-for="dim in promptDimensionList" :key="dim.key" class="prompt-dimension-row">
              <span class="prompt-dimension-label">{{ dim.label }}</span>
              <el-select
                v-model="form.prompt_template_ids[dim.key]"
                :placeholder="`选择${dim.label}（可选）`"
                size="default"
                clearable
                class="prompt-select"
              >
                <el-option
                  v-for="p in (promptTemplatesByDim[dim.key] || [])"
                  :key="p.id"
                  :label="p.title"
                  :value="p.id"
                />
              </el-select>
            </div>
          </div>
          <div class="form-hint">各维度可选一条提示词，用于控制 UI 风格、技术架构、测试与部署等，不选则使用默认</div>
        </el-form-item>

        <!-- 按钮 -->
        <div class="form-actions">
          <el-button size="large" @click="$router.push('/')">取消</el-button>
          <el-button type="primary" size="large" @click="handleNext" class="next-btn">
            下一步：预览确认 →
          </el-button>
        </div>
      </el-form>
    </div>

    <!-- 离线提示 -->
    <div v-if="isOffline" class="offline-tip">
      <span>📡 网络已断开，内容已保存到本地</span>
    </div>

    <!-- 快速捕获弹窗 -->
    <QuickCaptureDialog
      v-model="showQuickCapture"
      @success="handleAIGenerated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { MagicStick } from '@element-plus/icons-vue';
import QuickCaptureDialog from '@/components/QuickCaptureDialog.vue';
import type { GeneratedRequirement } from '@/api/ai';
import { requirementApi } from '@/api/requirement';

const DIMENSION_KEYS = [
  { key: 'business_logic', label: '业务逻辑' },
  { key: 'ui_ux', label: 'UI/UX' },
  { key: 'tech_arch', label: '技术架构' },
  { key: 'data_model', label: '数据模型' },
  { key: 'test_strategy', label: '测试策略' },
  { key: 'deployment', label: '部署配置' },
  { key: 'security_compliance', label: '安全合规' },
] as const;

const router = useRouter();
const showQuickCapture = ref(false);

const form = ref({
  title: '',
  scene: '',
  pain: '',
  features: '',
  category: '',
  extra: '',
  app_template_id: null as string | null,
  prompt_template_ids: {} as Record<string, string>,
});

const appTemplates = ref<Array<{ id: string; name: string; type_key: string }>>([]);
const promptTemplatesByDim = ref<Record<string, Array<{ id: string; title: string }>>>({});
const promptDimensionList = ref(DIMENSION_KEYS);

const errors = ref<Record<string, string>>({});
const isOffline = ref(!navigator.onLine);

// 加载草稿与模板数据
onMounted(async () => {
  const draft = localStorage.getItem('votekit_draft');
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      form.value = {
        title: parsed.title ?? '',
        scene: parsed.scene ?? '',
        pain: parsed.pain ?? '',
        features: parsed.features ?? '',
        category: parsed.category ?? '',
        extra: parsed.extra ?? '',
        app_template_id: parsed.app_template_id ?? null,
        prompt_template_ids: parsed.prompt_template_ids && typeof parsed.prompt_template_ids === 'object' ? parsed.prompt_template_ids : {},
      };
    } catch (e) {
      console.error('Failed to load draft');
    }
  }
  if (!form.value.prompt_template_ids || typeof form.value.prompt_template_ids !== 'object') {
    form.value.prompt_template_ids = {};
  }

  try {
    const res = await requirementApi.getAppTemplates();
    appTemplates.value = (res.data as any)?.data ?? [];
  } catch (_) {
    appTemplates.value = [];
  }
  try {
    const res = await requirementApi.getPromptTemplates();
    const list = (res.data as any)?.data ?? [];
    const byDim: Record<string, Array<{ id: string; title: string }>> = {};
    for (const p of list) {
      if (!byDim[p.dimension]) byDim[p.dimension] = [];
      byDim[p.dimension].push({ id: p.id, title: p.title });
    }
    promptTemplatesByDim.value = byDim;
  } catch (_) {
    promptTemplatesByDim.value = {};
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

function handleOnline() {
  isOffline.value = false;
}

function handleOffline() {
  isOffline.value = true;
}

// 自动保存草稿
let saveTimer: NodeJS.Timeout;
watch(form, () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem('votekit_draft', JSON.stringify(form.value));
  }, 500);
}, { deep: true });

// 验证
function validate(): boolean {
  errors.value = {};
  
  if (!form.value.title.trim() || form.value.title.length > 60) {
    errors.value.title = '请输入1-60字符的标题';
  }
  if (form.value.scene.length < 30) {
    errors.value.scene = '请再具体描述使用场景（至少30字）';
  }
  if (form.value.pain.length < 30) {
    errors.value.pain = '请再具体描述痛点（至少30字）';
  }
  if (form.value.features.length < 20) {
    errors.value.features = '请至少列出1个核心功能（至少20字）';
  }
  if (!form.value.category) {
    errors.value.category = '请选择需求分类';
  }

  return Object.keys(errors.value).length === 0;
}

function handleAIGenerated(data: GeneratedRequirement) {
  form.value.title = data.title;
  form.value.scene = data.scene;
  form.value.pain = data.pain;
  form.value.features = data.features;
  // value 字段可以放到 extra 中
  if (data.value) {
    form.value.extra = `价值说明：${data.value}`;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleNext() {
  if (validate()) {
    router.push({ 
      path: '/submit/preview', 
      state: { formData: form.value }
    });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
</script>

<style scoped>
.submit-form-page {
  padding-bottom: var(--space-2xl);
}

.form-container {
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.form-header {
  margin-bottom: var(--space-2xl);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-lg);
}

.quick-capture-btn {
  flex-shrink: 0;
}

.form-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.form-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.detail-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.required {
  color: var(--color-error);
}

.char-count {
  font-size: 12px;
  font-weight: 500;
}

.char-count.warning {
  color: #FF8C00;
}

.char-count.success {
  color: var(--color-success);
}

.char-count.error {
  color: var(--color-error);
}

.detail-form :deep(.el-input__wrapper),
.detail-form :deep(.el-textarea__inner) {
  border-radius: var(--radius-md);
  background: var(--color-surface);
  transition: all var(--transition-fast);
}

.detail-form :deep(.el-input__wrapper:focus),
.detail-form :deep(.el-textarea__inner:focus) {
  background: white;
}

.input-error :deep(.el-input__wrapper),
.input-error :deep(.el-textarea__inner) {
  border-color: var(--color-error) !important;
}

.error-message {
  color: var(--color-error);
  font-size: 12px;
  margin-top: var(--space-xs);
  display: flex;
  align-items: center;
  gap: 4px;
}

.error-message::before {
  content: '⚠';
}

.form-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: var(--space-xs);
}

.prompt-dimensions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.prompt-dimension-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.prompt-dimension-label {
  min-width: 80px;
  font-size: 14px;
  color: var(--color-text-primary);
}

.prompt-select {
  flex: 1;
  min-width: 180px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-surface-dark);
}

.next-btn {
  background: linear-gradient(135deg, var(--color-accent-500) 0%, var(--color-accent-700) 100%);
  border: none;
}

.offline-tip {
  position: fixed;
  bottom: var(--space-lg);
  left: 50%;
  transform: translateX(-50%);
  background: #FFF3CD;
  border: 1px solid #FFE69C;
  color: #856404;
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 768px) {
  .form-container {
    padding: var(--space-xl);
  }
  
  .form-actions {
    flex-direction: column-reverse;
  }
  
  .form-actions .el-button {
    width: 100%;
  }
}
</style>
