<template>
  <div class="prototype-square-page">
    <!-- 顶部标题区 -->
    <section class="page-hero animate-slide-up">
      <h1 class="page-title">原型广场</h1>
      <p class="page-subtitle">为你喜欢的想法投票</p>

      <div
        v-if="!authStore.isAuthenticated"
        class="auth-callout"
      >
        <div class="auth-callout-text">
          <h2>登录后即可投票和评论</h2>
          <p>参与投票，让高票创意尽快进入开发排期。</p>
        </div>
        <div class="auth-callout-actions">
          <el-button type="primary" @click="$router.push('/login')">登录</el-button>
          <el-button @click="$router.push('/register')">注册</el-button>
        </div>
      </div>
    </section>

    <!-- 筛选 + 排序 + 搜索 -->
    <section class="toolbar-section animate-fade-in">
      <div class="toolbar-left">
        <span class="toolbar-label">行业</span>
        <div class="tag-group">
          <button
            v-for="tag in industryTags"
            :key="tag.value"
            class="tag-pill"
            :class="{ 'tag-pill-active': selectedIndustry === tag.value }"
            @click="handleIndustryChange(tag.value)"
          >
            {{ tag.label }}
          </button>
        </div>
      </div>
      <div class="toolbar-right">
        <el-select
          v-model="sortBy"
          class="sort-select"
          size="large"
          @change="handleSortChange"
        >
          <el-option label="按热度排序" value="popular" />
          <el-option label="按最新提交" value="latest" />
        </el-select>
        <el-input
          v-model="searchQuery"
          class="search-input"
          size="large"
          placeholder="搜索你感兴趣的创意"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </section>

    <!-- 原型卡片网格 -->
    <section class="grid-section" ref="listRef">
      <div v-if="initialLoading" class="loading-container">
        <el-row :gutter="24">
          <el-col v-for="i in 8" :key="i" :xs="24" :sm="12" :lg="6">
            <el-skeleton :rows="4" animated class="skeleton-card" />
          </el-col>
        </el-row>
      </div>

      <template v-else>
        <el-row v-if="displayedRequirements.length > 0" :gutter="20" class="cards-container">
          <el-col
            v-for="(req, index) in displayedRequirements"
            :key="req.id"
            :xs="24"
            :sm="12"
            :lg="6"
            class="stagger-item"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <RequirementCard
              :title="req.title"
              :description="req.description"
              :vote-count="req.vote_count"
              :status="req.status"
              :category="req.category"
              :cover-image="getPrototypeImageUrl(req.prototype_screenshot_url)"
              :can-vote="authStore.isAuthenticated"
              @click="goToDetail(req)"
              @vote="handleQuickVote(req)"
            />
          </el-col>
        </el-row>

        <EmptyState
          v-else
          illustration="no-tasks"
          title="暂时没有匹配的原型"
          description="可以调整行业、排序或搜索词再试试。"
        />
      </template>

      <!-- 加载更多 / 无限滚动观察点 -->
      <div
        v-if="hasMore && !initialLoading"
        ref="loadMoreRef"
        class="load-more-sentinel"
      >
        <el-spinner class="load-more-spinner" v-if="isLoadingMore" />
      </div>

      <p
        v-if="!hasMore && displayedRequirements.length > 0"
        class="end-tip"
      >
        没有更多原型了
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { requirementApi } from '@/api/requirement';
import RequirementCard from '@/components/RequirementCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { getPrototypeImageUrl } from '@/utils/prototypeImage';
import type { Requirement } from '@/types';

const authStore = useAuthStore();
const router = useRouter();

const requirements = ref<Requirement[]>([]);
const total = ref(0);
const pageSize = ref(16);
const offset = ref(0);
const hasMore = ref(true);
const loading = ref(false);
const initialLoading = ref(true);
const isLoadingMore = ref(false);

const listRef = ref<HTMLElement | null>(null);
const loadMoreRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

const industryTags = [
  { label: '全部', value: '' },
  { label: '效率工具', value: '效率工具' },
  { label: '电商与营销', value: '电商与营销' },
  { label: '内容创作', value: '内容创作' },
  { label: '数据与分析', value: '数据与分析' },
  { label: '其它', value: '其它' },
];

const selectedIndustry = ref<string>('');
const sortBy = ref<'popular' | 'latest'>('popular');
const searchQuery = ref('');

const displayedRequirements = computed(() => {
  const list = [...requirements.value];
  if (sortBy.value === 'popular') {
    return list.sort((a, b) => b.vote_count - a.vote_count || Date.parse(b.created_at) - Date.parse(a.created_at));
  }
  return list.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
});

