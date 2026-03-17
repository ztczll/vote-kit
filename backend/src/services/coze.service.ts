import { CozeAPI } from '@coze/api';
import { getJWTToken } from '@coze/api';
import { IAIService, GeneratedRequirement, GeneratedDevPlan, DevPlanFeature } from '../interfaces/ai.interface';

export class CozeService implements IAIService {
  private apiClient: CozeAPI | null = null;
  private tokenExpiry: number = 0;

  private async getToken(): Promise<string> {
    const now = Date.now() / 1000;
    
    // 如果 token 还有效（提前 5 分钟刷新）
    if (this.apiClient && this.tokenExpiry > now + 300) {
      return '';
    }

    console.log('🔑 Getting new JWT token from Coze...');
    
    const privateKey = process.env.COZE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
    
    const oauthToken = await getJWTToken({
      baseURL: process.env.COZE_API_BASE || 'https://api.coze.cn',
      appId: process.env.COZE_CLIENT_ID || '',
      aud: new URL(process.env.COZE_API_BASE || 'https://api.coze.cn').host,
      keyid: process.env.COZE_PUBLIC_KEY_ID || '',
      privateKey: privateKey,
    });

    this.tokenExpiry = oauthToken.expires_in;
    
    // 创建新的 API 客户端
    this.apiClient = new CozeAPI({
      token: oauthToken.access_token,
      baseURL: process.env.COZE_API_BASE || 'https://api.coze.cn'
    });

    console.log('✅ JWT token obtained, expires at:', new Date(this.tokenExpiry * 1000).toISOString());
    
    return oauthToken.access_token;
  }

  async generateRequirement(description: string): Promise<GeneratedRequirement> {
    await this.getToken();
    
    if (!this.apiClient) {
      throw new Error('Failed to initialize Coze API client');
    }

    console.log('🤖 Calling Coze AI with description:', description.substring(0, 50) + '...');

    const botId = process.env.COZE_BOT_ID || '';
    const userId = 'user_' + Date.now();

    let fullResponse = '';

    try {
      const stream = await this.apiClient.chat.stream({
        bot_id: botId,
        user_id: userId,
        additional_messages: [
          {
            content: description,
            content_type: 'text',
            role: 'user' as any,
            type: 'question'
          }
        ],
      });

      // 收集流式响应
      let chunkCount = 0;
      let deltaContent = '';
      let completedContent = '';
      
      for await (const chunk of stream) {
        chunkCount++;
        if (chunkCount <= 5) {
          console.log(`📦 Chunk ${chunkCount}:`, JSON.stringify(chunk, null, 2).substring(0, 500));
        }
        
        if (chunk.event === 'conversation.message.delta') {
          if ((chunk as any).data?.content) {
            deltaContent += (chunk as any).data.content;
            console.log(`📝 Delta content added: "${(chunk as any).data.content}" (${(chunk as any).data.content.length} chars)`);
          }
        }
        
        if (chunk.event === 'conversation.message.completed') {
          if ((chunk as any).data?.content) {
            const content = (chunk as any).data.content;
            console.log(`📋 Completed content length: ${content.length}`);
            console.log(`📋 Completed content preview: ${content.substring(0, 200)}`);
            
            // 优先选择包含 JSON 结构的 completed content
            if (content.includes('{') && content.includes('"title"') && content.length > completedContent.length) {
              completedContent = content;
              console.log('📋 Using JSON-containing completed message content');
            }
          }
        }
      }
      
      // 优先使用 completed content，如果没有则使用 delta content
      fullResponse = completedContent || deltaContent;

      console.log('📊 Total chunks processed:', chunkCount);
      console.log('📝 Final response length:', fullResponse.length);

      console.log('📝 Dev plan AI Full Response length:', fullResponse.length);
      console.log('📝 Dev plan AI Response preview:', fullResponse.substring(0, 200));

      console.log('📝 AI Full Response length:', fullResponse.length);
      console.log('📝 AI Response preview:', fullResponse.substring(0, 200));

      if (!fullResponse || fullResponse.trim().length === 0) {
        console.log('⚠️  Empty response, using fallback generation');
        return this.generateFallback(description);
      }

      // 尝试多种方式解析 JSON
      let parsed: any;
      
      // 方式1: 直接解析
      try {
        parsed = JSON.parse(fullResponse);
      } catch (e) {
        // 方式2: 提取 JSON 代码块
        const codeBlockMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          parsed = JSON.parse(codeBlockMatch[1]);
        } else {
          // 方式3: 提取花括号内容
          const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('AI response does not contain valid JSON');
          }
        }
      }
      
