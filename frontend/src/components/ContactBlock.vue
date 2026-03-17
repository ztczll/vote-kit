<template>
  <section class="contact-block animate-fade-in">
    <div class="contact-block-inner">
      <h2 class="section-title contact-block-title">联系我们</h2>
      <p class="contact-desc">
        如有问题或建议，可通过以下方式联系我们；也可加入用户群交流。如需邮件联系，可发送至 fadaidemaoxiong@qq.com（请以实际客服邮箱为准）。
      </p>
      <div class="contact-actions">
        <el-button type="primary" size="large" @click="openFeedback">
          提交反馈
        </el-button>
      </div>
      <div v-if="contact.wechat_group_qr_url" class="wechat-qr-area">
        <p class="wechat-qr-label">加入用户微信群（扫码入群）</p>
        <img
          :src="contact.wechat_group_qr_url"
          alt="微信群二维码"
          class="wechat-qr-img"
        />
        <p class="wechat-qr-hint">
          更新于 {{ contact.wechat_group_qr_updated_at ? formatDate(contact.wechat_group_qr_updated_at) : '-' }}，
          微信二维码 7 日有效，若失效请刷新页面或通过提交反馈联系我们。
        </p>
      </div>
      <div v-else class="wechat-qr-placeholder">
        <span class="placeholder-text">暂未配置入群二维码，可通过「提交反馈」联系我们。</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { settingsApi } from '@/api/feedback';
import type { ContactSettings } from '@/api/feedback';

const contact = ref<ContactSettings>({
  wechat_group_qr_url: null,
  wechat_group_qr_updated_at: null,
});

const openFeedback = inject<() => void>('openFeedback', () => {});

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

onMounted(async () => {
  try {
    const { data } = await settingsApi.getContact();
    contact.value = data ?? contact.value;
  } catch {
    // 保持默认
  }
});
</script>

<style scoped>
.contact-block {
  margin-bottom: var(--space-2xl);
}

.contact-block-inner {
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-2xl);
  background: linear-gradient(180deg, #f0fdf4 0%, #f8fafc 50%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  text-align: center;
}

.contact-block-title {
  margin: 0 0 var(--space-md);
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.contact-desc {
  margin: 0 0 var(--space-lg);
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
}

.contact-actions {
  margin-bottom: var(--space-xl);
}

.wechat-qr-area {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
}

.wechat-qr-label {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.wechat-qr-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-lg);
}

.wechat-qr-hint {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  max-width: 320px;
}

.wechat-qr-placeholder {
  padding: var(--space-lg);
  background: rgba(15, 23, 42, 0.04);
  border-radius: var(--radius-lg);
}

.placeholder-text {
  font-size: 14px;
  color: #64748b;
}
</style>
