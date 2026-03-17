import axios from 'axios';

interface JenkinsBuildParams {
  appId: number | string;
  appName: string;
  subdomain: string;
  deployMode?: 'local' | 'registry';
  registryImage?: string;
}

export class JenkinsService {
  private readonly baseUrl: string;
  private readonly jobName: string;
  private readonly username?: string;
  private readonly apiToken?: string;

  constructor() {
    this.baseUrl = process.env.JENKINS_BASE_URL || '';
    this.jobName = process.env.JENKINS_JOB_NAME || 'forge-generated-app-deploy';
    this.username = process.env.JENKINS_USER;
    this.apiToken = process.env.JENKINS_API_TOKEN;
  }

  private get isEnabled(): boolean {
    return !!this.baseUrl && !!this.jobName;
  }

  /**
   * 触发 Jenkins 参数化流水线构建。
   * 默认使用 DEPLOY_MODE=local，仅在提供 registryImage 时使用 registry 模式。
   */
  async triggerBuild(params: JenkinsBuildParams): Promise<{ queueUrl?: string; buildUrlHint?: string } | null> {
    if (!this.isEnabled) {
      console.warn('Jenkins integration is disabled (missing JENKINS_BASE_URL or JENKINS_JOB_NAME)');
      return null;
    }

    const deployMode: 'local' | 'registry' =
      params.deployMode || (params.registryImage ? 'registry' : 'local');
    const domain = `${params.subdomain}.apps.example.com`;

    // 去掉末尾的 `/`，避免双斜杠
    const base = this.baseUrl.replace(/\/$/, '');
    const url = `${base}/job/${encodeURIComponent(this.jobName)}/buildWithParameters`;
    const auth = this.username && this.apiToken ? {
      username: this.username,
      password: this.apiToken,
    } : undefined;

    const callbackBase = (process.env.JENKINS_CALLBACK_BASE_URL || process.env.VOTE_KIT_BASE_URL || '').replace(/\/$/, '');
    // Jenkins buildWithParameters 只接受 application/x-www-form-urlencoded，用 JSON 会导致参数为空
    const formBody = new URLSearchParams({
      APP_ID: String(params.appId),
      APP_NAME: params.appName || String(params.appId),
      DOMAIN: domain,
      DEPLOY_MODE: deployMode,
      REGISTRY_IMAGE: params.registryImage || '',
      CALLBACK_BASE_URL: callbackBase,
    }).toString();

    try {
      const response = await axios.post(url, formBody, {
        auth,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const queueUrl = response.headers['location'] as string | undefined;
      const buildUrlHint = `${base}/job/${encodeURIComponent(this.jobName)}/lastBuild/`;

      return { queueUrl, buildUrlHint };
    } catch (error: any) {
      const message = (error && error.message) || String(error);
      console.error('❌ Failed to trigger Jenkins build:', message);
      throw error;
    }
  }
}

export const jenkinsService = new JenkinsService();

