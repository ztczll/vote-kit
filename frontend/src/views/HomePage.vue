<template>
  <div class="home-page">
    <!-- Hero Section -->
    <div class="hero-section animate-slide-up">
      <div>
        <h1 class="hero-title">惬兔工坊：非技术人也能拥有自己应用源码</h1>
        <p class="hero-subtitle">
          用 AI 向导或行业模板 10 分钟生成可点击原型，先在社区验证想法，确认可行后一次付费拿走完整源码（含 Dockerfile），
          既可以自己部署，也可以交给我们托管运维。
        </p>
        <div class="hero-actions">
          <BaseButton variant="primary" size="large" @click="$router.push('/submit')">
            用向导生成第一个原型
          </BaseButton>
          <BaseButton variant="ghost" size="large" @click="$router.push('/templates')">
            浏览行业模板
          </BaseButton>
          <BaseButton variant="ghost" size="large" @click="$router.push('/pricing')">
            查看代码生成与托管套餐
          </BaseButton>
        </div>
        <p class="hero-hint">
          原型免费 / 低价试错 → 社区投票评论验证 → 一次付费生成源码并获得所有权 → 自行部署或订阅托管服务。
        </p>
      </div>
      <div class="hero-visual">
        <img
          src="/images/illustrations/hero/homepage-hero.webp"
          srcset="/images/illustrations/hero/homepage-hero@2x.webp 2x"
          alt="惬兔工坊产品示意"
          class="hero-image"
        />
      </div>
    </div>

    <!-- 动态/原型活动区：瀑布墙 + 时间线 -->
    <section class="activity-section animate-fade-in">
      <div class="activity-layout">
        <!-- 左侧：原型轮播 -->
        <div class="activity-gallery">
          <div class="activity-gallery-header">
            <h2 class="section-title">看看大家正在做哪些原型</h2>
            <p class="gallery-subtitle">
              这些都是用惬兔工坊生成并公开到社区的真实原型，你也可以在几分钟内做出一个。
            </p>
          </div>
          <el-carousel
            v-if="showcaseList.length > 0"
            :interval="5000"
            arrow="hover"
            height="380px"
            class="gallery-carousel"
          >
            <el-carousel-item v-for="(item, index) in showcaseList" :key="item.id || index">
              <div class="gallery-slide gallery-slide--single">
                <div class="gallery-card">
                  <div class="gallery-thumb">
                    <img
                      :src="getPrototypeImageUrl(item.prototype_screenshot_url) || '/images/illustrations/empty-states/no-data.webp'"
                      :alt="item.title || item.name || '应用原型预览'"
                    />
                    <div class="gallery-overlay">
                      <span class="gallery-tag">
                        {{ item.status === '已上线' ? '已上线原型' : '热门原型' }}
                      </span>
                      <p class="gallery-title">
                        {{ item.title || item.name || '未命名原型' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </el-carousel-item>
          </el-carousel>
          <div v-else class="gallery-empty">
            <p>暂无原型展示，去提交第一个想法吧</p>
          </div>
        </div>

        <!-- 右侧：活动时间线 -->
        <div class="activity-timeline">
          <h3 class="timeline-title">实时活动流</h3>
          <p class="timeline-subtitle">最近的提交、投票与评论，展示这里每天发生的变化。</p>
          <div class="timeline">
            <div
              v-for="(activity, index) in recentActivities.slice(0, 8)"
              :key="index"
              class="timeline-item"
              :style="{ animationDelay: `${index * 0.05}s` }"
            >
              <div class="timeline-marker">
                <span class="timeline-dot" />
                <span class="timeline-line" />
              </div>
              <div class="timeline-content">
                <p class="timeline-text">
                  <span class="timeline-user">{{ activity.username }}</span>
                  <span class="timeline-action">
                    {{
                      activity.type === 'submit'
                        ? '发布了新原型'
                        : activity.type === 'vote'
                          ? '为原型投了一票'
                          : activity.type === 'comment'
                            ? '发表了评论'
                            : '上线了一个应用'
                    }}
                  </span>
                  <span class="timeline-target">「{{ activity.target }}」</span>
                </p>
                <p class="timeline-time">{{ activity.time }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section (compact bar below hero) -->
    <div class="stats-section stats-section-compact animate-fade-in">
      <StatCard 
        :value="stats.totalRequirements" 
        label="已经被具象成原型的想法"
        icon-bg="linear-gradient(135deg, #0A1E32 0%, #1A2E42 100%)"
      >
        <template #icon>💡</template>
      </StatCard>
      
      <StatCard 
        :value="stats.activeVotingCount" 
        label="正在社区验证中的原型"
        icon-bg="linear-gradient(135deg, #FF6B35 0%, #E55525 100%)"
      >
        <template #icon>📊</template>
      </StatCard>
      
      <StatCard 
        :value="resolutionRateDisplay" 
        label="本周从原型变成源码的比例"
        icon-bg="linear-gradient(135deg, #34C759 0%, #28A745 100%)"
      >
        <template #icon>✅</template>
      </StatCard>
    </div>

    <!-- 核心价值主张：浅色区块 + 四宫格功能卡 -->
    <section class="value-section animate-slide-up">
      <div class="value-section-inner">
        <h2 class="section-title value-section-title">惬兔工坊帮你用更低成本拥有应用源码</h2>
        <div class="value-grid">
          <div class="value-card">
            <div class="value-card-icon value-card-icon--1">💡</div>
            <h3>低成本试错</h3>
            <p>用自然语言或模板生成可点击原型，免费 / 低价就能拿给真实用户看，不再为还没验证的想法砸大钱做开发。</p>
          </div>
          <div class="value-card">
            <div class="value-card-icon value-card-icon--2">📦</div>
            <h3>一次付费拿走源码所有权</h3>
            <p>确认想法靠谱后，一次性生成完整前端源码（含 Dockerfile），之后如何部署、怎么改、给谁看，完全由你决定。</p>
          </div>
          <div class="value-card">
            <div class="value-card-icon value-card-icon--3">👍</div>
            <h3>社区投票与评论验证想法</h3>
            <p>把原型公开到社区，收集投票和评论，帮你判断「谁真的愿意用 / 愿意付费」，而不只是朋友圈里的点赞。</p>
          </div>
          <div class="value-card">
            <div class="value-card-icon value-card-icon--4">🛡️</div>
            <h3>可选托管运维服务</h3>
            <p>如果你不想自己维护服务器，可以直接订阅托管：从基础版到企业版，涵盖部署、监控、备份与日常维护。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 适合谁用：浅色区块 + 四宫格角色卡 -->
    <section class="persona-section animate-fade-in">
      <div class="persona-section-inner">
        <h2 class="section-title persona-section-title">谁适合用惬兔工坊？</h2>
        <div class="persona-grid">
          <div class="persona-card">
            <div class="persona-card-icon persona-card-icon--1">🏪</div>
            <h3>小店主 / 个体户</h3>
            <p>想要点餐、会员、电商等专属系统，但预算不高、也不懂技术，希望「花一次钱，长期可用又能托管」。</p>
          </div>
          <div class="persona-card">
            <div class="persona-card-icon persona-card-icon--2">🚀</div>
            <h3>创业者 / 产品经理</h3>
            <p>需要尽快把想法变成可点可看的原型，拿给用户 / 投资人验证，比写 PRD 和画原型高效太多。</p>
          </div>
          <div class="persona-card">
            <div class="persona-card-icon persona-card-icon--3">🎨</div>
            <h3>设计师 / 自由职业者</h3>
            <p>让客户先生成粗糙原型，再在此基础上精修设计，减少反复沟通与「说不清需求」的时间损耗。</p>
          </div>
          <div class="persona-card">
            <div class="persona-card-icon persona-card-icon--4">📚</div>
            <h3>教师 / 学生 / 企业非技术部门</h3>
            <p>需要为课程作业、内部项目或营销活动快速做一个「能点」「能演示」的东西，却没有前端开发能力。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 从想法到源码的 4 个步骤 -->
    <section class="how-section animate-slide-up">
      <div class="how-item">
        <div class="how-illus">
          <img src="/images/illustrations/features/submit-demand.webp" alt="生成原型" />
        </div>
        <div class="how-index">1</div>
        <div class="how-text">
          <h3 class="how-title">用 AI 向导或行业模板生成原型</h3>
          <p class="how-desc">用一句话描述场景，也可以选择「小店点餐」「个人主页」等行业模板，惬兔工坊会帮你生成可点击原型与需求说明。</p>
        </div>
      </div>
      <div class="how-item">
        <div class="how-illus">
          <img src="/images/illustrations/features/voting-system.webp" alt="社区验证" />
        </div>
        <div class="how-index">2</div>
        <div class="how-text">
          <h3 class="how-title">公开到社区，收集投票与评论</h3>
          <p class="how-desc">把原型分享给目标用户、同事或社群，通过投票和评论快速看出「大家真正在意什么」。</p>
        </div>
      </div>
      <div class="how-item">
        <div class="how-illus">
          <img src="/images/illustrations/features/ai-development.webp" alt="生成源码" />
        </div>
        <div class="how-index">3</div>
        <div class="how-text">
          <h3 class="how-title">一次性购买完整源码（含 Dockerfile）</h3>
          <p class="how-desc">确认要做之后，再一次付费生成完整前端源码，你拥有全部代码所有权，可自由修改、商用或交给外包团队继续开发。</p>
        </div>
      </div>
      <div class="how-item">
        <div class="how-illus">
          <img src="/images/illustrations/features/submit-demand.webp" alt="部署与托管" />
        </div>
        <div class="how-index">4</div>
        <div class="how-text">
          <h3 class="how-title">自己部署，或交给惬兔托管</h3>
          <p class="how-desc">你可以把源码部署在自己的服务器上，也可以选择惬兔工坊的托管方案，让我们来负责部署、监控和日常维护。</p>
        </div>
      </div>
    </section>

    <!-- Decorative divider -->
    <div class="section-divider animate-fade-in">
      <svg class="divider-svg" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="2" rx="1" ry="1" />
      </svg>
    </div>

    <!-- 商业模式 & 套餐概览 -->
    <section class="model-section animate-slide-up">
      <h2 class="section-title">按阶段付费：先验证，再开发，再运维</h2>
      <div class="model-cards">
        <div class="model-card">
          <h3>原型生成</h3>
          <p>免费或极低价，覆盖 AI 向导与常见行业模板，让你可以无限次地生成和调整想法原型。</p>
        </div>
        <div class="model-card">
          <h3>代码生成（一次性）</h3>
          <p>根据复杂度按档收费（如 299 – 999 元），生成可部署的完整源码和 Dockerfile，你拥有所有权。</p>
        </div>
        <div class="model-card">
          <h3>托管订阅（可选）</h3>
          <p>从 99 元 / 月的基础版到企业版，覆盖部署、监控、备份和安全防护，省去自建团队的人力成本。</p>
        </div>
      </div>
      <div class="model-actions">
        <BaseButton variant="primary" size="large" @click="$router.push('/pricing')">
          查看详细套餐与示例报价
        </BaseButton>
      </div>
    </section>

    <!-- Decorative divider -->
    <div class="section-divider animate-fade-in">
      <svg class="divider-svg" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="0" width="100" height="2" rx="1" ry="1" />
      </svg>
    </div>

    <!-- 联系我们：反馈入口 + 微信入群二维码 -->
    <ContactBlock />

    <!-- 引导快速开始 -->
    <div class="filter-section animate-slide-up">
      <div class="square-cta-card">
        <div class="square-cta-text">
          <h3>现在就把一个想法变成可点的原型</h3>
          <p>不管你是小店主、创业者还是学生，只要能用话讲清楚场景，惬兔工坊都能帮你生成一个可以拿去展示和验证的原型。</p>
        </div>
        <div class="square-cta-actions">
          <el-button type="primary" size="large" @click="$router.push('/submit')">
            开始生成我的第一个原型
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { statsApi } from '@/api/stats';
import { requirementApi } from '@/api/requirement';
import StatCard from '@/components/StatCard.vue';
import BaseButton from '@/components/BaseButton.vue';
import ContactBlock from '@/components/ContactBlock.vue';
import { getPrototypeImageUrl } from '@/utils/prototypeImage';

// 首页统计数据
const stats = ref({
  activeVotingCount: 0,
  totalRequirements: 0,
  weeklyResolutionRate: 0,
  categoryDistribution: [] as { label: string; value: number; percentage: number }[],
  recentActivities: [] as {
    type: 'vote' | 'submit' | 'comment' | 'launched';
    username: string;
    target: string;
    time: string;
    requirement_id?: string;
  }[],
});

// 用于展示瀑布墙的原型列表
const showcaseItems = ref<any[]>([]);

const recentActivities = computed(() => stats.value.recentActivities ?? []);

/** 轮播用：每页一张，取前若干条 */
const showcaseList = computed(() => showcaseItems.value.slice(0, 9));

const resolutionRateDisplay = computed(() => {
  const rate = stats.value.weeklyResolutionRate;
  if (rate === 0 && stats.value.totalRequirements === 0) return '-';
  return `${rate}%`;
});

onMounted(() => {
  loadStats();
  loadShowcase();
});

async function loadStats() {
  try {
    const { data } = await statsApi.getStats();
    stats.value = {
      activeVotingCount: data.activeVotingCount,
      totalRequirements: data.totalRequirements,
      weeklyResolutionRate: data.weeklyResolutionRate,
      categoryDistribution: data.categoryDistribution ?? [],
      recentActivities: data.recentActivities ?? [],
    };
  } catch {
    // 保持默认占位数据
  }
}

async function loadShowcase() {
  try {
    const { data } = await requirementApi.getList({ status: '已上线', limit: 8 });
    const list = data.requirements ?? [];
    // 若无「已上线」则用「投票中」填充瀑布墙，避免首页为空
    if (list.length === 0) {
      const { data: fallback } = await requirementApi.getList({ status: '投票中', limit: 8 });
      showcaseItems.value = fallback?.requirements ?? [];
    } else {
      showcaseItems.value = list;
    }
  } catch {
    showcaseItems.value = [];
  }
}
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  padding: var(--space-2xl) var(--space-lg) var(--space-3xl);
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.stats-section-compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  padding: var(--space-lg) var(--space-xl);
  border-radius: var(--radius-xl);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-gray-200);
}

.stats-section-compact :deep(.stat-card) {
  padding: 20px;
  background: var(--color-bg-primary);
  border: none;
}

.stats-section-compact :deep(.stat-value) {
  font-size: 24px;
  color: #0f172a;
}

.stats-section-compact :deep(.stat-label) {
  font-size: 13px;
  color: #64748b;
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: var(--space-2xl);
  align-items: center;
  padding: var(--space-2xl);
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  margin-bottom: var(--space-2xl);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-gray-200);
}

