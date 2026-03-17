<template>
  <div class="wizard-page">
    <!-- 顶部大标题 + 三步说明 -->
    <section class="wizard-hero animate-slide-up">
      <div class="wizard-hero-header">
        <h1 class="wizard-hero-title">智能应用需求生成器</h1>
        <p class="wizard-hero-subtitle">
          像对话一样描述你的想法，AI 帮你生成结构化规格与提示词
        </p>
      </div>

      <div class="wizard-steps">
        <div
          v-for="(step, index) in stepItems"
          :key="step.id"
          class="wizard-step-card"
          :class="{ active: currentStep === index }"
        >
          <div class="wizard-step-number">{{ index + 1 }}</div>
          <h3 class="wizard-step-title">{{ step.title }}</h3>
          <p class="wizard-step-desc">{{ step.desc }}</p>
        </div>
      </div>
    </section>

    <div class="wizard-layout">
      <!-- 左侧：模板选择 + 对话式澄清 -->
      <section class="wizard-main">
        <!-- Step 1：智能模板市场 -->
        <section v-show="currentStep === 0" class="template-market animate-fade-in">
          <h2 class="section-title">
            <i class="fas fa-th-large"></i>
            选择应用蓝图
          </h2>
          <p class="section-subtitle">
            选一个最接近你想法的起点，或让 AI 帮你推荐
          </p>

          <div class="template-categories">
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="category-tag"
              :class="{ active: selectedCategory === cat.id }"
              @click="selectedCategory = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>

          <div class="template-tag-filters">
            <div class="filter-row">
              <span class="filter-label">设计风格：</span>
              <div class="filter-tags">
                <button
                  v-for="t in styleTags"
                  :key="t"
                  type="button"
                  class="filter-tag"
                  :class="{ active: selectedTags.style.includes(t) }"
                  @click="toggleTag('style', t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div class="filter-row">
              <span class="filter-label">核心功能：</span>
              <div class="filter-tags">
                <button
                  v-for="t in featureTags"
                  :key="t"
                  type="button"
                  class="filter-tag"
                  :class="{ active: selectedTags.feature.includes(t) }"
                  @click="toggleTag('feature', t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div class="filter-row">
              <span class="filter-label">色彩主题：</span>
              <div class="filter-tags">
                <button
                  v-for="t in colorTags"
                  :key="t"
                  type="button"
                  class="filter-tag"
                  :class="{ active: selectedTags.color.includes(t) }"
                  @click="toggleTag('color', t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div class="filter-row">
              <span class="filter-label">设备适配：</span>
              <div class="filter-tags">
                <button
                  v-for="t in deviceTags"
                  :key="t"
                  type="button"
                  class="filter-tag"
                  :class="{ active: selectedTags.device.includes(t) }"
                  @click="toggleTag('device', t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div v-if="hasActiveTagFilters" class="filter-actions">
              <button type="button" class="filter-clear" @click="clearTagFilters">清空标签</button>
            </div>
          </div>

          <div class="template-ai-intro">
            <el-input
              v-model="aiIntro"
              type="textarea"
              :rows="2"
              placeholder="简单说说你想做什么应用、解决什么问题（用于 AI 推荐，可选）"
            />
            <BaseButton
              variant="primary"
              :disabled="!aiIntro.trim()"
              :loading="loadingRecommend"
              @click="handleAIRecommend"
              class="ai-recommend-btn"
            >
              <el-icon class="ai-recommend-icon"><MagicStick /></el-icon>
              AI 推荐模板
            </BaseButton>
          </div>

          <div class="templates-grid">
            <div
              v-for="tpl in filteredTemplates"
              :key="tpl.id"
              class="template-card"
              :class="{ selected: selectedTemplate?.id === tpl.id }"
              @click="selectTemplate(tpl)"
            >
              <div class="template-preview" :style="{ background: tpl.previewBg, color: tpl.previewColor }">
                <span class="template-preview-text">{{ tpl.name }}</span>
              </div>
              <div class="template-info">
                <div class="template-header-row">
                  <h3 class="template-title">{{ tpl.name }}</h3>
                  <span class="template-badge">{{ categoryLabel(tpl.categoryId) }}</span>
                </div>
                <p v-if="tpl.subTitle" class="template-subtitle">{{ tpl.subTitle }}</p>
                <p class="template-desc">
                  {{ tpl.description }}
                </p>
                <div class="template-tags">
                  <span
                    v-for="s in tpl.tags.style.slice(0, 2)"
                    :key="'s-' + s"
                    class="template-tag template-tag-style"
                  >
                    {{ s }}
                  </span>
                  <span
                    v-for="f in tpl.tags.feature.slice(0, 2)"
                    :key="'f-' + f"
                    class="template-tag template-tag-feature"
                  >
                    {{ f }}
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="filteredTemplates.length === 0"
              class="template-empty"
            >
              暂无匹配的模板，请调整分类/标签或直接让 AI 推荐。
            </div>
          </div>

          <div class="wizard-actions">
            <BaseButton variant="secondary" @click="$router.push('/')">
              取消返回首页
            </BaseButton>
            <BaseButton
              variant="primary"
              :disabled="!selectedTemplate"
              @click="goToClarification"
            >
              下一步：对话澄清 →
            </BaseButton>
          </div>
        </section>

        <!-- Step 2：对话式需求澄清 -->
        <section v-show="currentStep === 1" class="clarification-engine animate-fade-in">
          <div class="clarification-header">
            <div class="ai-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div>
              <h2>AI 需求助手</h2>
              <p>我会和你一起，把零散想法变成清晰规格</p>
            </div>
          </div>

          <div class="clarification-block">
            <div class="ai-message">
              <p>
                我看到你选择了
                <strong>{{ selectedTemplate?.name }}</strong>
                模板。先给你的应用起个好记又专业的名字吧。
              </p>
            </div>
            <div class="user-response">
              <div class="form-group">
                <label class="form-label">应用名称</label>
                <el-input
                  v-model="wizardState.appName"
                  placeholder="例如：健身补给站、我的数字工作台..."
                />
              </div>
              <div class="ai-suggestion">
                <div class="suggestion-title">
                  <i class="fas fa-lightbulb"></i>
                  AI 命名建议
                  <el-icon v-if="loadingNames" class="is-loading"><Loading /></el-icon>
                </div>
                <div class="options-grid">
                  <button
                    v-for="name in displayNameSuggestions"
                    :key="name"
                    class="option-card"
                    :class="{ selected: wizardState.appName === name }"
                    type="button"
                    @click="wizardState.appName = name"
                  >
                    <h4>{{ name }}</h4>
                    <p>点击使用此名称</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="clarification-block">
            <div class="ai-message">
              <p>
                关于这个应用，简单说说它要解决的场景和痛点。
              </p>
            </div>
            <div class="user-response">
              <div class="form-group">
                <label class="form-label">一句话介绍</label>
                <el-input
                  v-model="wizardState.oneLiner"
                  type="textarea"
                  :rows="2"
                  placeholder="已根据模板预填简介，可修改。例如：帮健身博主在线管理补剂库存与订单的小店后台"
                />
              </div>
              <div class="form-group">
                <label class="form-label">使用场景</label>
                <el-input
                  v-model="wizardState.scene"
                  type="textarea"
                  :rows="3"
                  placeholder="你在什么场景下会使用它？"
                />
              </div>
              <div class="form-group">
                <label class="form-label">主要痛点</label>
                <el-input
                  v-model="wizardState.pain"
                  type="textarea"
                  :rows="3"
                  placeholder="它要帮你解决哪些麻烦或低效的事情？"
                />
              </div>
              <div class="form-group">
                <label class="form-label">支持小程序</label>
                <label class="checkbox-item">
                  <el-checkbox v-model="wizardState.miniProgram" />
                  <span>需要支持微信/支付宝等小程序端</span>
                </label>
              </div>
            </div>
          </div>

          <div class="wizard-actions">
            <BaseButton variant="secondary" @click="currentStep = 0">
              ← 上一步：选择模板
            </BaseButton>
            <BaseButton
              variant="primary"
              :loading="loadingSpec"
              @click="goToSpec"
            >
              {{ loadingSpec ? '正在生成规格…' : '下一步：生成规格 →' }}
            </BaseButton>
          </div>
        </section>

        <!-- Step 3：多维度规格预览 -->
        <section v-show="currentStep === 2" class="spec-section animate-fade-in">
          <h2 class="section-title">
            <i class="fas fa-file-alt"></i>
            智能生成的规格文档
          </h2>

          <div class="completeness-meter-wrap">
            <p v-if="completenessMissingHint" class="completeness-missing-hint">
              {{ completenessMissingHint }}
            </p>
            <div class="completeness-meter">
              <span>完善度</span>
              <div class="meter-bar">
                <div
                  class="meter-fill"
                  :style="{ width: completeness + '%' }"
                />
              </div>
              <strong>{{ completeness }}%</strong>
            </div>
          </div>

          <div class="spec-tabs">
            <button
              v-for="tab in specTabs"
              :key="tab.id"
              class="spec-tab"
              :class="{ active: activeSpecTab === tab.id }"
              type="button"
              @click="activeSpecTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="spec-content-wrap">
            <div class="spec-content" v-if="activeSpecTab === 'overview'">
              <pre>{{ spec.overview }}</pre>
              <BaseButton variant="ghost" size="small" :loading="refineLoading" @click="openRefineDialog('overview')">魔法编辑</BaseButton>
            </div>
            <div class="spec-content" v-else-if="activeSpecTab === 'functions'">
              <pre>{{ spec.functions }}</pre>
              <BaseButton variant="ghost" size="small" :loading="refineLoading" @click="openRefineDialog('functions')">魔法编辑</BaseButton>
            </div>
            <div class="spec-content" v-else-if="activeSpecTab === 'design'">
              <pre>{{ spec.design }}</pre>
              <BaseButton variant="ghost" size="small" :loading="refineLoading" @click="openRefineDialog('design')">魔法编辑</BaseButton>
            </div>
            <div class="spec-content" v-else-if="activeSpecTab === 'tech'">
              <pre>{{ spec.tech }}</pre>
              <BaseButton variant="ghost" size="small" :loading="refineLoading" @click="openRefineDialog('tech')">魔法编辑</BaseButton>
            </div>
            <div class="spec-content" v-else-if="activeSpecTab === 'prompt'">
              <pre>{{ spec.prompt }}</pre>
              <BaseButton variant="ghost" size="small" :loading="refineLoading" @click="openRefineDialog('prompt')">魔法编辑</BaseButton>
            </div>
          </div>

          <el-dialog v-model="refineDialogVisible" title="魔法编辑" width="90%" max-width="560px">
            <p class="refine-hint">告诉 AI 你希望如何改写这段内容，例如：更专业、更简洁、更详细。</p>
            <el-input v-model="refineIntent" placeholder="更专业 / 更简洁 / 更详细" class="refine-input" />
            <template #footer>
              <BaseButton variant="secondary" @click="refineDialogVisible = false">取消</BaseButton>
              <BaseButton variant="primary" :loading="refineLoading" @click="confirmRefine">确认改写</BaseButton>
            </template>
          </el-dialog>

          <div class="wizard-actions">
            <BaseButton variant="secondary" @click="currentStep = 1">
              ← 返回调整需求
            </BaseButton>
            <BaseButton
              variant="primary"
              :loading="submitting"
              @click="handleSubmitRequirement"
            >
              {{ submitting ? '提交中...' : '提交到投票广场' }}
            </BaseButton>
          </div>
        </section>
      </section>

      <!-- 右侧：实时预览 / Mockup -->
      <aside class="wizard-aside">
        <div class="aside-card">
          <h3 class="aside-title">实时概要预览</h3>
          <p class="aside-app-name">
            {{ wizardState.appName || '未命名应用' }}
          </p>
          <p class="aside-one-liner">
            {{ wizardState.oneLiner || '填写右侧信息后，这里会展示你的应用一句话介绍。' }}
          </p>
          <ul class="aside-summary-list">
            <li>
              <strong>模板：</strong>{{ selectedTemplate?.name || '未选择' }}
            </li>
            <li>
              <strong>支持小程序：</strong>{{ wizardState.miniProgram ? '是' : '否' }}
            </li>
          </ul>
        </div>

        <div class="aside-card">
          <h3 class="aside-title">低保真界面预览（Mockup）</h3>
          <div class="mockup-box" :data-style="wizardState.uiStyle">
            <div class="mockup-header" />
            <div class="mockup-sidebar" />
            <div class="mockup-content">
              <div class="mockup-card" />
              <div class="mockup-card" />
              <div class="mockup-card" />
            </div>
          </div>
          <p class="mockup-note">
            颜色与布局会根据你选择的 UI 风格自动变化，仅为结构示意。
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { MagicStick, Loading } from '@element-plus/icons-vue';
import BaseButton from '@/components/BaseButton.vue';
import { requirementApi } from '@/api/requirement';
import { wizardApi } from '@/api/wizard';
import {
  templateMainCategories,
  chineseTemplates,
  styleTags,
  featureTags,
  colorTags,
  deviceTags,
} from '@/data/chineseTemplates';
import { uiTemplates } from '@/data/appTemplates';
import type { ChineseTemplateMeta, TemplateMainCategoryId } from '@/types/templateGallery';
import type { UiStyleId } from '@/types/wizard';

