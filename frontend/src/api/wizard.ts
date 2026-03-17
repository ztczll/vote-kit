import api, { aiApi } from './client';

export interface GenerateSpecPayload {
  wizardState: {
    appName: string;
    oneLiner: string;
    scene: string;
    pain: string;
    dataFields: string[];
    features: string[];
    uiStyle: string;
    platforms: string[];
    dataScale: string;
    permission: string;
  };
  appTemplateId: string | null;
  appTemplateTitle: string;
  uiTemplateId?: string;
  dataFieldLabels: Array<{ id: string; label: string }>;
  featureLabels: string[];
}

export interface GeneratedSpecData {
  overview: string;
  functions: string;
  design: string;
  tech: string;
  prompt: string;
}

export const wizardApi = {
  generateSpec(payload: GenerateSpecPayload) {
    // 使用 aiApi 处理长时间 AI 生成任务
    return aiApi.post<{ success: boolean; data: GeneratedSpecData }>('/wizard/generate-spec', payload, {
      timeout: 300000, // 5分钟，与后端超时配置一致
    });
  },

  recommendTemplate(description: string) {
    return api.post<{ success: boolean; data: { recommendedId: string; reason?: string } }>('/wizard/recommend-template', {
      description,
    }, { timeout: 30000 });
  },

  suggestNames(templateTitle: string, oneLiner?: string) {
    return api.post<{ success: boolean; data: { suggestions: string[] } }>('/wizard/suggest-names', {
      templateTitle,
      oneLiner,
    }, { timeout: 20000 });
  },

  suggestFields(domain: string, templateId: string) {
    return api.post<{ success: boolean; data: Array<{ id: string; label: string; reason: string }> }>(
      '/wizard/suggest-fields',
      { domain, templateId },
      { timeout: 20000 }
    );
  },

  suggestFeatures(templateId: string) {
    return api.post<{ success: boolean; data: Array<{ id: string; label: string; hint: string }> }>(
      '/wizard/suggest-features',
      { templateId },
      { timeout: 20000 }
    );
  },

  refineSection(sectionKey: string, currentText: string, userIntent?: string) {
    return api.post<{ success: boolean; data: { refinedText: string } }>('/wizard/refine-section', {
      sectionKey,
      currentText,
      userIntent,
    }, { timeout: 45000 });  // 增加到45秒
  },
};
