import axios from 'axios';

interface FigmaConfig {
  token: string;
  fileId?: string;
}

class FigmaService {
  private token: string;
  private baseUrl = 'https://api.figma.com/v1';

  constructor(config: FigmaConfig) {
    this.token = config.token;
  }

  // 获取文件信息
  async getFile(fileId: string) {
    const response = await axios.get(`${this.baseUrl}/files/${fileId}`, {
      headers: { 'X-Figma-Token': this.token }
    });
    return response.data;
  }

  // 获取文件截图
  async getImages(fileId: string, nodeIds: string[]) {
    const ids = nodeIds.join(',');
    const response = await axios.get(
      `${this.baseUrl}/images/${fileId}?ids=${ids}&format=png&scale=2`,
      { headers: { 'X-Figma-Token': this.token } }
    );
    return response.data;
  }

  // 从需求生成 Figma 设计（使用 AI）
  async generateDesignFromRequirement(requirement: string) {
    // 这里可以集成 AI 来生成设计
    // 返回设计建议
    return {
      suggestion: `基于需求"${requirement}"的设计建议`,
      components: [],
      layout: {}
    };
  }

  // 导出 Figma 设计为代码
  async exportToCode(fileId: string, nodeId: string, format: 'react' | 'vue' = 'react') {
    const file = await this.getFile(fileId);
    // 简化的代码生成逻辑
    return {
      code: `// Generated from Figma\n// File: ${fileId}\n// Node: ${nodeId}`,
      format
    };
  }
}

export default FigmaService;
