/**
 * 对话式需求澄清引擎 - 步骤配置
 * 对应规划 Step 2：对话步骤引擎抽象（id / type / title / prompt / bindings / aiHook）
 */
export type ClarificationStepType = 'text-input' | 'options' | 'checkbox' | 'ai-suggestion';

export interface ClarificationStepConfig {
  id: string;
  type: ClarificationStepType;
  title: string;
  prompt: string;
  /** 绑定的 wizardState 字段名 */
  bindings?: string[];
  /** 可选：该步是否触发 AI 建议 */
  aiHook?: 'suggest-names' | 'suggest-fields' | 'suggest-features' | null;
}

/** 五大交互步骤配置（命名建议、数据模型、功能模块、UI 风格、约束条件） */
export const clarificationSteps: ClarificationStepConfig[] = [
  {
    id: 'naming',
    type: 'ai-suggestion',
    title: '应用命名',
    prompt: '先给你的应用起个好记又专业的名字吧。',
    bindings: ['appName'],
    aiHook: 'suggest-names',
  },
  {
    id: 'one-liner',
    type: 'text-input',
    title: '一句话介绍与场景',
    prompt: '关于这个应用，简单说说它要解决的场景和痛点。',
    bindings: ['oneLiner', 'scene', 'pain'],
  },
  {
    id: 'data-model',
    type: 'checkbox',
    title: '数据模型与功能模块',
    prompt: '针对所选模板，我预设了一些常见字段和功能，你可以按需勾选。',
    bindings: ['dataFields', 'features'],
    aiHook: 'suggest-fields',
  },
  {
    id: 'features',
    type: 'checkbox',
    title: '功能模块扩展',
    prompt: '可勾选基础功能与 AI 推荐的可选模块。',
    bindings: ['features'],
    aiHook: 'suggest-features',
  },
  {
    id: 'ui-and-constraints',
    type: 'options',
    title: 'UI 风格与技术约束',
    prompt: '选择你喜欢的界面风格，以及部署平台、数据规模、权限模式。',
    bindings: ['uiStyle', 'platforms', 'dataScale', 'permission'],
  },
];
