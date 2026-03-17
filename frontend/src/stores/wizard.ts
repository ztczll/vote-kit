/**
 * 智能需求向导状态 - Pinia Store
 * 对应规划：设计统一的前端 wizardStore 存储整个对话中收集的数据
 */
import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import type { AppTemplateMeta, UiStyleId, GeneratedSpecLegacy } from '@/types/wizard';

export const useWizardStore = defineStore('wizard', () => {
  const currentStepIndex = ref(0);

  const selectedAppTemplate = ref<AppTemplateMeta | null>(null);
  const selectedUiStyle = ref<UiStyleId>('modern-minimal');

  const basicInfo = reactive({
    appName: '',
    oneLiner: '',
    scene: '',
    pain: '',
  });

  const dataFields = ref<string[]>([]);
  const features = ref<string[]>([]);
  const platforms = ref<string[]>(['web']);
  const dataScale = ref<'small' | 'medium' | 'large'>('medium');
  const permission = ref<'single' | 'multi'>('multi');

  const generatedSpec = reactive<GeneratedSpecLegacy>({
    overview: '',
    functions: '',
    design: '',
    tech: '',
    prompt: '',
  });

  const selectedAppTemplateId = computed(() => selectedAppTemplate.value?.id ?? null);

  function setAppTemplate(tpl: AppTemplateMeta | null) {
    selectedAppTemplate.value = tpl;
  }

  function setUiStyle(style: UiStyleId) {
    selectedUiStyle.value = style;
  }

  function setSpec(spec: Partial<GeneratedSpecLegacy>) {
    Object.assign(generatedSpec, spec);
  }

  function reset() {
    currentStepIndex.value = 0;
    selectedAppTemplate.value = null;
    selectedUiStyle.value = 'modern-minimal';
    basicInfo.appName = '';
    basicInfo.oneLiner = '';
    basicInfo.scene = '';
    basicInfo.pain = '';
    dataFields.value = [];
    features.value = [];
    platforms.value = ['web'];
    dataScale.value = 'medium';
    permission.value = 'multi';
    generatedSpec.overview = '';
    generatedSpec.functions = '';
    generatedSpec.design = '';
    generatedSpec.tech = '';
    generatedSpec.prompt = '';
  }

  return {
    currentStepIndex,
    selectedAppTemplate,
    selectedAppTemplateId,
    selectedUiStyle,
    basicInfo,
    dataFields,
    features,
    platforms,
    dataScale,
    permission,
    generatedSpec,
    setAppTemplate,
    setUiStyle,
    setSpec,
    reset,
  };
});