      return {
        title: parsed.title || '',
        scene: parsed.scene || '',
        pain: parsed.pain || '',
        features: parsed.features || '',
        value: parsed.value || ''
      };
    } catch (error: any) {
      console.error('❌ Coze AI error:', error.message);
      throw new Error('AI generation failed: ' + error.message);
    }
  }

  async generateDevPlan(requirementInfo: { title: string; scene: string; pain: string; features: string }): Promise<GeneratedDevPlan> {
    console.log('🤖 Generating dev plan for:', requirementInfo.title);
    
    try {
      // 首先尝试真实的AI调用
      const aiResult = await this.attemptRealAICall(requirementInfo);
      if (aiResult && aiResult.features && aiResult.features.length > 0) {
        console.log('✅ Using real AI response with', aiResult.features.length, 'features');
        return aiResult;
      }
    } catch (error: any) {
      console.log('⚠️ AI call failed, using intelligent fallback:', error.message);
    }
    
    // 如果AI调用失败，使用智能降级方案
    console.log('🔄 Using intelligent fallback generation');
    const intelligentFeatures = this.generateIntelligentFeatures(requirementInfo);
    
    return {
      features: intelligentFeatures
    };
  }

  private async attemptRealAICall(requirementInfo: { title: string; scene: string; pain: string; features: string }): Promise<GeneratedDevPlan | null> {
    await this.getToken();
    if (!this.apiClient) {
      throw new Error('API client not available');
    }
    
    const botId = process.env.COZE_DEV_PLAN_BOT_ID || process.env.COZE_BOT_ID || '';
    const userId = 'devplan_' + Date.now();
    
    const prompt = `基于以下需求信息，生成3-5个开发计划功能点。每个功能点包含标题和详细描述。

需求信息：
标题：${requirementInfo.title}
场景：${requirementInfo.scene}
痛点：${requirementInfo.pain}
功能：${requirementInfo.features}

请返回JSON格式：
{
  "features": [
    {"title": "功能点标题", "description": "详细描述该功能的实现方式和价值"},
    ...
  ]
}`;

    console.log('🚀 Starting stream AI call...');
    
    try {
      const stream = await this.apiClient.chat.stream({
        bot_id: botId,
        user_id: userId,
        additional_messages: [
          {
            content: prompt,
            content_type: 'text',
            role: 'user' as any,
            type: 'question'
          }
        ],
      });

      let fullResponse = '';
      let chunkCount = 0;
      
      for await (const chunk of stream) {
        chunkCount++;
        if (chunkCount <= 5) {
          console.log(`📦 Chunk ${chunkCount} [${chunk.event}]:`, JSON.stringify(chunk).substring(0, 200) + '...');
        }
        
        // 处理增量消息 - 修正数据结构访问
        if (chunk.event === 'conversation.message.delta') {
          const data = (chunk as any).data;
          if (data && data.content) {
            fullResponse += data.content;
            console.log('📝 Delta content added, total length:', fullResponse.length);
          }
        }
        
        // 处理完整消息
        if (chunk.event === 'conversation.message.completed') {
          const data = (chunk as any).data;
          if (data && data.content) {
            fullResponse = data.content;
            console.log('🎯 Got completed message, length:', fullResponse.length);
            break;
          }
        }
        
        // 处理聊天完成事件
        if (chunk.event === 'conversation.chat.completed') {
          console.log('✅ Chat completed event received');
          break;
        }
      }
      
      console.log('📝 Final AI response length:', fullResponse.length);
      console.log('📝 AI response preview:', fullResponse.substring(0, 300));
      
      if (!fullResponse || fullResponse.trim().length === 0) {
        throw new Error('Empty AI response');
      }
      
      // 解析JSON响应
      let parsed: any;
      
      try {
        parsed = JSON.parse(fullResponse);
      } catch (e) {
        const codeBlockMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/i);
        if (codeBlockMatch) {
          parsed = JSON.parse(codeBlockMatch[1].trim());
        } else {
          throw new Error('Invalid JSON response');
        }
      }
      
      if (!parsed.features || !Array.isArray(parsed.features)) {
        throw new Error('Invalid response format');
      }
      
      console.log('✅ Successfully parsed AI response with', parsed.features.length, 'features');
      
      return {
        features: parsed.features
      };
    } catch (error: any) {
      console.error('❌ Stream AI call failed:', error.message);
      throw error;
    }
  }

  private generateIntelligentFeatures(requirementInfo: { title: string; scene: string; pain: string; features: string }): DevPlanFeature[] {
    const { title, scene, pain, features } = requirementInfo;
    
    // 基于输入内容生成智能化的功能点
    const coreFeatures = features.split(/[，,、]/).filter(f => f.trim());
    const generatedFeatures: DevPlanFeature[] = [];
    
    // 核心功能实现
    generatedFeatures.push({
      title: `${title}核心功能模块`,
      description: `实现${title}的核心功能，包括${coreFeatures.slice(0, 2).join('、')}等关键特性。采用模块化架构设计，确保系统的可扩展性和维护性。解决${pain}的核心问题，提供稳定可靠的功能支持。`
    });
    
    // 用户界面与体验
    generatedFeatures.push({
      title: "用户界面与交互体验设计",
      description: `设计直观友好的用户界面，针对${scene}进行优化。实现响应式布局，支持多设备访问，确保界面简洁易用。`
    });
    
    // 数据处理与管理
    if (coreFeatures.length > 2) {
      generatedFeatures.push({
        title: "数据处理与存储系统",
        description: `构建高效的数据处理架构，支持${coreFeatures.slice(2).join('、')}等功能的数据需求。实现数据的安全存储、快速检索和实时同步。采用合适的数据库技术，确保数据的完整性和可靠性。`
      });
    }
    
    // 性能优化与监控
    generatedFeatures.push({
      title: "性能优化与系统监控",
      description: `实现系统性能监控和优化机制，确保${title}在高并发场景下的稳定运行。包括响应时间优化、资源使用监控、错误日志收集等功能。建立完善的性能指标体系和预警机制。`
    });
    
    // 如果功能点不足4个，添加扩展功能
    if (generatedFeatures.length < 4) {
      generatedFeatures.push({
        title: "系统集成与扩展接口",
        description: `提供标准化的API接口，支持与其他系统的集成。实现插件化架构，方便功能扩展和定制。支持第三方服务集成，提升${title}的整体价值和应用场景。`
      });
    }
    
    return generatedFeatures.slice(0, 5);
  }

  private generateFallback(description: string): GeneratedRequirement {
    // 简单的规则生成作为降级方案
    return {
      title: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
      scene: `用户在日常使用中遇到了相关问题：${description}。这个场景下需要一个便捷的解决方案来提升效率。`,
      pain: `当前的痛点是：缺少自动化工具，需要手动处理，耗时且容易出错。用户希望能够通过技术手段简化这个流程。`,
      features: `1. 核心功能：${description.split('，')[0] || description.substring(0, 30)}\n2. 自动化处理\n3. 简单易用的界面`,
      value: `这个需求能够帮助用户节省时间，提高工作效率，减少重复性劳动，提升用户体验。`
    };
  }
}

export const cozeService = new CozeService();
