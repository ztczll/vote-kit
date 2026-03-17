<template>
  <div class="feedback-widget">
    <el-tooltip content="意见反馈" placement="left">
      <el-button
        class="feedback-fab"
        type="primary"
        circle
        size="large"
        @click="openDialog"
      >
        <el-icon><ChatLineRound /></el-icon>
      </el-button>
    </el-tooltip>

    <el-dialog
      v-model="visible"
      width="480px"
      :close-on-click-modal="false"
      :destroy-on-close="false"
      class="feedback-dialog"
    >
      <template #header>
        <div class="feedback-dialog-header">
          <h3 class="feedback-title">意见反馈</h3>
          <p class="feedback-subtitle">
            欢迎随时告诉我们你的使用感受、问题或功能建议。
          </p>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        label-width="80px"
        size="default"
      >
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="feature">功能建议</el-radio-button>
            <el-radio-button label="usage">使用问题</el-radio-button>
            <el-radio-button label="bug">Bug 反馈</el-radio-button>
            <el-radio-button label="other">其他</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="请尽可能详细地描述你遇到的问题、使用场景或功能建议～"
          />
        </el-form-item>

        <el-form-item label="联系方式">
          <el-input
            v-model="form.contact"
            placeholder="选填：邮箱 / 微信 / 手机号，方便我们向你回复"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <span class="footer-hint">提交后，我们会尽快查看并在产品迭代中参考你的建议。</span>
          <div class="footer-actions">
            <el-button @click="visible = false" :disabled="submitting">取消</el-button>
            <el-button type="primary" :loading="submitting" @click="handleSubmit">
              提交反馈
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ChatLineRound } from '@element-plus/icons-vue';
import type { FeedbackType } from '@/api/feedback';
import { feedbackApi } from '@/api/feedback';

const visible = ref(false);
const submitting = ref(false);

const form = ref<{
  type: FeedbackType;
  content: string;
  contact: string;
}>({
  type: 'feature',
  content: '',
  contact: '',
});

function openDialog() {
  visible.value = true;
}

defineExpose({ openDialog });

async function handleSubmit() {
  if (!form.value.content.trim()) {
    ElMessage.warning('请先填写反馈内容');
    return;
  }

  submitting.value = true;
  try {
    await feedbackApi.submit({
      type: form.value.type,
      content: form.value.content.trim(),
      contact: form.value.contact.trim() || undefined,
      pageUrl: window.location.pathname + window.location.search,
    });
    ElMessage.success('感谢反馈，我们已收到你的意见');
    visible.value = false;
    form.value = {
      type: 'feature',
      content: '',
      contact: '',
    };
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '提交失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.feedback-widget {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 4000;
}

.feedback-fab {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(16px);
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 50%, #22c55e 100%);
  border: none;
}

.feedback-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.45);
}

.feedback-fab :deep(.el-icon) {
  font-size: 22px;
}

.feedback-dialog-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.feedback-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.feedback-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.footer-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .feedback-widget {
    right: 16px;
    bottom: 16px;
  }

  .feedback-fab {
    width: 46px;
    height: 46px;
    opacity: 0.9;
  }

  .feedback-dialog :deep(.el-dialog) {
    width: 92% !important;
    max-width: 92%;
  }
}
</style>

