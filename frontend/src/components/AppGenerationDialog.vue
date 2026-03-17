<template>
  <el-dialog
    v-model="visible"
    title="🤖 AI生成应用"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="generation-dialog">
      <el-alert
        title="AI将基于需求信息自动生成一个可运行的Web应用"
        type="info"
        :closable="false"
        show-icon
      />
      
      <div class="requirement-info">
        <h4>需求信息</h4>
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="标题">{{ requirement?.title }}</el-descriptions-item>
          <el-descriptions-item label="描述">
            <div class="requirement-description">{{ requirement?.description }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="publish-option" v-if="!isGenerating && !generationResult">
        <el-checkbox v-model="publishToSquare">公开到应用广场</el-checkbox>
        <p class="publish-hint">勾选后，应用将在应用广场展示，他人可查看与使用；不勾选则仅在自己的「我的应用」中可见。</p>
      </div>

      <div class="generation-status" v-if="isGenerating">
        <el-steps :active="currentStep" align-center>
          <el-step title="生成代码" :icon="currentStep > 0 ? 'Check' : 'Loading'" />
          <el-step title="构建应用" :icon="currentStep > 1 ? 'Check' : 'Loading'" />
          <el-step title="部署上线" :icon="currentStep > 2 ? 'Check' : 'Loading'" />
        </el-steps>
        
        <div class="status-text">
          <el-text size="large">{{ statusText }}</el-text>
          <div class="progress-dots">
            <span>.</span><span>.</span><span>.</span>
          </div>
        </div>
      </div>

      <div class="generation-result" v-if="generationResult">
        <el-result
          :icon="generationResult.success ? 'success' : 'error'"
          :title="generationResult.success ? '应用生成成功！' : '生成失败'"
          :sub-title="generationResult.message"
        >
          <template #extra v-if="generationResult.success">
            <el-button type="primary" @click="openGeneratedApp">
              打开应用
            </el-button>
            <el-button @click="goToAppStore">
              查看应用广场
            </el-button>
          </template>
          <template #extra v-else>
            <el-button type="primary" @click="retryGeneration">
              重试
            </el-button>
          </template>
        </el-result>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" :disabled="isGenerating">
          {{ isGenerating ? '生成中...' : '取消' }}
        </el-button>
        <el-button 
          type="primary" 
          @click="startGeneration"
          :loading="isGenerating"
          :disabled="isGenerating || generationResult?.success"
        >
          {{ isGenerating ? '生成中...' : '开始生成' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import api from '@/api';

interface Requirement {
  id: number;
  title: string;
  scene: string;
  pain: string;
  features: string;
}

interface GenerationResult {
  success: boolean;
  message: string;
  appId?: number;
  subdomain?: string;
}

const props = defineProps<{
  modelValue: boolean;
  requirement: Requirement | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'generated': [appId: number];
}>();

const router = useRouter();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const isGenerating = ref(false);
const currentStep = ref(0);
const generationResult = ref<GenerationResult | null>(null);
const generatedAppId = ref<number | null>(null);
const publishToSquare = ref(false);

const statusText = computed(() => {
  const texts = [
    'AI正在分析需求并生成代码',
    '正在构建Docker镜像',
    '正在部署应用到服务器'
  ];
  return texts[currentStep.value] || '准备中';
});

const startGeneration = async () => {
  if (!props.requirement) {
    ElMessage.error('需求信息不完整');
    return;
  }

  isGenerating.value = true;
  currentStep.value = 0;
  generationResult.value = null;

  try {
    const devPlan = `${props.requirement.features}\n\n场景: ${props.requirement.scene}\n痛点: ${props.requirement.pain}`;
    
    // Submit generation task - returns immediately
    const generateResponse = await api.post('/app-generation/generate', {
      requirementId: props.requirement.id,
      devPlan,
      publishToSquare: publishToSquare.value
    });

    if (!generateResponse.data.success) {
      throw new Error(generateResponse.data.message);
    }

    const { appId, subdomain, status } = generateResponse.data.data;
    generatedAppId.value = appId;

    // Immediately return and show success message
    generationResult.value = {
      success: true,
      message: '应用生成任务已提交，正在后台处理中。您可以在应用广场查看进度。',
      appId,
      subdomain
    };

    emit('generated', appId);
    ElMessage.success('应用生成任务已提交！');
    
    // Close dialog after a short delay
    setTimeout(() => {
      visible.value = false;
      // Navigate to app store
      router.push('/app-store');
    }, 2000);

  } catch (error: any) {
    console.error('Generation failed:', error);
    generationResult.value = {
      success: false,
      message: error.message || '提交生成任务失败'
    };
    ElMessage.error('应用生成任务提交失败');
  } finally {
    isGenerating.value = false;
  }
};

const waitForStatus = async (appId: number, targetStatus: string, maxAttempts = 150): Promise<void> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await api.get(`/app-generation/${appId}/status`);
      const status = response.data.data.status;
      
      console.log(`[${i+1}/${maxAttempts}] App ${appId} status: ${status}`);
      
      if (status === targetStatus) {
        return;
      }
      
      if (status === 'error') {
        throw new Error('应用生成或部署失败');
      }
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[${i+1}/${maxAttempts}] Status check error:`, error);
      if (i === maxAttempts - 1) {
        throw error;
      }
      // Wait before retry on error
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('等待超时，请稍后查看应用状态');
};

const retryGeneration = () => {
  generationResult.value = null;
  currentStep.value = 0;
  startGeneration();
};

const openGeneratedApp = () => {
  if (generationResult.value?.subdomain) {
    // 与 Jenkins 部署域名一致，走 Caddy 公网访问，无需开放端口
    const url = generationResult.value.access_url || `http://${generationResult.value.subdomain}.apps.qietugf.top`;
    window.open(url, '_blank');
  }
};

const goToAppStore = () => {
  visible.value = false;
  router.push('/app-store');
};

const handleClose = () => {
  if (!isGenerating.value) {
    visible.value = false;
    // Reset state when closing
    setTimeout(() => {
      generationResult.value = null;
      currentStep.value = 0;
      generatedAppId.value = null;
    }, 300);
  }
};

// Reset state when dialog opens
watch(visible, (newValue) => {
  if (newValue) {
    generationResult.value = null;
    currentStep.value = 0;
    generatedAppId.value = null;
  }
});
</script>

<style scoped>
.generation-dialog {
  padding: var(--space-lg) 0;
  background: var(--neu-bg);
}

.publish-option {
  margin: var(--space-md) 0;
}
.publish-option .publish-hint {
  font-size: 0.85em;
  color: var(--color-gray-600, #666);
  margin: 6px 0 0 22px;
}

.requirement-info {
  margin: var(--space-lg) 0;
  background: var(--neu-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-shadow-soft);
  padding: var(--space-lg);
}

.requirement-info h4 {
  margin-bottom: var(--space-md);
  background: linear-gradient(135deg, var(--neu-accent-blue) 0%, var(--neu-accent-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 600;
  font-size: 1.1em;
}

.generation-status {
  margin: var(--space-xl) 0;
  text-align: center;
  background: var(--neu-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-shadow-soft);
  padding: var(--space-lg);
}

.status-text {
  margin-top: var(--space-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
}

.progress-dots {
  display: inline-flex;
  gap: 4px;
}

.progress-dots span {
  animation: dot-pulse 1.5s infinite;
  font-size: 1.2em;
  background: linear-gradient(135deg, var(--neu-accent-blue) 0%, var(--neu-accent-orange) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bold;
}

.progress-dots span:nth-child(2) {
  animation-delay: 0.5s;
}

.progress-dots span:nth-child(3) {
  animation-delay: 1s;
}

@keyframes dot-pulse {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.generation-result {
  margin: var(--space-lg) 0;
  background: var(--neu-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--neu-shadow-soft);
  padding: var(--space-lg);
}

.requirement-description {
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  padding: var(--space-md);
  background: var(--neu-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--neu-shadow-inner-light),
              var(--neu-shadow-inner-dark);
  color: var(--color-text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
}

:deep(.el-steps) {
  margin-bottom: var(--space-lg);
  background: var(--neu-bg);
}

:deep(.el-step__title) {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 500;
}

:deep(.el-step__head.is-process) {
  color: var(--neu-accent-blue);
}

:deep(.el-step__head.is-finish) {
  color: var(--color-success);
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

:deep(.el-alert) {
  background: var(--neu-bg);
  border-radius: var(--radius-md);
  box-shadow: var(--neu-shadow-soft);
  border: none;
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
</style>