const router = useRouter();

const stepItems = [
  {
    id: 'step1',
    title: '智能场景匹配',
    desc: '选择或 AI 推荐最合适的应用蓝图',
  },
  {
    id: 'step2',
    title: '对话式需求澄清',
    desc: '通过问答把想法说清楚',
  },
  {
    id: 'step3',
    title: '多维度规格生成',
    desc: '自动生成功能 + UI + 技术规格',
  },
] as const;

const currentStep = ref(0);

const categories = templateMainCategories;
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
const aiIntro = ref('');

const templates = chineseTemplates;
const appTemplatesFromApi = ref<Array<{ id: string; name: string; type_key: string }>>([]);

const selectedTemplate = ref<ChineseTemplateMeta | null>(null);

const selectedAppTemplateId = computed(() => {
  const t = selectedTemplate.value;
  if (!t?.appTemplateKey) return null;
  const found = appTemplatesFromApi.value.find((x) => x.type_key === t.appTemplateKey);
  return found?.id ?? null;
});

function categoryLabel(categoryId: string) {
  const cat = templateMainCategories.find((c) => c.id === categoryId);
  return cat?.label ?? categoryId;
}

function toggleTag(dimension: 'style' | 'feature' | 'color' | 'device', tag: string) {
  const arr = selectedTags.value[dimension];
  const idx = arr.indexOf(tag);
  if (idx === -1) arr.push(tag);
  else arr.splice(idx, 1);
  selectedTags.value = { ...selectedTags.value };
}

