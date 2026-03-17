<template>
  <div class="submit-page">
    <div class="submit-container animate-fade-in">
      <div class="page-header">
        <h1 class="page-title">💡 提交新需求</h1>
        <p class="page-subtitle">分享你的创意，让社区投票决定是否开发</p>
      </div>

      <el-form :model="form" @submit.prevent="handleSubmit" class="submit-form" label-position="top">
        <el-form-item label="需求标题" required>
          <el-input 
            v-model="form.title" 
            placeholder="用一句话描述你的需求" 
            size="large"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="详细描述" required>
          <el-input 
            v-model="form.description" 
            type="textarea" 
            :rows="8" 
            placeholder="详细说明你的需求，包括使用场景、预期功能等"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="需求分类" required>
          <el-select v-model="form.category" placeholder="选择最合适的分类" size="large" style="width: 100%">
            <el-option label="🛠️ 工具" value="工具" />
            <el-option label="🎮 娱乐" value="娱乐" />
            <el-option label="📚 教育" value="教育" />
            <el-option label="💬 社交" value="社交" />
            <el-option label="📦 其他" value="其他" />
          </el-select>
        </el-form-item>

        <el-form-item label="联系方式">
          <el-input 
            v-model="form.contact_info" 
            placeholder="邮箱或其他联系方式（可选）" 
            size="large"
          />
        </el-form-item>

        <div class="form-actions">
          <el-button 
            type="primary" 
            native-type="submit" 
            size="large"
            :loading="loading"
            class="submit-btn"
          >
            提交需求
          </el-button>
          <el-button size="large" @click="$router.push('/')">
            取消
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { requirementApi } from '@/api/requirement';

const router = useRouter();
const form = ref({
  title: '',
  description: '',
  category: '',
  contact_info: '',
});
const loading = ref(false);

async function handleSubmit() {
  if (!form.value.title || !form.value.description || !form.value.category) {
    ElMessage.warning('请填写所有必填项');
    return;
  }

  loading.value = true;
  try {
    await requirementApi.create(form.value);
    ElMessage.success('提交成功！🎉 等待审核中');
    router.push('/');
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '提交失败');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.submit-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.submit-container {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--glass-border);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-2xl);
  padding-bottom: var(--space-xl);
  border-bottom: 2px solid var(--color-surface-dark);
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-sm) 0;
}

.page-subtitle {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin: 0;
}

.submit-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.submit-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: 15px;
}

.submit-form :deep(.el-input__wrapper),
.submit-form :deep(.el-textarea__inner) {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.submit-form :deep(.el-input__wrapper:hover),
.submit-form :deep(.el-textarea__inner:hover) {
  box-shadow: var(--shadow-md);
}

.form-actions {
  display: flex;
  gap: var(--space-md);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-surface-dark);
}

.submit-btn {
  flex: 1;
  height: 48px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 16px;
  background: linear-gradient(135deg, var(--color-accent-500) 0%, var(--color-accent-700) 100%);
  border: none;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-fast);
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.submit-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .submit-container {
    padding: var(--space-xl);
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>
