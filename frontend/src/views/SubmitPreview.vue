<template>
  <div class="submit-preview-page">
    <div class="preview-header">
      <h1 class="preview-title">确认预览</h1>
      <p class="preview-subtitle">这是你的需求在投票广场展示的样子，确认无误后提交</p>
    </div>

    <div class="preview-card-wrapper">
      <RequirementCard
        v-if="formData"
        :title="formData.title"
        :description="fullDescription"
        :vote-count="0"
        :status="'投票中'"
        :category="formData.category"
        :can-vote="false"
      />
    </div>

    <div class="preview-actions">
      <el-button size="large" @click="handleBack">
        ← 返回修改
      </el-button>
      <el-button 
        type="primary" 
        size="large" 
        @click="handleSubmit"
        :loading="submitting"
        class="submit-btn"
      >
        {{ submitting ? '提交中...' : '✓ 提交我的需求' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { requirementApi } from '@/api/requirement';
import RequirementCard from '@/components/RequirementCard.vue';

const router = useRouter();
const formData = ref<any>(null);
const submitting = ref(false);

onMounted(() => {
  // 从 router state 或 localStorage 获取表单数据
  const state = (router.currentRoute.value as any)?.meta?.formData ?? (history.state as any)?.formData;
  if (state?.title) {
    formData.value = state;
  } else {
    const draft = localStorage.getItem('votekit_draft');
    if (draft) {
      try {
        formData.value = JSON.parse(draft);
      } catch (e) {
        ElMessage.error('无法加载表单数据');
        router.push('/submit');
      }
    } else {
      ElMessage.warning('请先填写表单');
      router.push('/submit');
    }
  }
});

const fullDescription = computed(() => {
  if (!formData.value) return '';
  
  let desc = `场景：${formData.value.scene}\n\n痛点：${formData.value.pain}\n\n功能：${formData.value.features}`;
  
  if (formData.value.extra) {
    desc += `\n\n补充：${formData.value.extra}`;
  }
  
  return desc;
});

function handleBack() {
  router.push('/submit');
}

async function handleSubmit() {
  if (!formData.value) return;
  
  submitting.value = true;
  try {
    await requirementApi.create({
      title: formData.value.title,
      description: fullDescription.value,
      category: formData.value.category,
      contact_info: formData.value.contact_info ?? '',
      scene: formData.value.scene,
      pain: formData.value.pain,
      features: formData.value.features,
      extra: formData.value.extra,
      app_template_id: formData.value.app_template_id ?? null,
      prompt_template_ids: formData.value.prompt_template_ids && typeof formData.value.prompt_template_ids === 'object' ? formData.value.prompt_template_ids : null,
    });
    
    // 清除草稿
    localStorage.removeItem('votekit_draft');
    
    router.push('/submit/done');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败，请重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.submit-preview-page {
  padding-bottom: var(--space-2xl);
}

.preview-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.preview-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.preview-subtitle {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

.preview-card-wrapper {
  max-width: 400px;
  margin: 0 auto var(--space-2xl) auto;
  transform-origin: center;
  transition: transform var(--transition-base);
}

.preview-card-wrapper:hover {
  transform: scale(1.02);
}

.preview-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  padding-top: var(--space-xl);
}

.submit-btn {
  background: linear-gradient(135deg, var(--color-accent-500) 0%, var(--color-accent-700) 100%);
  border: none;
  min-width: 180px;
}

@media (max-width: 768px) {
  .preview-card-wrapper {
    max-width: 100%;
  }
  
  .preview-actions {
    flex-direction: column-reverse;
  }
  
  .preview-actions .el-button {
    width: 100%;
  }
}
</style>