.hero-visual {
  order: 2;
}

.hero-image {
  max-width: 100%;
  width: 100%;
  max-height: 320px;
  object-fit: contain;
}

.hero-title {
  font-size: 42px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: var(--space-md);
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.hero-actions {
  margin-top: var(--space-xl);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
}

.hero-hint {
  margin-top: var(--space-md);
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.activity-section {
  margin-bottom: var(--space-2xl);
  padding: var(--space-xl) var(--space-lg);
  border-radius: var(--radius-2xl);
  background: radial-gradient(circle at top left, rgba(25, 136, 235, 0.06), transparent 60%),
    radial-gradient(circle at bottom right, rgba(15, 23, 42, 0.04), transparent 55%),
    var(--color-bg-primary);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.activity-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: var(--space-xl);
  align-items: start;
}

.activity-gallery-header {
  margin-bottom: var(--space-md);
}

.gallery-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.gallery-carousel {
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.gallery-carousel :deep(.el-carousel__container) {
  height: 380px;
}

.gallery-carousel :deep(.el-carousel__arrow) {
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
}

.gallery-carousel :deep(.el-carousel__arrow:hover) {
  background: rgba(25, 136, 235, 0.85);
}

.gallery-carousel :deep(.el-carousel__indicators--horizontal) {
  bottom: 12px;
}

.gallery-carousel :deep(.el-carousel__indicator--horizontal .el-carousel__button) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.8);
}

.gallery-carousel :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background: var(--color-primary-500);
  width: 24px;
  border-radius: 4px;
}

