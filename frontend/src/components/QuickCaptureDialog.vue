<template>
  <el-dialog
    v-model="visible"
    title="✨ 快速捕获想法"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form :model="form">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
        简单描述你的想法，AI 将帮你生成完整的需求详情
      </el-alert>

      <el-form-item>
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="5"
          placeholder="例如：我想要一个能自动整理微信聊天图片的工具..."
          maxlength="500"
          show-word-limit
          :disabled="generating"
        />
        <div v-if="form.description.trim().length < 10" class="char-hint">
          <el-icon><InfoFilled /></el-icon>
          还需要输入 {{ 10 - form.description.trim().length }} 个字符才能开始AI生成
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false" :disabled="generating">取消</el-button>
      <el-button
        type="primary"
        @click="handleGenerate"
        :loading="generating"
        :disabled="!form.description.trim() || form.description.trim().length < 10"
      >
        <template v-if="!generating">
          <el-icon><MagicStick /></el-icon>
          AI 生成
        </template>
        <template v-else>
          生成中...
        </template>
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick, InfoFilled } from '@element-plus/icons-vue';
import { aiApiService } from '@/api/ai';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'success': [data: any];
}>();

const visible = ref(props.modelValue);
const generating = ref(false);
const form = ref({
  description: ''
});

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

async function handleGenerate() {
  if (!form.value.description.trim() || form.value.description.trim().length < 10) {
    ElMessage.warning('请输入至少10个字符的需求描述');
    return;
  }

  generating.value = true;
  try {
    const result = await aiApiService.generateRequirement(form.value.description);
    ElMessage.success('AI 生成成功！');
    emit('success', result);
    visible.value = false;
  } catch (error: any) {
    console.error('AI generation error:', error);
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      ElMessage.error('AI 生成超时，请稍后重试或简化描述');
    } else {
      ElMessage.error(error.response?.data?.message || 'AI 生成失败，请稍后重试');
    }
  } finally {
    generating.value = false;
  }
}

function handleClose() {
  form.value.description = '';
}
</script>

<style scoped>
:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding-bottom: 15px;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

.char-hint {
  margin-top: 8px;
  color: var(--el-color-info);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
