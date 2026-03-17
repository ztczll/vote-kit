<template>
  <div class="checkout-page">
    <div class="container">
      <div class="checkout-header">
        <router-link to="/pricing" class="back-link">
          <el-icon><ArrowLeft /></el-icon>
          返回套餐
        </router-link>
      </div>

      <div v-if="!planId" class="state-card">
        <p class="state-text">请先选择套餐</p>
        <el-button type="primary" size="large" round @click="$router.push('/pricing')">去选择套餐</el-button>
      </div>
      <div v-else-if="plansList.length > 0 && !planConfig" class="state-card">
        <p class="state-text">该套餐暂不支持在线购买，请选择其他套餐或联系销售。</p>
        <el-button type="primary" size="large" round @click="$router.push('/pricing')">返回套餐页</el-button>
      </div>
      <div v-else-if="planId && plansList.length === 0" class="state-card">
        <p class="state-text">加载套餐信息中…</p>
        <el-icon class="is-loading" :size="28"><Loading /></el-icon>
      </div>
      <div v-else-if="planConfig" class="checkout-card">
        <h1 class="card-title">确认订阅</h1>
        <div class="plan-summary">
          <div class="plan-name">{{ planLabel }}</div>
          <div class="price">¥{{ (planConfig.priceMonthly || 0) / 100 }}<span class="price-unit">/月</span></div>
          <p class="desc">{{ planDesc }}</p>
        </div>

        <div v-if="!orderResult" class="checkout-form">
          <el-form label-width="100px" class="pay-form">
            <el-form-item label="支付方式">
              <el-radio-group v-model="provider" size="large">
                <el-radio-button value="alipay">支付宝</el-radio-button>
                <el-radio-button value="wechat">微信支付</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>
          <div class="actions">
            <el-button size="large" @click="$router.push('/pricing')">返回套餐页</el-button>
            <el-button type="primary" size="large" :loading="submitting" @click="createOrder" class="submit-btn">
              确认并支付
            </el-button>
          </div>
        </div>

        <div v-else class="order-result">
          <div class="result-success">
            <el-icon class="result-icon"><CircleCheck /></el-icon>
            <h2>订单已创建</h2>
            <p class="order-id">订单号：<code>{{ orderResult.orderId }}</code></p>
            <p class="order-amount">金额：<strong>¥{{ (orderResult.amount || 0) / 100 }}</strong></p>
            <p v-if="!orderResult.redirectUrl" class="tip">支付通道接入中。如需立即开通，请联系管理员并提供订单号。</p>
            <p v-else class="tip">正在跳转到支付页面…</p>
          </div>
          <div class="result-actions">
            <el-button type="primary" size="large" @click="$router.push('/my-apps')">进入我的应用</el-button>
            <el-button size="large" @click="$router.push('/pricing')">返回套餐页</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Loading, CircleCheck } from '@element-plus/icons-vue';
import api from '@/api/client';

const route = useRoute();
const planId = ref<string | null>(null);
const plansList = ref<Array<{ plan: string; priceMonthly: number | null; requirementLimit: number; codeGenLimit: number; queuePriority: string }>>([]);
const provider = ref<'alipay' | 'wechat'>('alipay');
const submitting = ref(false);
const orderResult = ref<{ orderId: string; amount: number; redirectUrl?: string } | null>(null);

const planConfig = computed(() => {
  if (!planId.value || !plansList.value.length) return null;
  return plansList.value.find((p) => p.plan === planId.value) ?? null;
});

const planLabel = computed(() => {
  const map: Record<string, string> = { pro: 'Pro', pro_plus: 'Pro+' };
  return planId.value ? (map[planId.value] || planId.value) : '';
});

const planDesc = computed(() => {
  const map: Record<string, string> = {
    pro: '独立创客与小微团队的理想起点',
    pro_plus: '为高频验证与小型工作室打造',
  };
  return planId.value ? (map[planId.value] || '') : '';
});

