<template>
  <div class="requirement-detail">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!requirement" class="error">需求不存在</div>
    <div v-else class="detail-container">
      <div class="detail-header">
        <BaseButton variant="ghost" @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </BaseButton>
      </div>

      <div class="detail-content">
        <div class="requirement-info">
          <div class="title-row">
            <h1 class="title">{{ requirement.title }}</h1>
            <el-tag :type="getStatusType(requirement.status)" size="large">
              {{ requirement.status }}
            </el-tag>
          </div>

          <div class="meta-row">
            <span class="meta-item">
              <el-icon><User /></el-icon>
              提交者: {{ requirement.submitter?.username || '匿名' }}
            </span>
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(requirement.created_at) }}
            </span>
            <span class="meta-item">
              <el-icon><FolderOpened /></el-icon>
              {{ requirement.category }}
            </span>
          </div>

          <!-- 原型预览区域 -->
          <div class="section prototype-preview-section">
            <h3>🎨 原型预览</h3>
            <div v-if="prototypeHtml" class="prototype-iframe-wrap">
              <iframe
                :srcdoc="prototypeHtml"
                class="prototype-iframe"
                title="AI 生成原型预览"
              />
            </div>
            <div v-else-if="prototypeLoading" class="prototype-placeholder">
              <p>正在加载原型...</p>
            </div>
            <div v-else class="prototype-placeholder">
              <p>原型生成中或暂未生成</p>
              <p class="prototype-hint">点击下方「AI生成应用」可预览、修改原型并生成完整代码</p>
            </div>
          </div>

          <div class="description">
            <h3>需求描述</h3>
            <p>{{ requirement.description }}</p>
          </div>

          <!-- AI生成应用按钮 -->
          <div v-if="authStore.isAuthenticated && canGenerateApp" class="ai-generation-section">
            <el-card class="ai-card">
              <div class="ai-content">
                <div class="ai-info">
                  <h3>🤖 AI自动生成应用</h3>
                  <p>基于此需求，AI可以自动生成一个可运行的Web应用</p>
                </div>
                <BaseButton variant="primary" size="large" @click="goToPrototype">
                  AI生成应用
                </BaseButton>
              </div>
            </el-card>
          </div>

          <div v-if="requirement.scene" class="section">
            <h3>使用场景</h3>
            <p>{{ requirement.scene }}</p>
          </div>

          <div v-if="requirement.pain" class="section">
            <h3>痛点问题</h3>
            <p>{{ requirement.pain }}</p>
          </div>

          <div v-if="requirement.features" class="section">
            <h3>期望功能</h3>
            <p>{{ requirement.features }}</p>
          </div>

          <!-- Spec 预览：与「AI 生成应用」时发给 AI 的完整 prompt 一致 -->
          <div class="section spec-preview-section">
            <h3>📄 Spec 预览（发给 AI 的完整提示）</h3>
            <p class="spec-explanation">
              Spec 在您点击「AI 生成应用」时，由<strong>当前需求 + 所选应用模板 + 所选提示词</strong>在服务端组合后发给 Forge 引擎。此处展示与届时一致的内容（不含当次填写的开发计划）。
            </p>
            <div v-if="specLoading" class="spec-loading">加载中...</div>
            <div v-else-if="specPreview" class="spec-content-wrapper">
              <pre class="spec-content">{{ specPreview }}</pre>
              <BaseButton variant="ghost" size="small" @click="copySpec" class="copy-spec-btn">复制全文</BaseButton>
            </div>
            <div v-else class="spec-empty">
              <p>该需求未选择应用模板或提示词。</p>
              <p>发起「AI 生成应用」时，将使用需求标题与描述生成简要 prompt。</p>
              <p class="spec-hint">在提交需求时选择「应用模板」和各维度「提示词」，即可在此看到组合后的 Spec。</p>
            </div>
          </div>

          <!-- 内测横幅 -->
          <div v-if="requirement.status === '测试中'" class="beta-banner">
            <div class="beta-content">
              <h3>🎉 抢先内测</h3>
              <p>应用已进入测试阶段，名额有限，优先反馈者优先通过！</p>
            </div>
            <BaseButton variant="primary" size="large" @click="showBetaDialog = true">
              申请内测
            </BaseButton>
          </div>

          <!-- 标签页 -->
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane label="💬 讨论" name="discussion">
              <div class="comments-section">
                <h3>评论 ({{ comments.length }})</h3>
                <div v-if="authStore.isAuthenticated" class="comment-form">
                  <el-input
                    v-model="newComment"
                    type="textarea"
                    :rows="3"
                    placeholder="发表你的看法..."
                  />
                  <BaseButton variant="primary" @click="handleAddComment" :loading="commenting">
                    发表评论
                  </BaseButton>
                </div>
                <div v-else class="login-tip">
                  <BaseButton variant="secondary" @click="$router.push('/login')">登录后评论</BaseButton>
                </div>
                <div class="comments-list">
                  <BaseCard v-for="comment in comments" :key="comment.id" padding="compact" class="comment-item">
                    <template #header>
                      <div class="comment-header">
                        <img
                          :src="`/images/avaters/head${defaultAvatarIndex(comment)}.svg`"
                          :alt="comment.username ?? ''"
                          class="comment-avatar-img"
                        />
                        <div class="comment-meta">
                          <span class="comment-user">{{ comment.username }}</span>
                          <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
                        </div>
                      </div>
                    </template>
                    <div class="comment-content">{{ comment.content }}</div>
                  </BaseCard>
                  <EmptyState
                    v-if="comments.length === 0"
                    illustration="no-messages"
                    title="暂无评论"
                    description="来发表第一条吧！"
                  />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane v-if="showDevPlan" label="📋 开发计划" name="devplan">
              <FeatureVoting :requirement-id="route.params.id as string" />
            </el-tab-pane>

            <el-tab-pane v-if="showDevLogs" label="📝 开发日志" name="devlogs">
              <LogTimeline :requirement-id="route.params.id as string" />
            </el-tab-pane>
          </el-tabs>
        </div>

        <BaseCard class="vote-card" :padding="'normal'">
          <div class="vote-count">
            <span class="count">{{ requirement.vote_count }}</span>
            <span class="label">票</span>
          </div>
          <BaseButton
            v-if="authStore.isAuthenticated"
            variant="primary"
            size="large"
            full-width
            @click="handleVote"
            :disabled="hasVoted"
            :loading="voting"
          >
            {{ hasVoted ? '已投票' : '投票支持' }}
          </BaseButton>
          <BaseButton v-else variant="secondary" size="large" full-width @click="$router.push('/login')">
            登录后投票
          </BaseButton>
        </BaseCard>
      </div>
    </div>

    <ApplicationDialog
      v-model="showBetaDialog"
      :requirement-id="route.params.id as string"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, User, Calendar, FolderOpened } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import { requirementApi } from '@/api/requirement';
