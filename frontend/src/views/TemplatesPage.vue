<template>
  <div class="templates-page">
    <div class="page-header">
      <h1>精选模板</h1>
      <p class="page-subtitle">浏览中国特色 UI 模板，快速找到符合需求的选项</p>
    </div>

    <div class="page-content">
      <!-- 一级分类 -->
      <section class="section section-categories">
        <div class="category-tabs">
          <button
            v-for="cat in templateMainCategories"
            :key="cat.id"
            type="button"
            class="category-tab"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectCategory(cat.id)"
          >
            {{ cat.label }}
          </button>
        </div>
      </section>

      <!-- 标签筛选 -->
      <section class="section section-filters">
        <div class="filter-group">
          <span class="filter-label">设计风格：</span>
          <div class="filter-tags">
            <el-tag
              v-for="t in styleTags"
              :key="t"
              class="filter-tag"
              :type="selectedTags.style.includes(t) ? 'primary' : 'info'"
              effect="plain"
              size="small"
              @click="toggleTag('style', t)"
            >
              {{ t }}
            </el-tag>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">核心功能：</span>
          <div class="filter-tags">
            <el-tag
              v-for="t in featureTags"
              :key="t"
              class="filter-tag"
              :type="selectedTags.feature.includes(t) ? 'primary' : 'info'"
              effect="plain"
              size="small"
              @click="toggleTag('feature', t)"
            >
              {{ t }}
            </el-tag>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">色彩主题：</span>
          <div class="filter-tags">
            <el-tag
              v-for="t in colorTags"
              :key="t"
              class="filter-tag"
              :type="selectedTags.color.includes(t) ? 'primary' : 'info'"
              effect="plain"
              size="small"
              @click="toggleTag('color', t)"
            >
              {{ t }}
            </el-tag>
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">设备适配：</span>
          <div class="filter-tags">
            <el-tag
              v-for="t in deviceTags"
              :key="t"
              class="filter-tag"
              :type="selectedTags.device.includes(t) ? 'primary' : 'info'"
              effect="plain"
              size="small"
              @click="toggleTag('device', t)"
            >
              {{ t }}
            </el-tag>
          </div>
        </div>
        <div v-if="hasActiveFilters" class="filter-actions">
          <el-button link type="primary" size="small" @click="clearFilters">清空筛选</el-button>
        </div>
      </section>

      <!-- 模板网格 -->
      <section class="section section-grid">
        <div class="templates-grid">
          <el-card
            v-for="tpl in filteredTemplates"
            :key="tpl.id"
            class="template-card"
            shadow="hover"
            @click="openDetail(tpl)"
          >
            <div class="card-preview">
              <img
                v-if="getTemplateCoverUrl(tpl)"
                class="card-cover-image"
                :src="getTemplateCoverUrl(tpl)!"
                :alt="tpl.name"
              />
              <div
                v-else
                class="card-preview-fallback"
                :style="{ background: tpl.previewBg, color: tpl.previewColor }"
              >
                <span class="card-preview-text">{{ tpl.name }}</span>
              </div>
            </div>
            <div class="card-body">
              <div class="card-header-row">
                <h3 class="card-title">{{ tpl.name }}</h3>
                <el-tag size="small" type="info" effect="plain">{{ categoryLabel(tpl.categoryId) }}</el-tag>
              </div>
              <p v-if="tpl.subTitle" class="card-subtitle">{{ tpl.subTitle }}</p>
              <p class="card-desc">{{ tpl.description }}</p>
              <div class="card-tags">
                <el-tag
                  v-for="s in tpl.tags.style.slice(0, 2)"
                  :key="'s-' + s"
                  size="small"
                  effect="plain"
                  class="card-tag"
                >
                  {{ s }}
                </el-tag>
                <el-tag
                  v-for="f in tpl.tags.feature.slice(0, 2)"
                  :key="'f-' + f"
                  size="small"
                  type="success"
                  effect="plain"
                  class="card-tag"
                >
                  {{ f }}
                </el-tag>
              </div>
            </div>
          </el-card>
        </div>

        <EmptyState
          v-if="filteredTemplates.length === 0"
          illustration="no-data"
          title="暂无匹配模板"
          description="试试调整分类或标签筛选条件"
        />
      </section>
    </div>

    <!-- 详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      :title="selectedTemplate ? selectedTemplate.name : '模板详情'"
      direction="rtl"
      size="400px"
      class="template-detail-drawer"
    >
      <template v-if="selectedTemplate" #header>
        <span class="drawer-title">{{ selectedTemplate.name }}</span>
        <el-tag size="small" type="info">{{ categoryLabel(selectedTemplate.categoryId) }}</el-tag>
      </template>
      <div v-if="selectedTemplate" class="drawer-body">
        <p v-if="selectedTemplate.subTitle" class="drawer-subtitle">{{ selectedTemplate.subTitle }}</p>
        <p class="drawer-desc">{{ selectedTemplate.description }}</p>
        <div class="drawer-section">
          <h4>设计风格</h4>
          <div class="drawer-tags">
            <el-tag v-for="s in selectedTemplate.tags.style" :key="'s-' + s" size="small" effect="plain">
              {{ s }}
            </el-tag>
            <span v-if="selectedTemplate.tags.style.length === 0" class="drawer-empty">—</span>
          </div>
        </div>
        <div class="drawer-section">
          <h4>核心功能</h4>
          <div class="drawer-tags">
            <el-tag v-for="f in selectedTemplate.tags.feature" :key="'f-' + f" size="small" type="success" effect="plain">
              {{ f }}
            </el-tag>
            <span v-if="selectedTemplate.tags.feature.length === 0" class="drawer-empty">—</span>
          </div>
        </div>
        <div class="drawer-section">
          <h4>色彩主题</h4>
          <div class="drawer-tags">
            <el-tag v-for="c in selectedTemplate.tags.color" :key="'c-' + c" size="small" type="warning" effect="plain">
              {{ c }}
            </el-tag>
            <span v-if="selectedTemplate.tags.color.length === 0" class="drawer-empty">—</span>
          </div>
        </div>
        <div class="drawer-section">
          <h4>设备适配</h4>
          <div class="drawer-tags">
            <el-tag v-for="d in selectedTemplate.tags.device" :key="'d-' + d" size="small" type="info" effect="plain">
              {{ d }}
            </el-tag>
            <span v-if="selectedTemplate.tags.device.length === 0" class="drawer-empty">—</span>
          </div>
        </div>
        <div class="drawer-actions">
          <el-button type="primary" @click="goRequirementForTemplate(selectedTemplate)">
            用此模板提交需求
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  templateMainCategories,
  styleTags,
  featureTags,
  colorTags,
  deviceTags,
  chineseTemplates,
} from '@/data/chineseTemplates';
import type { ChineseTemplateMeta, TemplateMainCategoryId } from '@/types/templateGallery';
import EmptyState from '@/components/EmptyState.vue';
import api from '@/api';
import { getPrototypeImageUrl } from '@/utils/prototypeImage';

