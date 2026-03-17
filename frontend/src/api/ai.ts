import { aiApi } from './client';

export interface GeneratedRequirement {
  title: string;
  scene: string;
  pain: string;
  features: string;
  value: string;
}

export interface DevPlanFeature {
  title: string;
  description: string;
}

export interface GeneratedDevPlan {
  features: DevPlanFeature[];
}

export const aiApiService = {
  async generateRequirement(description: string): Promise<GeneratedRequirement> {
    const response = await aiApi.post('/ai/generate-requirement', { description });
    return response.data.data;
  },

  async generateDevPlan(requirementInfo: { title: string; scene: string; pain: string; features: string }): Promise<GeneratedDevPlan> {
    const response = await aiApi.post('/ai/generate-dev-plan', requirementInfo);
    return response.data.data;
  }
};