import EmptyState from '@/components/EmptyState.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseCard from '@/components/BaseCard.vue';
import FeatureVoting from '@/components/DevPlan/FeatureVoting.vue';
import ApplicationDialog from '@/components/BetaTest/ApplicationDialog.vue';
import LogTimeline from '@/components/DevLog/LogTimeline.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const requirement = ref<any>(null);
const loading = ref(true);
const voting = ref(false);
const hasVoted = ref(false);
const activeTab = ref('discussion');
const comments = ref<any[]>([]);
const newComment = ref('');
const commenting = ref(false);
const showBetaDialog = ref(false);
const specPreview = ref<string | null>(null);
const specLoading = ref(false);
const prototypeHtml = ref<string | null>(null);
const prototypeLoading = ref(false);

const canGenerateApp = computed(() => {
  return requirement.value &&
         requirement.value.title &&
         requirement.value.description &&
         authStore.isAuthenticated;
});

const showDevPlan = computed(() => {
  return requirement.value?.status === '已采纳' ||
         requirement.value?.status === '开发中' || 
         requirement.value?.status === '测试中' || 
         requirement.value?.status === '已上线';
});

const showDevLogs = computed(() => {
  return requirement.value?.status === '已采纳' ||
         requirement.value?.status === '开发中' || 
         requirement.value?.status === '测试中' || 
         requirement.value?.status === '已上线';
});

