<template>
  <el-dialog v-model="visible" title="发布开发日志" width="600px" @close="handleClose">
    <el-form :model="form" label-width="80px">
      <el-form-item label="标题" required>
        <el-input v-model="form.title" placeholder="简短描述本次更新" maxlength="100" show-word-limit />
      </el-form-item>

      <el-form-item label="类型" required>
        <el-select v-model="form.logType" placeholder="选择日志类型">
          <el-option label="⚙️ 功能实现" value="feature" />
          <el-option label="🎨 界面设计" value="design" />
          <el-option label="🐛 问题修复" value="bugfix" />
          <el-option label="🎯 里程碑" value="milestone" />
        </el-select>
      </el-form-item>

      <el-form-item label="内容" required>
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="8"
          placeholder="详细描述本次更新的内容..."
          maxlength="2000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        发布
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import api from '@/api/client';

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
const form = ref({
  title: '',
  content: '',
  logType: 'feature'
});

watch(() => props.modelValue, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

async function handleSubmit() {
  if (!form.value.title.trim()) {
    ElMessage.warning('请输入标题');
    return;
  }

  if (!form.value.content.trim()) {
    ElMessage.warning('请输入内容');
    return;
  }

  submitting.value = true;
  try {
    await api.post(`/requirements/${props.requirementId}/dev-logs`, {
      title: form.value.title,
      content: form.value.content,
      logType: form.value.logType
    });
    ElMessage.success('日志发布成功！');
    emit('success');
    visible.value = false;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发布失败');
  } finally {
    submitting.value = false;
  }
}

function handleClose() {
  form.value = {
    title: '',
    content: '',
    logType: 'feature'
  };
}
</script>