const hasActiveTagFilters = computed(() => {
  const t = selectedTags.value;
  return t.style.length > 0 || t.feature.length > 0 || t.color.length > 0 || t.device.length > 0;
});

function clearTagFilters() {
  selectedTags.value = { style: [], feature: [], color: [], device: [] };
}

onMounted(async () => {
  try {
    const { data } = await requirementApi.getAppTemplates();
    appTemplatesFromApi.value = data?.data ?? [];
  } catch {
    appTemplatesFromApi.value = [];
  }
});

const loadingRecommend = ref(false);
const loadingNames = ref(false);
const loadingFields = ref(false);
const loadingFeatures = ref(false);
const loadingSpec = ref(false);

const filteredTemplates = computed(() => {
  let list = templates;
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

function selectTemplate(tpl: ChineseTemplateMeta) {
  selectedTemplate.value = tpl;
}

async function handleAIRecommend() {
  const desc = aiIntro.value.trim();
  if (!desc) return;
  loadingRecommend.value = true;
  try {
    const res = await wizardApi.recommendTemplate(desc);
    const data = res.data?.data;
    const target = data ? templates.find((t) => t.id === data.recommendedId) : undefined;
    if (target) {
      selectedCategory.value = target.categoryId;
      selectedTemplate.value = target;
      ElMessage.success(data?.reason ? `已为你推荐「${target.name}」：${data.reason}` : `已为你推荐模板「${target.name}」`);
    } else {
      ElMessage.warning('未匹配到模板，请手动选择');
    }
  } catch {
    const text = desc.toLowerCase();
    let target: ChineseTemplateMeta | undefined;
    if (text.includes('餐厅') || text.includes('餐饮') || text.includes('订座')) target = templates.find((t) => t.id === 'yequ');
    else if (text.includes('茶饮') || text.includes('奶茶') || text.includes('咖啡')) target = templates.find((t) => t.id === 'fubai');
    else if (text.includes('酒') || text.includes('电商')) target = templates.find((t) => t.id === 'shuxiang') || templates.find((t) => t.id === 'liaoyuan');
    else if (text.includes('博物馆') || text.includes('文博') || text.includes('展览')) target = templates.find((t) => t.id === 'danqingyin');
    else if (text.includes('非遗') || text.includes('传统文化')) target = templates.find((t) => t.id === 'zhuyun');
    else if (text.includes('酒店') || text.includes('民宿') || text.includes('预订')) target = templates.find((t) => t.id === 'dieshan');
    else if (text.includes('文旅') || text.includes('景区') || text.includes('导览')) target = templates.find((t) => t.id === 'xingge');
    else if (text.includes('国潮') || text.includes('零售')) target = templates.find((t) => t.id === 'liaoyuan');
    else if (text.includes('家居') || text.includes('家具')) target = templates.find((t) => t.id === 'linglong');
    else if (text.includes('服装') || text.includes('服饰') || text.includes('试穿')) target = templates.find((t) => t.id === 'caiyun');
    else if (text.includes('儿童') || text.includes('启蒙') || text.includes('教育')) target = templates.find((t) => t.id === 'zhiliao');
    else if (text.includes('知识') || text.includes('付费') || text.includes('学习')) target = templates.find((t) => t.id === 'gewu');
    else if (text.includes('健康') || text.includes('养生') || text.includes('体质')) target = templates.find((t) => t.id === 'taihe');
    else if (text.includes('物业') || text.includes('社区') || text.includes('打卡')) target = templates.find((t) => t.id === 'heyuan');
    else if (text.includes('金融') || text.includes('数据') || text.includes('仪表盘')) target = templates.find((t) => t.id === 'jinshi');
    else target = templates[0];
    if (target) {
      selectedCategory.value = target.categoryId;
      selectedTemplate.value = target;
      ElMessage.success(`已为你推荐模板「${target.name}」`);
    }
  } finally {
    loadingRecommend.value = false;
  }
}

function goToClarification() {
  if (!selectedTemplate.value) {
    ElMessage.warning('请先选择一个模板');
    return;
  }
  if (!wizardState.oneLiner.trim() && selectedTemplate.value.description) {
    wizardState.oneLiner = selectedTemplate.value.description;
  }
  currentStep.value = 1;
}

// ========= 对话式澄清状态 =========

const wizardState = reactive({
  appName: '',
  oneLiner: '',
  scene: '',
  pain: '',
  miniProgram: false,
  dataFields: [] as string[],
  features: [] as string[],
  uiStyle: 'modern-minimal' as UiStyleId,
  platforms: ['web'] as string[],
  dataScale: 'medium' as 'small' | 'medium' | 'large',
  permission: 'multi' as 'single' | 'multi',
});

const aiNameSuggestions = ref<string[]>([]);
const nameSuggestionsFallback = computed(() => {
  const base = selectedTemplate.value?.name || '应用';
  const catLabel = selectedTemplate.value ? categoryLabel(selectedTemplate.value.categoryId) : '助手';
  return [`智能${base}`, `我的${catLabel}助手`, `${base} Pro`];
});
const displayNameSuggestions = computed(() =>
  aiNameSuggestions.value.length > 0 ? aiNameSuggestions.value : nameSuggestionsFallback.value
);

async function fetchNameSuggestions() {
  if (!selectedTemplate.value) return;
  loadingNames.value = true;
  try {
    const res = await wizardApi.suggestNames(selectedTemplate.value.name, wizardState.oneLiner);
    const payload = res.data?.data;
    aiNameSuggestions.value = payload?.suggestions || [];
  } catch {
    aiNameSuggestions.value = [];
  } finally {
    loadingNames.value = false;
  }
}

const aiSuggestedFields = ref<Array<{ id: string; label: string; reason: string }>>([]);
async function fetchSuggestedFields() {
  if (!selectedTemplate.value) return;
  loadingFields.value = true;
  try {
    const res = await wizardApi.suggestFields(wizardState.oneLiner || wizardState.scene, selectedTemplate.value.id);
    const list = res.data?.data;
    aiSuggestedFields.value = Array.isArray(list) ? list : [];
  } catch {
    aiSuggestedFields.value = [];
  } finally {
    loadingFields.value = false;
  }
}

function addAiSuggestedFields() {
  const next = new Set(wizardState.dataFields);
  aiSuggestedFields.value.forEach((f) => next.add(f.id));
  wizardState.dataFields = Array.from(next);
}

const aiSuggestedFeatures = ref<Array<{ id: string; label: string; hint: string }>>([]);
async function fetchSuggestedFeatures() {
  if (!selectedTemplate.value) return;
  loadingFeatures.value = true;
  try {
    const res = await wizardApi.suggestFeatures(selectedTemplate.value.id);
    const list = res.data?.data;
    aiSuggestedFeatures.value = Array.isArray(list) ? list : [];
  } catch {
    aiSuggestedFeatures.value = [];
  } finally {
    loadingFeatures.value = false;
  }
}

const mergedFeatureOptions = computed(() => {
  const base = featureOptions.map((f) => ({ ...f, aiRecommended: false }));
  const aiIds = new Set(base.map((f) => f.id));
  const fromAi = aiSuggestedFeatures.value.filter((f) => !aiIds.has(f.id)).map((f) => ({ ...f, aiRecommended: true }));
  return [...base, ...fromAi];
});

const dataFieldOptions = [
  { id: 'name', label: '名称 / 标题' },
  { id: 'cover', label: '封面图片' },
  { id: 'price', label: '价格 / 费用' },
  { id: 'stock', label: '库存 / 数量' },
  { id: 'status', label: '状态（上架 / 下架 / 归档）' },
  { id: 'flavor', label: '口味（适用于补剂类商品）' },
  { id: 'level', label: '适用阶段（初级 / 中级 / 高级）' },
];

const allDataFieldOptions = computed(() => {
  const ids = new Set(dataFieldOptions.map((f) => f.id));
  const fromAi = aiSuggestedFields.value.filter((f) => !ids.has(f.id)).map((f) => ({ id: f.id, label: f.label }));
  return [...dataFieldOptions, ...fromAi];
});

const featureOptions = [
  {
    id: 'product_manage',
    label: '商品 / 内容管理',
    hint: '增删改查、批量操作',
  },
  {
    id: 'order_manage',
    label: '订单 / 任务管理',
    hint: '状态流转与历史记录',
  },
  {
    id: 'dashboard',
    label: '数据看板',
    hint: '关键指标与图表',
  },
  {
    id: 'member',
    label: '会员 / 用户体系',
    hint: '适合复购类产品',
  },
  {
    id: 'recommendation',
    label: '智能推荐 / 搭配',
    hint: '提升客单价或使用频次',
  },
];

const uiStyles = uiTemplates;

watch(
  currentStep,
  (step) => {
    if (step === 1 && selectedTemplate.value) {
      fetchNameSuggestions();
    }
  },
  { immediate: true }
);

async function goToSpec() {
  if (!wizardState.appName.trim()) {
    ElMessage.warning('请先为你的应用起一个名字');
    return;
  }
  loadingSpec.value = true;
  try {
    await buildSpec();
    currentStep.value = 2;
  } finally {
    loadingSpec.value = false;
  }
}

const refineDialogVisible = ref(false);
const refineIntent = ref('');
const refineLoading = ref(false);
const refineTargetTab = ref<'overview' | 'functions' | 'design' | 'tech' | 'prompt'>('overview');

function openRefineDialog(tab: typeof refineTargetTab.value) {
  refineTargetTab.value = tab;
  refineIntent.value = '';
  refineDialogVisible.value = true;
}

async function confirmRefine() {
  const key = refineTargetTab.value;
  const currentText = spec[key];
  if (currentText == null) return;
  refineLoading.value = true;
  try {
    const res = await wizardApi.refineSection(key, currentText, refineIntent.value || '更清晰、专业');
    const refined = res.data?.data?.refinedText;
    if (refined != null) spec[key] = refined;
    ElMessage.success('该段落已由 AI 改写');
    refineDialogVisible.value = false;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '改写失败，请重试');
  } finally {
    refineLoading.value = false;
  }
}

// ========= 规格文档生成 =========

const spec = reactive({
  overview: '',
  functions: '',
  design: '',
  tech: '',
  prompt: '',
});

const specTabs = [
  { id: 'overview', label: '应用概览' },
  { id: 'functions', label: '功能规格' },
  { id: 'design', label: 'UI / UX 设计' },
  { id: 'tech', label: '技术约束' },
  { id: 'prompt', label: 'AI 提示词' },
] as const;

const activeSpecTab = ref<'overview' | 'functions' | 'design' | 'tech' | 'prompt'>('overview');

const selectedFeatureLabels = computed(() =>
  mergedFeatureOptions.value
    .filter((f) => wizardState.features.includes(f.id))
    .map((f) => f.label),
);

const currentUiStyleLabel = computed(() => {
  const style = uiStyles.find((s) => s.id === wizardState.uiStyle);
  return style ? style.title.replace('🎨 ', '') : '现代极简';
});

/** 完善度评分：应用名称 25%、一句话介绍 25%、使用场景 25%、主要痛点 25% */
const completeness = computed(() => {
  let score = 0;
  if (wizardState.appName.trim()) score += 25;
  if (wizardState.oneLiner.trim()) score += 25;
  if (wizardState.scene.trim()) score += 25;
  if (wizardState.pain.trim()) score += 25;
  return Math.min(100, score);
});

/** 低于 60% 时展示「还缺少 X 处关键信息」 */
const completenessMissingHint = computed(() => {
  if (completeness.value >= 60) return null;
  const missing: string[] = [];
  if (!wizardState.appName.trim()) missing.push('应用名称');
  if (!wizardState.oneLiner.trim()) missing.push('一句话介绍');
  if (!wizardState.scene.trim()) missing.push('使用场景');
  if (!wizardState.pain.trim()) missing.push('主要痛点');
  return missing.length ? `还缺少 ${missing.length} 处关键信息：${missing.join('、')}` : null;
});

function mainColor() {
  switch (wizardState.uiStyle) {
    case 'warm-friendly':
      return '#7B61FF';
    case 'professional-data':
      return '#1A1A1A';
    case 'apple-style':
      return '#007AFF';
    default:
      return '#4A90E2';
  }
}

function secondaryColor() {
  switch (wizardState.uiStyle) {
    case 'warm-friendly':
      return '#FFF9F0';
    case 'professional-data':
      return '#2D2D2D';
    case 'apple-style':
      return '#F5F5F7';
    default:
      return '#F5F7FA';
  }
}

async function buildSpec() {
  const tpl = selectedTemplate.value;
  const allFields = [...dataFieldOptions, ...aiSuggestedFields.value.map((f) => ({ id: f.id, label: f.label }))];
  const dataFieldLabels = wizardState.dataFields
    .map((id) => ({ id, label: allFields.find((x) => x.id === id)?.label ?? id }))
    .filter((x) => x.label);

  try {
    const platforms = wizardState.miniProgram
      ? ['web', 'miniprogram']
      : wizardState.platforms;
    const res = await wizardApi.generateSpec({
      wizardState: {
        appName: wizardState.appName,
        oneLiner: wizardState.oneLiner,
        scene: wizardState.scene,
        pain: wizardState.pain,
        dataFields: wizardState.dataFields,
        features: wizardState.features,
        uiStyle: wizardState.uiStyle,
        platforms,
        dataScale: wizardState.dataScale,
        permission: wizardState.permission,
      },
      appTemplateId: selectedAppTemplateId.value ?? tpl?.id ?? null,
      appTemplateTitle: tpl?.name ?? '自定义应用',
      uiTemplateId: wizardState.uiStyle,
      dataFieldLabels,
      featureLabels: selectedFeatureLabels.value,
    });
    const data = res.data?.data;
    if (data) {
      spec.overview = data.overview;
      spec.functions = data.functions;
      spec.design = data.design;
      spec.tech = data.tech;
      spec.prompt = data.prompt;
      return;
    }
  } catch (_) {
    // 降级为前端拼接
  }

  const uiLabel = currentUiStyleLabel.value;

  spec.overview = [
    '# 应用概览',
    '',
    '## 基本信息',
    `- 应用名称：${wizardState.appName}`,
    `- 应用类型：${tpl?.name ?? '自定义应用'}`,
    `- 一句话介绍：${wizardState.oneLiner || '（待补充）'}`,
    `- 模板：${tpl ? `${tpl.name}（${categoryLabel(tpl.categoryId)}）` : '自定义'}`,
    `- 推荐技术栈：Vue 3 + Node.js + SQLite/PostgreSQL`,
    '',
    '## 核心目标',
    wizardState.scene ? `- 使用场景：${wizardState.scene}` : '- 使用场景：待补充',
    wizardState.pain ? `- 解决痛点：${wizardState.pain}` : '- 解决痛点：待补充',
    '',
    '## 功能模块一览',
    selectedFeatureLabels.value.length
      ? selectedFeatureLabels.value.map((f) => `- ${f}`).join('\n')
      : '- （尚未选择功能模块）',
  ].join('\n');

  const fieldsLine = wizardState.dataFields
    .map((f) => {
      const meta = allFields.find((x) => x.id === f);
      return `- ${meta?.label ?? f}`;
    })
    .join('\n');

  const featuresDetail = selectedFeatureLabels.value
    .map((f, idx) => `### ${idx + 1}. ${f}\n- 描述：围绕该模块设计典型的用户操作流程与状态流转。`)
    .join('\n\n');

  spec.functions = [
    '# 功能规格',
    '',
    '## 1. 核心数据模型',
    '### 主实体（例如：商品 / 任务 / 条目）',
    fieldsLine || '- 暂未定义字段，请在 Wizard 中补充数据模型。',
    '',
    '## 2. 功能模块详情',
    featuresDetail || '- 基于上一步选择的功能模块，在此处由 AI 进一步展开实现细节。',
  ].join('\n');

  spec.design = [
    '# UI / UX 设计规格',
    '',
    '## 设计风格',
    `- 风格：${uiLabel}`,
    `- 主色：${mainColor()}`,
    `- 辅色：${secondaryColor()}`,
    '- 字体：系统字体，-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    `- 圆角：${wizardState.uiStyle === 'warm-friendly' ? '12px' : '8px'}`,
    '- 间距系统：8px 基准（8 / 16 / 24 / 32 ...）',
    '',
    '## 布局结构',
    '- 顶部导航：显示应用名称与主导航入口',
    '- 左侧栏：功能模块导航（可折叠）',
    '- 主内容区：卡片 + 表格 + 图表组合',
    '- 底部：版权信息与外部链接',
  ].join('\n');

  const hasMiniprogram = wizardState.miniProgram;
  spec.tech = [
    '# 技术约束',
    '',
    '## 开发栈',
    '- 前端：Vue 3 + Vite + Element Plus',
    wizardState.platforms.includes('mobile')
      ? '- 移动端：优先支持移动端布局，推荐使用响应式栅格与断点设计'
      : '- 响应式：桌面优先，兼顾移动端体验',
    ...(hasMiniprogram ? ['- 小程序：需支持微信/支付宝等小程序端（多端构建或独立小程序项目）'] : []),
    `- 后端：Node.js + Express`,
    wizardState.dataScale === 'large'
      ? '- 数据库：PostgreSQL，注意读写分离与索引优化'
      : '- 数据库：SQLite / PostgreSQL（中小规模优先 SQLite）',
    '- 容器化：须在应用根目录提供 Dockerfile，支持 docker build / tag / push 至 ACR。',
    '',
    '## 性能 & 安全',
    '- 列表加载：100 条记录内接口响应 < 2s',
    '- 权限控制：基于角色的接口访问控制',
    '- 日志：记录关键操作与错误堆栈，便于排查',
  ].join('\n');

  spec.prompt = [
    '# AI Coding 提示词（供 Forge / 代理模型使用）',
    '',
    '你是一个资深全栈工程师，请基于以下需求设计并实现一个完整 Web 应用：',
    '',
    '## 应用上下文',
    `- 名称：${wizardState.appName}`,
    `- 类型：${tpl?.name ?? '自定义应用'}`,
    `- 一句话介绍：${wizardState.oneLiner || '（待补充）'}`,
    wizardState.scene ? `- 使用场景：${wizardState.scene}` : '',
    wizardState.pain ? `- 解决痛点：${wizardState.pain}` : '',
    '',
    '## 功能需求',
    selectedFeatureLabels.value.length
      ? selectedFeatureLabels.value.map((f) => `- ${f}`).join('\n')
      : '- 请根据场景与痛点推断合理的 MVP 功能。',
    '',
    '## UI / UX 要求',
    `- 设计风格：${uiLabel}`,
    `- 主色调：${mainColor()}`,
    '- 使用 Element Plus 组件库统一界面交互与样式。',
    '',
    '## 技术约束',
    '- 前端：Vue 3 + Vite + TypeScript + Element Plus',
    `- 后端：Node.js + Express + ${
      wizardState.dataScale === 'large' ? 'PostgreSQL' : 'SQLite / PostgreSQL'
    }`,
    '- 身份认证：JWT / Session 中至少选一种，并封装统一中间件。',
    '',
    '## Docker 与容器化部署（必选）',
    '- 必须在应用**根目录**提供 **Dockerfile**，使在项目根目录执行 `docker build -t <镜像名>:latest .` 即可构建出可运行镜像。',
    '- 镜像需支持后续：`docker tag <镜像名>:latest registry.cn-shanghai.aliyuncs.com/<命名空间>/<镜像名>:latest` 与 `docker push` 至阿里云 ACR。',
    '- 建议提供 **.dockerignore**，排除 node_modules、.git、日志等，以减小构建上下文、加快构建。',
    '',
    '## 输出格式',
    '请按以下结构输出代码：',
    '1. 数据库模型与迁移设计',
    '2. 后端 API 设计与实现',
    '3. 前端页面与组件结构',
    '4. 关键业务流程与状态流转',
    '5. 基本部署与运行说明',
    '6. Dockerfile（必选）及可选的 .dockerignore，支持在根目录执行 docker build，并支持 tag/push 至阿里云 ACR。',
  ].join('\n');
}

// ========= 提交到后端 =========

const submitting = ref(false);

async function handleSubmitRequirement() {
  if (submitting.value) return;
  submitting.value = true;
  try {
    const { data } = await requirementApi.create({
      title: wizardState.appName,
      description: spec.overview,
      category: selectedTemplate.value ? categoryLabel(selectedTemplate.value.categoryId) : '其他',
      contact_info: '',
      scene: wizardState.scene,
      pain: wizardState.pain,
      features: selectedFeatureLabels.value.join('、'),
      extra: wizardState.oneLiner,
      app_template_id: selectedAppTemplateId.value,
      prompt_template_ids: null,
    });
    if (data.moderationRejected) {
      ElMessage.warning({
        message: `未通过内容审核${data.moderationRejectReason ? '：' + data.moderationRejectReason : ''}，请修改后重试。`,
        duration: 6000,
      });
    } else {
      ElMessage.success('提交成功！你的需求已进入投票广场。原型正在生成，稍后会在卡片上显示。');
      router.push('/');
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '提交失败，请稍后再试');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.wizard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.wizard-hero {
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-accent-500) 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-2xl);
  color: #fff;
  box-shadow: var(--shadow-lg);
  margin-bottom: var(--space-2xl);
}

.wizard-hero-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 var(--space-sm);
}