onMounted(() => {
  loadRequirement();
  loadComments();
});

async function loadRequirement() {
  try {
    const { data } = await api.get(`/requirements/${route.params.id}`);
    requirement.value = data.requirement;
    
    if (authStore.isAuthenticated) {
      checkVoteStatus();
    }
    loadSpecPreview();
    loadPrototype();
  } catch (error) {
    ElMessage.error('加载需求失败');
  } finally {
    loading.value = false;
  }
}

async function loadPrototype() {
  const id = route.params.id as string;
  if (!id) return;
  prototypeLoading.value = true;
  prototypeHtml.value = null;
  try {
    const { data } = await api.get(`/prototype/artifacts/${id}`, { responseType: 'text' });
    prototypeHtml.value = typeof data === 'string' ? data : null;
  } catch {
    prototypeHtml.value = null;
  } finally {
    prototypeLoading.value = false;
  }
}

async function loadSpecPreview() {
  const id = route.params.id as string;
  if (!id) return;
  specLoading.value = true;
  specPreview.value = null;
  try {
    const { data } = await requirementApi.getSpecPreview(id);
    specPreview.value = data.spec && data.spec.length > 0 ? data.spec : null;
  } catch {
    specPreview.value = null;
  } finally {
    specLoading.value = false;
  }
}

function copySpec() {
  if (!specPreview.value) return;
  navigator.clipboard.writeText(specPreview.value).then(() => {
    ElMessage.success('已复制到剪贴板');
  }).catch(() => {
    ElMessage.error('复制失败');
  });
}

async function loadComments() {
  try {
    const { data } = await api.get(`/comments/requirement/${route.params.id}`);
    comments.value = data.comments;
  } catch (error) {
    // Ignore error
  }
}

async function checkVoteStatus() {
  try {
    const { data } = await api.get(`/votes/check/${route.params.id}`);
    hasVoted.value = data.hasVoted;
  } catch (error) {
    // Ignore error
  }
}

async function handleVote() {
  voting.value = true;
  try {
    await api.post('/votes', { requirement_id: route.params.id });
    ElMessage.success('投票成功！');
    hasVoted.value = true;
    if (requirement.value) {
      requirement.value.vote_count++;
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '投票失败');
  } finally {
    voting.value = false;
  }
}

async function handleAddComment() {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  commenting.value = true;
  try {
    await api.post('/comments', {
      requirement_id: route.params.id,
      content: newComment.value
    });
    ElMessage.success('评论成功！');
    newComment.value = '';
    loadComments();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '评论失败');
  } finally {
    commenting.value = false;
  }
}

function goToPrototype() {
  if (requirement.value?.id) {
    router.push(`/requirement/${requirement.value.id}/prototype`);
  }
}

function getStatusType(status: string) {
  const map: Record<string, any> = {
    '待审核': 'info',
    '投票中': 'warning',
    '已采纳': 'success',
    '开发中': 'primary',
    '测试中': 'warning',
    '已上线': 'success',
    '已拒绝': 'danger'
  };
  return map[status] || 'info';
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN');
}

function defaultAvatarIndex(comment: { user_id?: string; username?: string }) {
  const s = String(comment?.user_id ?? comment?.username ?? '');
  const n = s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (n % 10) + 1;
}
</script>

<style scoped>
.requirement-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl);
}

.loading, .error {
  text-align: center;
  padding: var(--space-4xl);
  font-size: 18px;
  color: var(--color-text-secondary);
}

.detail-header {
  margin-bottom: var(--space-xl);
}

.detail-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

