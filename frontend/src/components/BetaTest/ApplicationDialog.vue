<template>
  <el-dialog v-model="visible" title="申请内测资格" width="500px">
    <div v-if="application">
      <el-result
        :icon="getStatusIcon(application.status)"
        :title="getStatusTitle(application.status)"
        :sub-title="getStatusDesc(application.status)"
      />
    </div>
    <el-form v-else :model="form" label-width="100px">
      <el-alert type="info" :closable="false" style="margin-bottom: 20px;">
        名额有限，优先通过前20名申请者
      </el-alert>

      <el-form-item label="邮箱" required>
        <el-input v-model="form.email" placeholder="用于接收内测通知" />
      </el-form-item>

      <el-form-item label="设备类型" required>
        <el-input v-model="form.deviceType" placeholder="如: iPhone 14 / Windows 11" />
      </el-form-item>

      <el-form-item label="可参与时长" required>
        <el-input v-model="form.availableHours" placeholder="如: 每周5小时" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button v-if="!application" @click="visible = false">取消</el-button>
      <el-button v-if="!application" type="primary" @click="handleSubmit" :loading="submitting">
        提交申请
      </el-button>
      <el-button v-else @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';

const props = defineProps<{
  modelValue: boolean;
  requirementId: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const authStore = useAuthStore();
const visible = ref(props.modelValue);
const submitting = ref(false);
const application = ref<any>(null);
const form = ref({
  email: authStore.user?.email || '',
  deviceType: '',
  availableHours: ''
});

watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) {
    checkApplication();
  }
});

watch(visible, (val) => {
  emit('update:modelValue', val);
});

async function checkApplication() {
  try {
    const { data } = await api.get(`/requirements/${props.requirementId}/beta-test/my-application`);
    application.value = data.data.application;
  } catch (error) {
    application.value = null;
  }
}

async function handleSubmit() {
  if (!form.value.email || !form.value.deviceType || !form.value.availableHours) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  submitting.value = true;
  try {
    await api.post(`/requirements/${props.requirementId}/beta-test/apply`, form.value);
    ElMessage.success('申请已提交！我们将在3个工作日内邮件通知您');
    checkApplication();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '申请失败');
  } finally {
    submitting.value = false;
  }
}

function getStatusIcon(status: string) {
  const map: Record<string, string> = {
    pending: 'info',
    approved: 'success',
    rejected: 'error'
  };
  return map[status] || 'info';
}

function getStatusTitle(status: string) {
  const map: Record<string, string> = {
    pending: '申请已提交',
    approved: '申请已通过',
    rejected: '申请未通过'
  };
  return map[status] || status;
}

function getStatusDesc(status: string) {
  const map: Record<string, string> = {
    pending: '我们将在3个工作日内邮件通知您',
    approved: '请查收邮件获取内测链接',
    rejected: '很抱歉，本次内测名额已满'
  };
  return map[status] || '';
}
</script>