async function loadRequirements(reset = false) {
  if (loading.value || isLoadingMore.value) return;

  if (reset) {
    offset.value = 0;
    requirements.value = [];
    hasMore.value = true;
  }

  if (!hasMore.value) return;

  loading.value = true;
  if (offset.value === 0) {
    initialLoading.value = true;
  } else {
    isLoadingMore.value = true;
  }

  try {
    const params: any = {
      limit: pageSize.value,
      offset: offset.value,
      status: '投票中',
    };

    if (selectedIndustry.value) {
      params.category = selectedIndustry.value;
    }
    if (searchQuery.value.trim()) {
      params.query = searchQuery.value.trim();
    }

    const { data } = await requirementApi.getList(params);
    if (reset) {
      requirements.value = data.requirements;
    } else {
      requirements.value = [...requirements.value, ...data.requirements];
    }
    total.value = data.total;
    offset.value += data.requirements.length;
    hasMore.value = requirements.value.length < data.total;
  } catch (error) {
    ElMessage.error('加载原型列表失败');
  } finally {
    loading.value = false;
    initialLoading.value = false;
    isLoadingMore.value = false;
  }
}

function setupObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (!loadMoreRef.value) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadRequirements(false);
        }
      });
    },
    {
      root: null,
      rootMargin: '0px 0px 120px 0px',
      threshold: 0.1,
    }
  );

  observer.observe(loadMoreRef.value);
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function handleIndustryChange(value: string) {
  selectedIndustry.value = value;
  loadRequirements(true);
}

function handleSortChange() {
  // 纯前端排序，直接依赖 computed 即可
}

function handleSearch() {
  loadRequirements(true);
}

function goToDetail(req: Requirement) {
  router.push(`/requirement/${req.id}`);
}

async function handleQuickVote(req: Requirement) {
  if (!authStore.isAuthenticated) {
    ElMessage.info('请先登录后再投票');
    router.push('/login');
    return;
  }

  try {
    // 复用首页的快速投票逻辑由 voteApi 处理
    const { voteApi } = await import('@/api/vote');
    await voteApi.vote(req.id);
    ElMessage.success('投票成功！');
    req.vote_count++;
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '投票失败');
  }
}

onMounted(() => {
  loadRequirements(true);
  setupObserver();
});

onBeforeUnmount(() => {
  cleanupObserver();
});

watch(
  () => loadMoreRef.value,
  () => {
    setupObserver();
  }
);
</script>

<style scoped>
.prototype-square-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-lg) var(--space-3xl);
}

.page-hero {
  margin-bottom: var(--space-2xl);
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 var(--space-sm);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-subtitle {
  margin: 0;
  font-size: 16px;
  color: var(--color-text-secondary);
}

.auth-callout {
  margin-top: var(--space-xl);
  padding: var(--space-lg);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(25, 136, 235, 0.06), rgba(255, 145, 0, 0.04));
  border: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-lg);
}

.auth-callout-text h2 {
  margin: 0 0 var(--space-xs);
  font-size: 16px;
  font-weight: 600;
}

.auth-callout-text p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.auth-callout-actions {
  display: flex;
  gap: var(--space-sm);
  flex-shrink: 0;
}

.toolbar-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-xl);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
}

.toolbar-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  flex: 1;
}

.toolbar-label {
  font-size: 13px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.tag-pill {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-gray-200);
  background: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tag-pill:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-700);
  background: #ffffff;
}

.tag-pill-active {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
  color: #ffffff;
  box-shadow: var(--shadow-sm);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.sort-select {
  width: 170px;
}

.search-input {
  width: 260px;
}

.grid-section {
  margin-top: var(--space-lg);
}

.cards-container {
  margin-bottom: var(--space-xl);
}

.cards-container .el-col {
  margin-bottom: var(--space-lg);
}

.loading-container {
  margin-bottom: var(--space-2xl);
}

.skeleton-card {
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  margin-bottom: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.load-more-sentinel {
  margin: var(--space-lg) 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 40px;
}

.end-tip {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: var(--space-md);
}

@media (max-width: 768px) {
  .prototype-square-page {
    padding: var(--space-xl) var(--space-md);
  }

  .toolbar-section {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .sort-select {
    width: 50%;
  }

  .search-input {
    width: 50%;
  }

  .auth-callout {
    flex-direction: column;
    align-items: flex-start;
  }

  .auth-callout-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>

