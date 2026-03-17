<template>
  <el-dialog v-model="visible" :title="existingPlan ? '编辑开发计划' : '创建开发计划'" width="600px" @close="handleClose">
    <div v-if="loading" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>加载中...</p>
    </div>

    <el-form v-else :model="form" label-width="80px">
      <el-alert v-if="existingPlan" type="warning" :closable="false" style="margin-bottom: 20px;">
        编辑开发计划将重新开启7天投票期
      </el-alert>
      <el-alert v-else type="info" :closable="false" style="margin-bottom: 20px;">
        请列出 3-5 个核心功能点，用户将对这些功能进行投票
      </el-alert>

      <!-- AI生成按钮 -->
      <div style="margin-bottom: 20px; text-align: center;">
        <el-button 
          type="primary" 
          :icon="aiGenerating ? 'Loading' : 'MagicStick'" 
          :loading="aiGenerating"
          @click="handleAIGenerate"
          :disabled="!requirementData"
        >
          🤖 AI智能生成
        </el-button>
        <p v-if="!requirementData" style="color: var(--el-color-info); font-size: 12px; margin-top: 8px;">
          正在加载需求信息...
        </p>
      </div>

      <div v-for="(feature, index) in form.features" :key="index" class="feature-item">
        <h4>功能点 {{ index + 1 }}</h4>
        <el-form-item label="标题">
          <el-input v-model="feature.title" placeholder="简短描述功能" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="feature.description"
            type="textarea"
            :rows="2"
            placeholder="详细说明功能内容"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-button v-if="form.features.length > 3" type="danger" text @click="removeFeature(index)">
          删除此功能
        </el-button>
      </div>

      <el-button v-if="form.features.length < 5" type="primary" text @click="addFeature">
        + 添加功能点
      </el-button>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ existingPlan ? '更新计划' : '创建计划' }}（开启7天投票）
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Loading } from '@element-plus/icons-vue';
import api from '@/api/client';
import { aiApiService } from '@/api/ai';

const props = defineProps<{
  modelValue: boolean;
  requirementId: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
}>();

const visible = ref(props.modelValue);
const submitting = ref(false);
const loading = ref(false);
const aiGenerating = ref(false);
const existingPlan = ref<any>(null);
const requirementData = ref<any>(null);
const form = ref({
  features: [
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' }
  ]
});

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) {
    loadExistingPlan();
    loadRequirementData();
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

async function loadExistingPlan() {
  loading.value = true;
  try {
    const response = await api.get(`/requirements/${props.requirementId}/dev-plan`);
    const planData = response.data.data?.plan;
    
    if (planData && planData.features) {
      existingPlan.value = planData;
      // 将已有功能点填充到表单
      form.value.features = planData.features.map((f: any) => ({
        title: f.title,
        description: f.description
      }));
    }
  } catch (error) {
    // 没有计划时会返回错误，这是正常的
    existingPlan.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadRequirementData() {
  try {
    const response = await api.get(`/requirements/${props.requirementId}`);
    requirementData.value = response.data.requirement;
  } catch (error) {
    console.error('Failed to load requirement data:', error);
  }
}

async function handleAIGenerate() {
  if (!requirementData.value) {
    ElMessage.warning('需求信息加载中，请稍后再试');
    return;
  }

  // 检查是否有已填写的内容
  const hasContent = form.value.features.some(f => f.title.trim() || f.description.trim());
  
  if (hasContent) {
    try {
      await ElMessageBox.confirm(
        'AI生成将覆盖当前已填写的内容，是否继续？',
        '确认生成',
        {
          confirmButtonText: '继续生成',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    } catch {
      return; // 用户取消
    }
  }

  aiGenerating.value = true;
  try {
    // 处理新旧数据格式
    const reqData = requirementData.value;
    console.log('🔍 Requirement data:', reqData);
    
    const requestData = {
      title: reqData.title,
      scene: reqData.scene || reqData.description || '用户需求场景',
      pain: reqData.pain || '待解决的痛点',
      features: reqData.features || reqData.description || '核心功能需求'
    };
    
    console.log('📤 Sending to AI:', requestData);

    const result = await aiApiService.generateDevPlan(requestData);
    
    console.log('📥 AI Response:', result);

    // 填充生成的功能点
    form.value.features = result.features.slice(0, 5).map(f => ({
      title: f.title,
      description: f.description
    }));

    // 确保至少有3个功能点
    while (form.value.features.length < 3) {
      form.value.features.push({ title: '', description: '' });
    }

    console.log('✅ Form updated with features:', form.value.features);
    ElMessage.success('AI生成完成！您可以继续编辑功能点');
  } catch (error: any) {
    console.error('AI generation failed:', error);
    ElMessage.error(error.response?.data?.message || 'AI生成失败，请稍后重试');
  } finally {
    aiGenerating.value = false;
  }
}

function addFeature() {
  if (form.value.features.length < 5) {
    form.value.features.push({ title: '', description: '' });
  }
}

function removeFeature(index: number) {
  form.value.features.splice(index, 1);
}

async function handleSubmit() {
  // 验证
  const validFeatures = form.value.features.filter(f => f.title.trim() && f.description.trim());
  
  if (validFeatures.length < 3) {
    ElMessage.warning('请至少填写3个功能点');
    return;
  }

  submitting.value = true;
  try {
    await api.post(`/requirements/${props.requirementId}/dev-plan`, {
      features: validFeatures
    });
    ElMessage.success(existingPlan.value ? '开发计划更新成功！' : '开发计划创建成功！投票已开启');
    emit('success');
    visible.value = false;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  form.value.features = [
    { title: '', description: '' },
    { title: '', description: '' },
    { title: '', description: '' }
  ];
  existingPlan.value = null;
  requirementData.value = null;
}
</script>

<style scoped>
.feature-item {
  padding: var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
}

.feature-item h4 {
  margin: 0 0 var(--space-md) 0;
  font-size: 16px;
  font-weight: 600;
}
</style>