.requirement-info {
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-lg);
  gap: var(--space-lg);
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  flex: 1;
}

.meta-row {
  display: flex;
  gap: var(--space-xl);
  margin-bottom: var(--space-2xl);
  padding-bottom: var(--space-lg);
  border-bottom: 1px solid var(--color-surface-dark);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.description, .section {
  margin-bottom: var(--space-xl);
}

.description h3, .section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.description p, .section p {
  font-size: 14px;
  line-height: 1.6;
  color: #6b7280;
  white-space: pre-wrap;
}

.spec-preview-section {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #f9fafb;
}

.spec-explanation,
.spec-hint {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-md);
  line-height: 1.6;
}

.spec-content-wrapper {
  position: relative;
}

.spec-content {
  display: block;
  margin: 0;
  padding: var(--space-lg);
  font-family: ui-monospace, monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-surface-light);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-surface-dark);
  max-height: 360px;
  overflow-y: auto;
}

.copy-spec-btn {
  margin-top: var(--space-sm);
}

.spec-empty {
  padding: var(--space-lg);
  background: var(--color-surface-light);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.spec-empty p {
  margin: 0 0 var(--space-sm) 0;
}

.spec-loading {
  padding: var(--space-lg);
  color: var(--color-text-secondary);
  font-size: 14px;
}

.prototype-preview-section {
  margin-bottom: var(--space-xl);
}

.prototype-iframe-wrap {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
  min-height: 400px;
}

.prototype-iframe {
  width: 100%;
  height: 500px;
  border: none;
  display: block;
}

.prototype-placeholder {
  padding: 32px;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
  color: #6b7280;
}

.prototype-placeholder p {
  margin: 0 0 var(--space-2) 0;
}

.prototype-hint {
  font-size: 14px;
  opacity: 0.9;
}

.beta-banner {
  margin-top: var(--space-2xl);
  padding: var(--space-2xl);
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 107, 53, 0.05) 100%);
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-accent-500);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-xl);
}

.beta-content h3 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 var(--space-sm) 0;
  color: var(--color-accent-500);
}

.beta-content p {
  margin: 0;
  color: var(--color-text-secondary);
}

.ai-generation-section {
  margin: var(--space-xl) 0;
}

.ai-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.ai-card :deep(.el-card__body) {
  padding: var(--space-xl);
}

.ai-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.ai-info h3 {
  color: white;
  margin: 0 0 var(--space-sm) 0;
  font-size: 18px;
}

.ai-info p {
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.detail-tabs {
  margin-top: var(--space-2xl);
}

.comments-section, .devplan-section, .devlogs-section {
  padding: var(--space-lg) 0;
}

.comments-section h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-lg);
}

.comment-form {
  margin-bottom: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.comment-form .el-button,
.comment-form .vk-base-button {
  align-self: flex-end;
}

.login-tip {
  text-align: center;
  padding: var(--space-xl);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-xl);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.comment-item {
  padding: var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}

.comment-avatar-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.comment-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.comment-user {
  font-weight: 600;
  color: var(--color-text-primary);
}

.comment-time {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.comment-content {
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.placeholder {
  text-align: center;
  padding: var(--space-4xl);
  color: var(--color-text-secondary);
  font-size: 16px;
}

.empty {
  text-align: center;
  padding: var(--space-2xl);
  color: var(--color-text-secondary);
}

.vote-card {
  background: var(--color-surface-light);
  padding: var(--space-2xl);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
  position: sticky;
  top: var(--space-2xl);
}

.vote-count {
  margin-bottom: var(--space-xl);
}

.vote-count .count {
  display: block;
  font-size: 48px;
  font-weight: 700;
  color: var(--color-accent-500);
  line-height: 1;
}

.vote-count .label {
  display: block;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-top: var(--space-sm);
}

@media (max-width: 768px) {
  .detail-content {
    grid-template-columns: 1fr;
  }

  .vote-card {
    position: static;
  }
}
</style>