onMounted(async () => {
  const plan = (route.query.plan as string)?.toLowerCase();
  if (plan && ['pro', 'pro_plus'].includes(plan)) {
    planId.value = plan;
  }
  try {
    const { data } = await api.get('/subscriptions/plans');
    plansList.value = (data?.data ?? []).map((r: any) => ({
      plan: r.plan,
      priceMonthly: r.priceMonthly ?? r.price_monthly,
      requirementLimit: r.requirementLimit ?? r.requirement_limit,
      codeGenLimit: r.codeGenLimit ?? r.code_gen_limit,
      queuePriority: r.queuePriority ?? r.queue_priority,
    }));
  } catch {
    ElMessage.error('获取套餐信息失败');
  }
});

async function createOrder() {
  if (!planId.value) return;
  submitting.value = true;
  orderResult.value = null;
  try {
    const { data } = await api.post('/subscriptions/create-order', {
      plan: planId.value,
      provider: provider.value,
    });
    const result = data?.data ?? data;
    orderResult.value = {
      orderId: result.orderId,
      amount: result.amount ?? 0,
      redirectUrl: result.redirectUrl,
    };
    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '创建订单失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.checkout-page {
  min-height: 100vh;
  padding: var(--space-8) var(--space-4);
  background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%);
  color: #e8eaf6;
  position: relative;
}
.container {
  max-width: 560px;
  margin: 0 auto;
}
.checkout-header {
  margin-bottom: var(--space-6);
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: #94a3b8;
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}
.back-link:hover {
  color: #e2e8f0;
}
.state-card {
  text-align: center;
  padding: var(--space-12);
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: var(--shadow-xl);
}
.state-text {
  margin: 0 0 var(--space-6);
  color: #e2e8f0;
  font-size: var(--text-base);
}
.checkout-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: var(--glass-blur);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: var(--shadow-xl);
}
.card-title {
  margin: 0 0 var(--space-6);
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: #f1f5f9;
  text-align: center;
}
.plan-summary {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  text-align: center;
}
.plan-name {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: #a78bfa;
  margin-bottom: var(--space-2);
}
.price {
  font-size: var(--text-4xl);
  font-weight: var(--font-extrabold);
  margin: var(--space-2) 0;
  color: #f1f5f9;
}
.price-unit {
  font-size: var(--text-base);
  color: #94a3b8;
  font-weight: var(--font-normal);
}
.desc {
  margin: 0;
  color: #cbd5e1;
  font-size: var(--text-sm);
}
.checkout-form {
  margin-top: var(--space-4);
}
.pay-form :deep(.el-radio-group) {
  width: 100%;
}
.pay-form :deep(.el-radio-button) {
  flex: 1;
}
.pay-form :deep(.el-radio-button__inner) {
  width: 100%;
}
.actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-6);
  flex-wrap: wrap;
}
.actions .el-button {
  flex: 1;
  min-width: 120px;
}
.submit-btn {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  box-shadow: var(--shadow-primary);
}
.submit-btn:hover {
  box-shadow: var(--shadow-primary-hover);
}
.order-result {
  margin-top: var(--space-4);
}
.result-success {
  text-align: center;
  padding: var(--space-4) 0;
}
.result-icon {
  font-size: 48px;
  color: var(--color-success-500);
  margin-bottom: var(--space-4);
}
.result-success h2 {
  margin: 0 0 var(--space-4);
  font-size: var(--text-xl);
  color: #f1f5f9;
}
.order-id, .order-amount {
  margin: var(--space-2) 0;
  color: #e2e8f0;
  font-size: var(--text-sm);
}
.order-result code {
  background: rgba(0, 0, 0, 0.3);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}
.tip {
  margin-top: var(--space-4);
  color: #94a3b8;
  font-size: var(--text-sm);
}
.result-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  margin-top: var(--space-6);
  flex-wrap: wrap;
}
</style>
