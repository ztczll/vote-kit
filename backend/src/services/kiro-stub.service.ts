export class KiroService {
  async generateApplication(devPlan: string, appName: string, _userId?: string): Promise<any> {
    // Stub implementation
    return {
      name: appName,
      description: `Generated app for: ${devPlan.substring(0, 50)}...`,
      files: {}
    };
  }

  async cleanupWorkDir(appName: string): Promise<void> {
    // Stub implementation
  }
}

export const kiroService = new KiroService();