.wizard-hero-subtitle {
  margin: 0;
  opacity: 0.9;
}

.wizard-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
  margin-top: var(--space-xl);
}

.wizard-step-card {
  background: rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all var(--transition-base);
}

.wizard-step-card.active {
  background: rgba(255, 255, 255, 0.22);
  transform: translateY(-2px);
}

.wizard-step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.wizard-step-title {
  margin: 0 0 var(--space-xs);
  font-size: 16px;
}

.wizard-step-desc {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.wizard-layout {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-2xl);
  align-items: flex-start;
}

.wizard-main {
  min-width: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
}

.section-title i {
  color: var(--color-primary-500);
}

.section-subtitle {
  margin: 0 0 var(--space-lg);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.template-market {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

.template-categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.category-tag {
  border-radius: 999px;
  border: 1px solid var(--color-border);
  padding: 4px 12px;
  font-size: 13px;
  background: var(--color-surface-light);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-tag.active {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}

.template-tag-filters {
  margin-bottom: var(--space-lg);
  padding: var(--space-md);
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
}

.template-tag-filters .filter-row {
  margin-bottom: var(--space-sm);
}

.template-tag-filters .filter-row:last-of-type {
  margin-bottom: 0;
}

.template-tag-filters .filter-label {
  display: inline-block;
  min-width: 72px;
  font-size: 12px;
  color: var(--color-text-secondary);
  vertical-align: top;
  margin-right: var(--space-xs);
}

.template-tag-filters .filter-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.template-tag-filters .filter-tag {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag-filters .filter-tag:hover {
  border-color: var(--color-primary-500);
  color: var(--color-primary-500);
}

.template-tag-filters .filter-tag.active {
  background: var(--color-primary-500);
  color: #fff;
  border-color: var(--color-primary-500);
}

.template-tag-filters .filter-actions {
  margin-top: var(--space-sm);
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}

.template-tag-filters .filter-clear {
  font-size: 12px;
  color: var(--color-primary-500);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.template-ai-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-md);
  align-items: center;
  margin-bottom: var(--space-lg);
}

.ai-recommend-btn {
  white-space: nowrap;
}

.ai-recommend-icon {
  margin-right: 4px;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.template-card {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.template-card.selected {
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 1px var(--color-primary-500);
}

.template-preview {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.template-preview-text {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.template-info {
  padding: var(--space-md) var(--space-lg) var(--space-md);
}

.template-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xs);
}

.template-title {
  font-size: 16px;
  font-weight: 600;
}

.template-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-surface-dark);
  color: var(--color-text-primary);
}

.template-subtitle {
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin: 0 0 2px;
}

.template-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.template-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-surface-dark);
  color: var(--color-text-secondary);
}

.template-tag-feature {
  background: rgba(82, 196, 26, 0.12);
  color: var(--color-success-600, #389e0d);
}

.template-empty {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.wizard-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.clarification-engine {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

.clarification-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.ai-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-accent-500) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
}

.clarification-block {
  margin-bottom: var(--space-xl);
}

.ai-message {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-md);
  font-size: 14px;
}

.user-response {
  padding-left: 0;
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.feature-hint {
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.ai-suggestion {
  margin-top: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--color-success);
  background: rgba(82, 196, 26, 0.05);
  font-size: 13px;
}

.suggestion-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  margin-bottom: 4px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-sm);
  margin-top: 6px;
}

