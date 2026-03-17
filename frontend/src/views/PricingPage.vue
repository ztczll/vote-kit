<template>
  <div class="pricing-page">
    <div class="container">
      <header class="pricing-header">
        <h1>选择适合你的创意加速计划</h1>
        <p class="subtitle">
          从零散的想法到可运行的应用，我们提供清晰的路径。所有付费计划均含工单支持（8 小时内响应），且不限制 HTML 原型生成次数。
        </p>
      </header>

      <div class="pricing-grid">
        <div class="pricing-card free">
          <div class="card-header">
            <div class="plan-name">Free</div>
            <div class="price">¥0<span class="price-unit">/月</span></div>
            <p>体验 AI 生成的基本流程</p>
          </div>
          <div class="card-body">
            <ul class="feature-list">
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>5次</strong> 需求/原型生成</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>1次</strong> 完整代码生成（体验）</li>
              <li><el-icon class="icon-times"><Close /></el-icon> 普通生成队列</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 结果缓存 7 天</li>
              <li><el-icon class="icon-times"><Close /></el-icon> 专属支持</li>
            </ul>
          </div>
          <div class="card-footer">
            <router-link to="/register" class="cta-button">免费开始</router-link>
          </div>
        </div>

        <div class="pricing-card pro">
          <div class="card-badge">最受欢迎</div>
          <div class="card-header">
            <div class="plan-name">Pro</div>
            <div class="price">¥29<span class="price-unit">/月</span></div>
            <p>独立创客与小微团队的理想起点</p>
          </div>
          <div class="card-body">
            <ul class="feature-list">
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>50次</strong> 需求/原型生成</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>10次</strong> 完整代码生成</li>
              <li><el-icon class="icon-times"><Close /></el-icon> 普通生成队列</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 结果缓存 30 天</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 工单支持 (8小时)</li>
            </ul>
          </div>
          <div class="card-footer">
            <router-link to="/pricing/checkout?plan=pro" class="cta-button">立即订阅</router-link>
          </div>
        </div>

        <div class="pricing-card proplus">
          <div class="card-header">
            <div class="plan-name">Pro+</div>
            <div class="price">¥99<span class="price-unit">/月</span></div>
            <p>为高频验证与小型工作室打造</p>
          </div>
          <div class="card-body">
            <ul class="feature-list">
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>300次</strong> 需求/原型生成</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>50次</strong> 完整代码生成</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>优先</strong> 生成队列</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 结果缓存 90 天</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 工单支持 (8小时)</li>
            </ul>
          </div>
          <div class="card-footer">
            <router-link to="/pricing/checkout?plan=pro_plus" class="cta-button">获取更高效率</router-link>
          </div>
        </div>

        <div class="pricing-card enterprise">
          <div class="card-header">
            <div class="plan-name">Enterprise</div>
            <div class="price">定制<span class="price-unit"></span></div>
            <p>为孵化器与企业创新团队赋能</p>
          </div>
          <div class="card-body">
            <ul class="feature-list">
              <li><el-icon class="icon-infinity"><Right /></el-icon> 需求/原型生成</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>200+次</strong> 完整代码生成 (可增购)</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>最高优先级</strong> + 专属通道</li>
              <li><el-icon class="icon-check"><Check /></el-icon> 永久结果缓存</li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>专属客户成功经理</strong></li>
              <li><el-icon class="icon-check"><Check /></el-icon> <strong>团队协作与管理后台</strong></li>
            </ul>
          </div>
          <div class="card-footer">
            <a href="#" class="cta-button" @click.prevent="goContact">联系洽谈</a>
          </div>
        </div>
      </div>

      <div class="feature-table">
        <h2>详细功能对比</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>功能权益</th>
                <th>Free</th>
                <th>Pro</th>
                <th>Pro+</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>每月价格</td>
                <td><strong>¥0</strong></td>
                <td><strong>¥29</strong></td>
                <td><strong>¥99</strong></td>
                <td>定制</td>
              </tr>
              <tr>
                <td><strong>需求/原型生成</strong></td>
                <td>5次</td>
                <td>50次</td>
                <td>300次</td>
                <td>不限次</td>
              </tr>
              <tr>
                <td><strong>完整代码生成 (核心)</strong></td>
                <td>1次 (体验)</td>
                <td>10次</td>
                <td>50次</td>
                <td>200次起 (可增购)</td>
              </tr>
              <tr>
                <td>队列优先级</td>
                <td>普通</td>
                <td>普通</td>
                <td><strong>优先</strong></td>
                <td><strong>最高+专属</strong></td>
              </tr>
              <tr>
                <td>结果缓存</td>
                <td>7天</td>
                <td>30天</td>
                <td>90天</td>
                <td>永久/自定义</td>
              </tr>
              <tr>
                <td>技术支持</td>
                <td>社区/文档</td>
                <td>工单 (8小时)</td>
                <td>工单 (8小时)</td>
                <td><strong>专属经理+技术支持群</strong></td>
              </tr>
              <tr>
                <td>团队协作与管理后台</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><strong>✓</strong></td>
              </tr>
              <tr>
                <td>白标/定制化服务</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><strong>可选</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="faq">
        <h2>常见问题</h2>
        <div
          v-for="(item, index) in faqList"
          :key="index"
          class="faq-item"
          :class="{ open: item.open }"
          @click="toggleFAQ(index)"
        >
          <div class="faq-question">
            {{ item.q }}
            <el-icon class="faq-icon"><ArrowDown v-if="!item.open" /><ArrowUp v-else /></el-icon>
          </div>
          <div class="faq-answer">
            <p v-html="item.a"></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Check, Close, Right, ArrowDown, ArrowUp } from '@element-plus/icons-vue';

