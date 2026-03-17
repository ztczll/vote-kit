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

export interface IAIService {
  generateRequirement(description: string): Promise<GeneratedRequirement>;
  generateDevPlan(requirementInfo: { title: string; scene: string; pain: string; features: string }): Promise<GeneratedDevPlan>;
}
