<template>
  <div class="vote-chart-container">
    <div class="chart-header">
      <h3 class="chart-title">投票分布</h3>
      <span class="chart-total">{{ totalVotes }} 总票数</span>
    </div>
    <div class="chart-wrapper">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="chart-legend">
      <div v-for="(item, index) in chartData" :key="index" class="legend-item">
        <span class="legend-color" :style="{ background: colors[index] }"></span>
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ item.percentage }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

interface ChartDataItem {
  label: string;
  value: number;
  percentage: number;
}

interface Props {
  data: ChartDataItem[];
}

const props = defineProps<Props>();
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const colors = ['#FF6B35', '#0A1E32', '#34C759', '#FFD700', '#007AFF'];

const totalVotes = computed(() => {
  return props.data.reduce((sum, item) => sum + item.value, 0);
});

const chartData = computed(() => props.data);

onMounted(() => {
  initChart();
});

watch(() => props.data, () => {
  updateChart();
}, { deep: true });

function initChart() {
  if (!chartCanvas.value) return;

  const ctx = chartCanvas.value.getContext('2d');
  if (!ctx) return;

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: props.data.map(item => item.label),
      datasets: [{
        data: props.data.map(item => item.value),
        backgroundColor: colors.slice(0, props.data.length),
        borderWidth: 0,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1C1917',
          bodyColor: '#57534E',
          borderColor: 'rgba(231, 229, 228, 0.8)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
        }
      }
    }
  });
}

function updateChart() {
  if (!chartInstance) return;
  
  chartInstance.data.labels = props.data.map(item => item.label);
  chartInstance.data.datasets[0].data = props.data.map(item => item.value);
  chartInstance.update();
}
</script>

<style scoped>
.vote-chart-container {
  background: var(--color-surface-light);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.chart-total {
  font-size: 14px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.chart-wrapper {
  position: relative;
  height: 200px;
  margin-bottom: var(--space-lg);
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.legend-item:hover {
  background: var(--color-surface);
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.legend-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}
</style>
