/**
 * 智能需求向导相关类型定义
 * 对应规划中的 GeneratedSpec 与 Wizard 状态结构
 */

export type AppTemplateCategory = 'ecommerce' | 'content' | 'tool' | 'team' | 'personal';

export interface AppTemplateMeta {
  id: string;
  title: string;
  description: string;
  category: AppTemplateCategory;
  categoryLabel: string;
  complexity: number;
  typicalTime: string;
  socialProof: string;
  icon: string;
  previewBg: string;
  previewColor: string;
  /** 可选：与后端 app_templates 表关联的 key/id */
  appTemplateKey?: string | null;
}

export type UiStyleId = 'modern-minimal' | 'warm-friendly' | 'professional-data' | 'apple-style';

export interface UiStyleOption {
  id: UiStyleId;
  title: string;
  desc: string;
}

/** 规划中的「组合模板」：一个功能模板 + 一个 UI 模板 */
export interface WizardSelection {
  selectedAppTemplateId: string | null;
  selectedUiTemplateId: UiStyleId;
}

/** 对话中收集的数据，对应规划 wizardStore */
export interface WizardBasicInfo {
  appName: string;
  oneLiner: string;
  scene: string;
  pain: string;
}

export interface WizardState {
  basicInfo: WizardBasicInfo;
  dataModel: string[];
  features: string[];
  uiStyle: UiStyleId;
  constraints: {
    platforms: string[];
    dataScale: 'small' | 'medium' | 'large';
    permission: 'single' | 'multi';
  };
}

/** 多维度规格文档结构（规划 Step 3） */
export interface GeneratedSpec {
  overview: string;
  functionalSpec: string;
  uiSpec: string;
  techConstraints: string;
  prompt: string;
}

/** 与当前前端 spec 键名兼容的别名（overview / functions / design / tech / prompt） */
export interface GeneratedSpecLegacy {
  overview: string;
  functions: string;
  design: string;
  tech: string;
  prompt: string;
}