const router = useRouter();

const faqList = reactive([
  {
    q: '「完整代码生成」和「需求生成」有什么区别？',
    a: '<strong>需求生成</strong>：使用智能文档与原型引擎，根据您的描述生成结构化的产品需求文档（PRD）和可预览的 HTML 页面原型。成本较低。<br><strong>代码生成</strong>：使用专业编码引擎，根据已确定的需求，生成完整、可部署的前后端应用代码。这是实现产品的关键步骤，成本较高。',
    open: false,
  },
  {
    q: '如果免费版的额度用完了怎么办？',
    a: '您可以选择：1) 升级到 Pro 或更高版本，获取更多额度；2) 等待下个月额度重置；3) 单独购买「加油包」（即将推出）。我们鼓励重度用户通过升级套餐来获得最佳性价比和体验。',
    open: false,
  },
  {
    q: '企业版如何与我们的孵化器/公司流程对接？',
    a: '企业版提供专属的团队管理后台，管理员可以为不同小组或项目分配生成额度，查看整体使用数据，统一管理成果。我们还可根据需求，讨论单点登录（SSO）、定制生成模板、私有化部署等深度集成方案。',
    open: false,
  },
  {
    q: '可以随时取消或更换套餐吗？',
    a: '可以。您可以随时在账户设置中降级或升级套餐。升级将立即生效，并按比例补差价；降级将在下个计费周期生效。所有套餐均支持随时取消。',
    open: false,
  },
]);

function toggleFAQ(index: number) {
  faqList[index].open = !faqList[index].open;
}

function goContact() {
  router.push('/').then(() => {
    // 可后续接「联系销售」表单或弹窗
  });
}
</script>

<style scoped>
.pricing-page {
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%);
  color: #e8eaf6;
  line-height: 1.6;
  padding-bottom: var(--space-10);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.pricing-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  animation: pulse 15s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-5);
  position: relative;
  z-index: 1;
}

.pricing-header {
  text-align: center;
  padding: var(--space-10) var(--space-5);
}

.pricing-header h1 {
  font-size: var(--text-4xl);
  margin-bottom: var(--space-4);
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 800;
}

.subtitle {
  font-size: var(--text-lg);
  color: #cbd5e1;
  max-width: 700px;
  margin: 0 auto var(--space-8);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
  margin: var(--space-10) 0;
  align-items: stretch;
}

.pricing-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-xl);
  position: relative;
  transition: all var(--transition-normal);
  border: 1px solid rgba(148, 163, 184, 0.2);
  display: flex;
  flex-direction: column;
}