.option-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  padding: 8px 10px;
  background: var(--color-surface-light);
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.option-card.selected {
  border-color: var(--color-primary-500);
  background: rgba(74, 144, 226, 0.08);
}

.option-card h4 {
  margin: 0 0 2px;
  font-size: 13px;
}

.option-card p {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.spec-section {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

.completeness-meter-wrap {
  margin-bottom: var(--space-md);
}

.completeness-missing-hint {
  margin: 0 0 var(--space-sm);
  font-size: 13px;
  color: var(--color-warning, #e6a23c);
}

.completeness-meter {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 13px;
}

.meter-bar {
  flex: 1;
  height: 8px;
  background: var(--color-surface-dark);
  border-radius: 999px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500) 0%, var(--color-accent-500) 100%);
}

.spec-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin: var(--space-md) 0;
  gap: var(--space-sm);
}

.spec-tab {
  border: none;
  background: transparent;
  padding: 6px 10px;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
}

.spec-tab.active {
  border-bottom-color: var(--color-primary-500);
  color: var(--color-primary-500);
  font-weight: 600;
}

.spec-content-wrap {
  position: relative;
}

.spec-content {
  background: var(--color-surface-light);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  min-height: 180px;
  position: relative;
}

.spec-content .el-button,
.spec-content .vk-base-button {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
}