.gallery-slide {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-md);
  height: 100%;
  padding: 0 4px;
}

.gallery-slide--single {
  grid-template-columns: 1fr;
  padding: 0;
  align-items: stretch;
  justify-items: stretch;
}

.gallery-slide--single .gallery-card {
  height: 100%;
}

.gallery-slide--single .gallery-thumb img {
  height: 340px;
  object-fit: cover;
}

.gallery-empty {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.03);
  border-radius: var(--radius-xl);
  color: var(--color-text-tertiary);
}

.gallery-card {
  position: relative;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transform-origin: center;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.gallery-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-xl);
}

.gallery-thumb img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15, 23, 42, 0.72), transparent 55%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--space-md);
  gap: var(--space-xs);
}

.gallery-tag {
  align-self: flex-start;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: var(--radius-full);
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid rgba(252, 211, 77, 0.6);
}

.gallery-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #f9fafb;
}

.activity-timeline {
  background: rgba(15, 23, 42, 0.92);
  border-radius: var(--radius-2xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(148, 163, 184, 0.5);
  color: #e5e7eb;
}

.timeline-title {
  margin: 0 0 var(--space-xs);
  font-size: 18px;
  font-weight: 600;
}

.timeline-subtitle {
  margin: 0 0 var(--space-md);
  font-size: 13px;
  color: #9ca3af;
}

.timeline {
  position: relative;
  padding-left: 18px;
}

.timeline-item {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
  opacity: 0;
  animation: fadeInUp 0.35s var(--transition-base) forwards;
}

.timeline-marker {
  position: relative;
  width: 12px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.3);
}