interface AppTemplateDto {
  id: string;
  name: string;
  type_key: string;
  example_requirement_id?: string | null;
}

const route = useRoute();
const router = useRouter();

const selectedCategory = ref<TemplateMainCategoryId>('all');
const selectedTags = ref<{
  style: string[];
  feature: string[];
  color: string[];
  device: string[];
}>({
  style: [],
  feature: [],
  color: [],
  device: [],
});

const detailVisible = ref(false);
const selectedTemplate = ref<ChineseTemplateMeta | null>(null);

const appTemplates = ref<AppTemplateDto[]>([]);
const requirementCovers = ref<Record<string, string | null>>({});
const loadingCovers = ref(false);

const appTemplateMap = computed(() => {
  const map = new Map<string, AppTemplateDto>();
  for (const t of appTemplates.value) {
    if (t.type_key) map.set(t.type_key, t);
  }
  return map;
});

function getExampleRequirementId(tpl: ChineseTemplateMeta | null): string | null {
  if (!tpl || !tpl.appTemplateKey) return null;
  const appTpl = appTemplateMap.value.get(tpl.appTemplateKey);
  return (appTpl?.example_requirement_id ?? null) || null;
}

function getTemplateCoverUrl(tpl: ChineseTemplateMeta): string | null {
  const requirementId = getExampleRequirementId(tpl);
  if (!requirementId) return null;
  const url = requirementCovers.value[requirementId];
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function selectCategory(id: TemplateMainCategoryId) {
  selectedCategory.value = id;
  router.replace({ query: { ...route.query, category: id === 'all' ? undefined : id } });
}

function toggleTag(
  dimension: 'style' | 'feature' | 'color' | 'device',
  tag: string
) {
  const arr = selectedTags.value[dimension];
  const idx = arr.indexOf(tag);
  if (idx === -1) arr.push(tag);
  else arr.splice(idx, 1);
  selectedTags.value = { ...selectedTags.value };
}

const hasActiveFilters = computed(() => {
  const t = selectedTags.value;
  return t.style.length > 0 || t.feature.length > 0 || t.color.length > 0 || t.device.length > 0;
});

function clearFilters() {
  selectedTags.value = { style: [], feature: [], color: [], device: [] };
}

const filteredTemplates = computed(() => {
  let list = chineseTemplates;
  if (selectedCategory.value !== 'all') {
    list = list.filter((t) => t.categoryId === selectedCategory.value);
  }
  const t = selectedTags.value;
  const dimensions: (keyof typeof t)[] = ['style', 'feature', 'color', 'device'];
  for (const dim of dimensions) {
    const chosen = t[dim];
    if (chosen.length === 0) continue;
    list = list.filter((item) => {
      const tags = item.tags[dim];
      return tags.some((tag: string) => chosen.includes(tag));
    });
  }
  return list;
});

function categoryLabel(categoryId: string) {
  const cat = templateMainCategories.find((c) => c.id === categoryId);
  return cat?.label ?? categoryId;
}

function openDetail(tpl: ChineseTemplateMeta) {
  selectedTemplate.value = tpl;
  detailVisible.value = true;
}

async function loadAppTemplatesAndCovers() {
  try {
    const { data } = await api.get('/requirements/app-templates');
    appTemplates.value = (data?.data ?? []) as AppTemplateDto[];

    const requirementIds = new Set<string>();
    for (const tpl of chineseTemplates) {
      const reqId = getExampleRequirementId(tpl);
      if (reqId) requirementIds.add(reqId);
    }

    if (requirementIds.size === 0) return;

    loadingCovers.value = true;
    const entries: [string, string | null][] = [];
    for (const id of requirementIds) {
      try {
        const { data: reqResp } = await api.get(`/requirements/${id}`);
        const url = (reqResp?.requirement?.prototype_screenshot_url as string | null) ?? null;
        entries.push([id, getPrototypeImageUrl(url) || null]);
      } catch {
        entries.push([id, null]);
      }
    }
    requirementCovers.value = Object.fromEntries(entries);
  } finally {
    loadingCovers.value = false;
  }
}

function goRequirementForTemplate(tpl: ChineseTemplateMeta | null) {
  if (!tpl) return;
  const requirementId = getExampleRequirementId(tpl);
  if (!requirementId) {
    window.alert('该模板暂未配置示例需求ID，请先在管理后台「应用模板」中填写示例需求ID。');
    return;
  }
  detailVisible.value = false;
  router.push(`/requirement/${requirementId}`);
}

watch(
  () => route.query.category,
  (cat) => {
    if (cat && templateMainCategories.some((c) => c.id === cat)) {
      selectedCategory.value = cat as TemplateMainCategoryId;
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadAppTemplatesAndCovers();
});
</script>

<style scoped>
.templates-page {
  min-height: 100vh;
  background: var(--neu-bg, #f5f5f5);
  padding-bottom: var(--space-2xl, 32px);
}

.page-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg, 24px);
}

.page-header {
  text-align: center;
  padding: var(--space-3xl, 48px) var(--space-lg);
  margin-bottom: var(--space-xl, 24px);
  background: var(--neu-bg);
}

.page-header h1 {
  margin: 0 0 var(--space-sm, 8px);
  font-size: 28px;
  font-weight: 700;
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: var(--color-text-secondary, #666);
}

.section {
  margin-bottom: var(--space-xl, 24px);
}

.section-categories {
  margin-bottom: var(--space-lg, 20px);
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm, 8px);
  justify-content: center;
}

.category-tab {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--color-border, #ddd);
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tab:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.category-tab.active {
  background: var(--el-color-primary);
  color: #fff;
  border-color: var(--el-color-primary);
}

.section-filters {
  background: #fff;
  border-radius: var(--radius-lg, 12px);
  padding: var(--space-lg, 20px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.filter-group {
  margin-bottom: var(--space-md, 12px);
}

.filter-group:last-of-type {
  margin-bottom: 0;
}

.filter-label {
  display: inline-block;
  min-width: 72px;
  font-size: 13px;
  color: var(--color-text-secondary);
  vertical-align: top;
  margin-right: var(--space-sm);
}

.filter-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.filter-tag {
  cursor: pointer;
}

.filter-actions {
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border, #eee);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-lg, 20px);
}

.template-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-card :deep(.el-card__body) {
  padding: 0;
}

.card-preview {
  height: 160px;
  border-radius: var(--radius-lg, 12px) var(--radius-lg, 12px) 0 0;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
}

.card-cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-preview-fallback {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-preview-text {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.card-body {
  padding: var(--space-md, 16px);
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.card-subtitle {
  margin: 0 0 4px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.card-desc {
  margin: 0 0 var(--space-sm, 8px);
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-tag {
  margin: 0;
}

.template-detail-drawer :deep(.el-drawer__header) {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);
}

.drawer-title {
  margin-right: 8px;
}

.drawer-body {
  padding: 0 8px;
}

.drawer-subtitle {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.drawer-desc {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-primary);
}

.drawer-section {
  margin-bottom: 20px;
}

.drawer-section h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.drawer-empty {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.drawer-actions {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color);
}
</style>