.spec-content pre {
  margin: 0;
  padding-right: 100px;
  white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 12px;
}

.refine-hint {
  margin: 0 0 var(--space-md);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.refine-input {
  margin-bottom: var(--space-md);
}

.suggestion-field {
  margin: 4px 0;
  font-size: 13px;
}

.ai-tag {
  margin-left: 6px;
  vertical-align: middle;
}

.wizard-aside {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.aside-card {
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.aside-title {
  margin: 0 0 var(--space-sm);
  font-size: 14px;
  font-weight: 600;
}

.aside-app-name {
  margin: 0 0 4px;
  font-weight: 600;
}

.aside-one-liner {
  margin: 0 0 var(--space-sm);
  font-size: 13px;
  color: var(--color-text-secondary);
}

.aside-summary-list {
  padding-left: 1em;
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.mockup-box {
  position: relative;
  border-radius: 16px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  padding: 8px;
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  gap: 6px;
  margin-bottom: 6px;
}

.mockup-header {
  grid-column: 1 / -1;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.02));
}

.mockup-sidebar {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.04);
}

.mockup-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mockup-card {
  height: 18px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.03);
}

.mockup-note {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.mockup-box[data-style='professional-data'] {
  background: #101010;
  border-color: #333;
}

.mockup-box[data-style='professional-data'] .mockup-header,
.mockup-box[data-style='professional-data'] .mockup-sidebar,
.mockup-box[data-style='professional-data'] .mockup-card {
  background: rgba(255, 255, 255, 0.09);
}

@media (max-width: 960px) {
  .wizard-layout {
    grid-template-columns: 1fr;
  }

  .wizard-steps {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .wizard-page {
    padding: var(--space-md);
  }

  .template-ai-intro {
    grid-template-columns: 1fr;
  }

  .wizard-actions {
    flex-direction: column-reverse;
  }

  .wizard-actions .el-button,
  .wizard-actions .vk-base-button {
    width: 100%;
  }
}
</style>