.timeline-line {
  position: absolute;
  top: 10px;
  left: 3.5px;
  width: 1px;
  height: calc(100% - 10px);
  background: linear-gradient(to bottom, rgba(148, 163, 184, 0.8), transparent);
}

.timeline-content {
  flex: 1;
}

.timeline-text {
  margin: 0 0 2px;
  font-size: 13px;
}

.timeline-user {
  font-weight: 600;
  color: #e5e7eb;
}

.timeline-action {
  margin: 0 4px;
  color: #cbd5f5;
}

.timeline-target {
  color: #f97316;
}

.timeline-time {
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: var(--space-xl);
  color: var(--color-text-primary);
}

.value-section {
  margin-bottom: var(--space-2xl);
}

.value-section-inner {
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-2xl);
  background: linear-gradient(180deg, #f5f3ff 0%, #fafafa 50%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.value-section-title {
  text-align: center;
  color: #1e1b4b;
  margin-bottom: var(--space-xl);
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-lg);
}

.value-card {
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  text-align: center;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.value-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.value-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto var(--space-md);
  color: #fff;
}

.value-card-icon--1 { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }
.value-card-icon--2 { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); }
.value-card-icon--3 { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.value-card-icon--4 { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }

.value-card h3 {
  margin-bottom: var(--space-sm);
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}

.value-card p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.65;
}