.pricing-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-2xl);
  padding: 2px;
  background: linear-gradient(135deg, transparent, transparent);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

.pricing-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.4);
}

.pricing-card:hover::before {
  opacity: 1;
}

.free::before { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.pro::before { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
.proplus::before { background: linear-gradient(135deg, #ec4899, #f59e0b); }
.enterprise::before { background: linear-gradient(135deg, #10b981, #06b6d4); }

.pro {
  border: 2px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3), 0 0 80px rgba(139, 92, 246, 0.2);
}

.card-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: white;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
}

.card-header {
  text-align: center;
  padding-bottom: var(--space-6);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  margin-bottom: var(--space-6);
}

.plan-name {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-3);
  letter-spacing: 0.5px;
}

.free .plan-name { color: #60a5fa; }
.pro .plan-name { color: #a78bfa; }
.proplus .plan-name { color: #f472b6; }
.enterprise .plan-name { color: #34d399; }

.price {
  font-size: var(--text-5xl);
  font-weight: var(--font-extrabold);
  margin: var(--space-4) 0;
  color: #f1f5f9;
}

.price-unit {
  font-size: var(--text-base);
  color: #94a3b8;
  font-weight: var(--font-normal);
}

.card-header p {
  color: #cbd5e1;
  font-size: var(--text-sm);
}

.card-body {
  flex-grow: 1;
  margin-bottom: var(--space-8);
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-list li {
  padding: var(--space-3) 0;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.2);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: #e2e8f0;
  font-size: 14px;
}

.feature-list .el-icon {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.icon-check { color: #34d399; }
.icon-times { color: #64748b; }
.icon-infinity { color: #60a5fa; }

.card-footer {
  text-align: center;
  margin-top: auto;
}

.cta-button {
  display: inline-block;
  padding: var(--space-4) var(--space-10);
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: var(--color-text-primary-inverse);
  text-decoration: none;
  border-radius: var(--radius-lg);
  font-weight: var(--font-bold);
  font-size: var(--text-base);
  transition: all var(--transition-normal);
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: center;
  box-sizing: border-box;
  box-shadow: var(--shadow-primary);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary-hover);
  color: var(--color-text-primary-inverse);
}

.free .cta-button {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
}

.pro .cta-button {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
}

.proplus .cta-button {
  background: linear-gradient(135deg, #ec4899, #f59e0b);
}

.enterprise .cta-button {
  background: linear-gradient(135deg, #10b981, #06b6d4);
}

.feature-table {
  overflow-x: auto;
  margin: var(--space-12) 0;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: var(--glass-blur);
  padding: var(--space-6);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.feature-table h2 {
  text-align: center;
  margin-bottom: var(--space-6);
  color: #f1f5f9;
  font-size: var(--text-2xl);
}

.table-wrap {
  overflow-x: auto;
  min-width: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

th {
  background: rgba(51, 65, 85, 0.6);
  padding: var(--space-4);
  text-align: center;
  font-weight: var(--font-bold);
  border-bottom: 2px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
}

td {
  padding: var(--space-4);
  text-align: center;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.faq {
  margin-top: var(--space-12);
}

.faq h2 {
  text-align: center;
  margin-bottom: var(--space-8);
  color: #f1f5f9;
  font-size: var(--text-2xl);
}

.faq-item {
  margin-bottom: var(--space-4);
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  border: 1px solid rgba(148, 163, 184, 0.2);
  transition: all var(--transition-normal);
}

.faq-item:hover {
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
}

.faq-question {
  padding: var(--space-5);
  font-weight: var(--font-bold);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  color: #e2e8f0;
}

.faq-icon {
  flex-shrink: 0;
  color: #a78bfa;
}

.faq-answer {
  padding: 0 var(--space-5);
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, padding 0.3s ease-out;
}

.faq-item.open .faq-answer {
  padding: 0 var(--space-5) var(--space-5);
  max-height: 400px;
}

.faq-answer p {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.7;
}

@media (max-width: 1200px) {
  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .pricing-header h1 {
    font-size: var(--text-2xl);
  }
}
</style>