.persona-section {
  margin-bottom: var(--space-2xl);
}

.persona-section-inner {
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-2xl);
  background: linear-gradient(180deg, #f0f9ff 0%, #f8fafc 50%, #ffffff 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.persona-section-title {
  text-align: center;
  color: #0c4a6e;
  margin-bottom: var(--space-xl);
}

.persona-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-lg);
}

.persona-card {
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  text-align: center;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.persona-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.persona-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin: 0 auto var(--space-md);
  color: #fff;
}

.persona-card-icon--1 { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
.persona-card-icon--2 { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
.persona-card-icon--3 { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); }
.persona-card-icon--4 { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); }

.persona-card h3 {
  margin-bottom: var(--space-sm);
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}

.persona-card p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.65;
}

.model-section {
  margin-bottom: var(--space-2xl);
}

.model-section .section-title {
  text-align: center;
  color: #0f172a;
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
}

.model-card {
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.model-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.model-card h3 {
  margin-bottom: var(--space-sm);
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.model-card p {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.7;
}

.model-actions {
  margin-top: var(--space-xl);
  text-align: center;
}

@media (max-width: 960px) {
  .home-page {
    padding-top: var(--space-xl);
  }

  .activity-section {
    padding: var(--space-lg) var(--space-md);
  }

  .activity-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .activity-timeline {
    margin-top: var(--space-lg);
  }

  .hero-section {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-visual {
    order: 1;
  }

  .value-grid,
  .persona-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .model-cards {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .value-grid,
  .persona-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.how-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-2xl);
}

.section-divider {
  text-align: center;
  margin-bottom: var(--space-2xl);
}

.divider-svg {
  width: 100%;
  height: 2px;
  display: block;
  opacity: 0.6;
  color: rgba(10, 30, 50, 0.35);
}

.divider-svg rect {
  fill: currentColor;
}

@media (prefers-color-scheme: dark) {
  .divider-svg {
    color: rgba(255, 255, 255, 0.22);
    opacity: 0.9;
  }
}

.how-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.15);
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.how-item:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.how-illus {
  width: 100%;
  margin-bottom: var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.how-illus img {
  width: 100%;
  max-height: 140px;
  object-fit: contain;
}

.how-text {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.how-index {
  position: absolute;
  top: -20px;
  right: -10px;
  font-size: 80px;
  font-weight: 800;
  color: rgba(10, 30, 50, 0.04);
}

.how-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-sm);
  color: #0f172a;
}

.how-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.7;
}

.filter-section {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-2xl);
}

.square-cta-card {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-2xl) var(--space-xl);
  border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
  border: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.square-cta-text h3 {
  margin: 0 0 var(--space-sm);
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.square-cta-text p {
  margin: 0;
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
}

.square-cta-actions .el-button {
  border-radius: 9999px;
  font-weight: 600;
}

.filter-section :deep(.el-radio-button__inner) {
  border-radius: var(--radius-lg);
  font-weight: 500;
  transition: all var(--transition-fast);
}

.content-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  align-items: start;
}

.main-content {
  min-width: 0;
}

.sidebar {
  position: sticky;
  top: calc(80px + var(--space-lg));
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.sidebar-item {
  width: 100%;
}

.sidebar-empty-state {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.sidebar-empty-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-tertiary);
  text-align: center;
}

.cards-container {
  margin-bottom: var(--space-2xl);
}

.cards-container .el-col {
  margin-bottom: var(--space-xl);
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: var(--space-lg) 0;
}

.detail-content {
  padding: var(--space-lg) 0;
}

.detail-header {
  display: flex;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.detail-description {
  background: var(--color-surface);
  padding: var(--space-xl);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2xl);
  line-height: 1.8;
  font-size: 16px;
  color: var(--color-text-primary);
}

.vote-section {
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.05) 0%, rgba(10, 30, 50, 0.05) 100%);
  padding: var(--space-2xl);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-2xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-lg);
}

.vote-stats {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
}

.vote-number {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-accent);
}

.vote-text {
  font-size: 20px;
  color: var(--color-text-tertiary);
}

.vote-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.vote-limit {
  color: var(--color-text-tertiary);
  font-size: 14px;
  font-weight: 500;
}

.comments-section {
  margin-top: var(--space-xl);
}

.no-comments {
  padding: var(--space-2xl) 0;
}

.comment-item {
  padding: var(--space-lg);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-md);
  transition: all var(--transition-fast);
}

.comment-item:hover {
  background: var(--color-surface-light);
  box-shadow: var(--shadow-sm);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
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
  gap: var(--space-xs);
}

.comment-time {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.comment-content {
  line-height: 1.6;
  color: var(--color-text-primary);
}

.comment-form {
  margin-top: var(--space-xl);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 28px;
  }
  
  .hero-subtitle {
    font-size: 16px;
  }
  
  .vote-section {
    flex-direction: column;
    text-align: center;
  }
  
  .stats-section,
  .stats-section-compact {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    flex-direction: column;
  }

  .how-section {
    grid-template-columns: 1fr;
  }
  
  .content-layout {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static;
  }
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
</style>
