import OpenAI from 'openai';
import { IAIService, GeneratedRequirement, GeneratedDevPlan } from '../interfaces/ai.interface';
import { aiMonitoringService } from './ai-monitoring.service';

export interface DeepseekCallOptions {
  /**
   * 业务操作名称，用于监控与计费元数据，如 generateRequirement / generateDevPlan / generatePrototype 等。
   */
  operation?: string;
  /**
   * 是否在 AI 监控日志中记录 usage（默认 true）。
   */
  logUsage?: boolean;
}

export class DeepSeekService implements IAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '300000'), // 默认300秒（5分钟），可通过环境变量配置
    });
  }

  private selectModel(description: string): string {
    // 简单任务用chat，复杂任务用reasoner
    const complexity = description.length + (description.match(/[，,。.]/g) || []).length;
    return complexity > 100 ? 'deepseek-reasoner' : 'deepseek-chat';
  }

  async generateRequirement(description: string, _opts?: DeepseekCallOptions): Promise<GeneratedRequirement> {
    const model = this.selectModel(description);
    console.log(`🤖 Using DeepSeek model: ${model}`);

    const prompt = `基于以下描述生成结构化需求信息，返回JSON格式：
{
  "title": "需求标题",
  "scene": "应用场景描述",
  "pain": "痛点分析",
  "features": "功能列表",
  "value": "价值说明"
}

描述：${description}`;

    const startTime = Date.now();
    let success = true;
    let errorMessage = '';

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      const parsed = this.parseJSON(content);
      
      // 记录使用情况
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'generateRequirement',
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
          cost: response.usage
            ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
            : 0,
          success: true,
        });
      } catch (_) {}
      
      return {
        title: parsed.title || description.substring(0, 50),
        scene: parsed.scene || '',
        pain: parsed.pain || '',
        features: parsed.features || '',
        value: parsed.value || ''
      };
    } catch (error: any) {
      success = false;
      errorMessage = error.message;
      
      await aiMonitoringService.logUsage({
        provider: 'deepseek',
        model,
        operation: 'generateRequirement',
        success: false,
        error_message: errorMessage
      });
      
      throw error;
    }
  }

  async generateDevPlan(
    requirementInfo: { title: string; scene: string; pain: string; features: string },
    _opts?: DeepseekCallOptions
  ): Promise<GeneratedDevPlan> {
    const model = this.selectModel(requirementInfo.features);
    console.log(`🤖 Using DeepSeek model: ${model} for dev plan`);

    const prompt = `基于需求信息生成开发计划，返回JSON格式：
{
  "features": [
    {"title": "功能标题", "description": "详细描述"},
    ...
  ]
}

需求信息：
标题：${requirementInfo.title}
场景：${requirementInfo.scene}
痛点：${requirementInfo.pain}
功能：${requirementInfo.features}`;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || '';
      const parsed = this.parseJSON(content);
      
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'generateDevPlan',
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
          cost: response.usage
            ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
            : 0,
          success: true,
        });
      } catch (_) {}
      
      return {
        features: parsed.features || this.generateFallbackFeatures(requirementInfo)
      };
    } catch (error: any) {
      await aiMonitoringService.logUsage({
        provider: 'deepseek',
        model,
        operation: 'generateDevPlan',
        success: false,
        error_message: error.message
      });
      
      throw error;
    }
  }

  private parseJSON(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      return {};
    }
  }

  private generateFallbackFeatures(info: { title: string; features: string }) {
    return [
      { title: `${info.title}核心功能`, description: `实现${info.features}的核心功能模块` },
      { title: '用户界面设计', description: '设计直观友好的用户界面' },
      { title: '数据管理系统', description: '构建高效的数据处理架构' }
    ];
  }

  /** Wizard: 根据用户描述推荐最匹配的应用模板 ID */
  async recommendTemplate(
    description: string,
    templates: { id: string; title: string; description: string }[]
  ): Promise<{ recommendedId: string; reason?: string }> {
    const templateList = templates.map((t) => `- ${t.id}: ${t.title}（${t.description}）`).join('\n');
    const prompt = `你是一个产品专家。用户用一句话描述了他想做的应用或要解决的问题。请从下列应用模板中选出最匹配的一个，只返回 JSON：
{"recommendedId": "模板id", "reason": "一句话推荐理由"}

可选模板：
${templateList}

用户描述：${description}`;
    const out = await this.chatForWizard(prompt);
    const id = out?.recommendedId && templates.some((t) => t.id === out.recommendedId) ? out.recommendedId : templates[0]?.id;
    return { recommendedId: id, reason: out?.reason };
  }

  /** Wizard: 根据模板和一句话介绍生成 3 个应用命名建议 */
  async suggestNames(templateTitle: string, oneLiner: string): Promise<{ suggestions: string[] }> {
    const prompt = `你是产品命名顾问。用户选择的应用类型是「${templateTitle}」，一句话介绍是：${oneLiner || '未填写'}
请生成 3 个简短、好记、专业的应用名称（中文为主），只返回 JSON 数组字符串，例如：["名称A", "名称B", "名称C"]`;
    const out = await this.chatForWizard(prompt);
    if (Array.isArray(out) && out.length >= 3) {
      return { suggestions: out.slice(0, 3).map(String) };
    }
    if (typeof out === 'object' && Array.isArray((out as any).suggestions)) {
      return { suggestions: (out as any).suggestions.slice(0, 3) };
    }
    return {
      suggestions: [`智能${templateTitle}`, `我的${templateTitle}助手`, `${templateTitle} Pro`],
    };
  }

  /** Wizard: 根据领域/模板推荐数据模型字段 */
  async suggestFields(
    domain: string,
    templateId: string
  ): Promise<{ fields: { id: string; label: string; reason: string }[] }> {
    const prompt = `你是数据建模顾问。应用模板 ID：${templateId}。用户业务领域或一句话：${domain || '未说明'}
请推荐 2～4 个该领域常用的数据字段（如口味、适用阶段、标签等），只返回 JSON：
{"fields": [{"id": "英文id", "label": "中文标签", "reason": "推荐理由"}, ...]}`;
    const out = await this.chatForWizard(prompt);
    const list = (out?.fields || []).filter((f: any) => f?.id && f?.label);
    return { fields: list.length ? list : [{ id: 'tag', label: '标签', reason: '方便分类与检索' }, { id: 'status', label: '状态', reason: '跟踪生命周期' }] };
  }

  /** Wizard: 根据模板推荐可扩展功能模块 */
  async suggestFeatures(templateId: string): Promise<{ features: { id: string; label: string; hint: string }[] }> {
    const prompt = `你是产品功能顾问。应用模板 ID：${templateId}。请为该类应用推荐 2～4 个常见扩展功能（如会员体系、智能推荐、供应商管理等），只返回 JSON：
{"features": [{"id": "英文id", "label": "功能名称", "hint": "简短说明或推荐理由"}, ...]}`;
    const out = await this.chatForWizard(prompt);
    const list = (out?.features || []).filter((f: any) => f?.id && f?.label);
    return {
      features: list.length
        ? list
        : [
            { id: 'member', label: '会员/用户体系', hint: '支持多用户与分级权益' },
            { id: 'recommendation', label: '智能推荐', hint: '提升转化与复购' },
          ],
    };
  }

  /**
   * Wizard: 根据对话澄清信息（模板 + 应用名称 + 一句话介绍 + 场景 + 痛点）生成智能规格文档五部分。
   * 发送给模型时用「一句话介绍」作为应用简介，因其可能已被用户修改，勿使用模板默认简介。
   */
  async generateSpecFromClarification(input: {
    appTemplateTitle: string;
    appName: string;
    oneLiner: string;
    scene: string;
    pain: string;
    platforms?: string[];
  }): Promise<{ overview: string; functions: string; design: string; tech: string; prompt: string }> {
    const model = 'deepseek-chat';
    const hasMiniprogram = input.platforms?.includes('miniprogram') ?? false;
    const prompt = `你是一个产品与技术文档专家。根据用户选择的应用模板和填写的澄清信息，生成一份结构化的「智能规格文档」，供后续开发与 AI Coding 使用。

重要：应用简介请严格使用用户填写的「一句话介绍」，不要使用模板的默认简介，因为用户可能已修改过。

输入信息：
- 模板名称（应用类型）：${input.appTemplateTitle}
- 应用名称：${input.appName}
- 一句话介绍（用户填写，作为应用简介）：${input.oneLiner || '（待补充）'}
- 使用场景：${input.scene || '（待补充）'}
- 主要痛点：${input.pain || '（待补充）'}
- 是否支持小程序：${hasMiniprogram ? '是' : '否'}

请生成以下 5 个部分的 Markdown 文档，只返回一个 JSON 对象，键名为 overview、functions、design、tech、prompt。每部分均为字符串，内容为对应章节的完整 Markdown 文本。

要求：
1. overview：应用概览，包含基本信息（应用名称、类型、一句话介绍）、核心目标（使用场景、解决痛点）、功能模块一览（根据场景与痛点推断合理 MVP 功能）。
2. functions：功能规格，包含核心数据模型建议与功能模块详情。
3. design：UI/UX 设计规格，包含设计风格、主辅色、布局结构等，风格需与模板类型匹配。
4. tech：技术约束，包含开发栈（Vue 3 + Node.js、数据库、容器化）、若支持小程序需单独说明、性能与安全要求。
5. prompt：给 AI Coding 的完整提示词（供 Forge 使用），包含应用上下文、功能需求、UI 要求、技术约束、Docker 部署要求、输出格式说明。

只返回 JSON，不要 markdown 代码块包裹，不要其他说明。`;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 8192,
      });
      const content = (response.choices[0]?.message?.content || '').trim();
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'generateSpecFromClarification',
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
          cost: response.usage
            ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
            : 0,
          success: true,
        });
      } catch (_) {}
      const parsed = this.parseJSON(content);
      const overview = typeof parsed.overview === 'string' ? parsed.overview : '';
      const functions = typeof parsed.functions === 'string' ? parsed.functions : '';
      const design = typeof parsed.design === 'string' ? parsed.design : '';
      const tech = typeof parsed.tech === 'string' ? parsed.tech : '';
      const promptSection = typeof parsed.prompt === 'string' ? parsed.prompt : '';
      if (overview && functions && design && tech && promptSection) {
        return { overview, functions, design, tech, prompt: promptSection };
      }
      throw new Error('DeepSeek 返回的规格文档不完整');
    } catch (err: any) {
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model: 'deepseek-chat',
          operation: 'generateSpecFromClarification',
          success: false,
          error_message: err?.message || String(err),
        });
      } catch (_) {}
      throw err;
    }
  }

  /** Wizard: 对规格文档某一段落进行改写（魔法编辑） */
  async refineSection(sectionKey: string, currentText: string, userIntent: string): Promise<{ refinedText: string }> {
    const prompt = `你是一名技术写作专家。用户希望对下面这段规格文档进行修改。用户意图：${userIntent || '更清晰、专业'}

当前内容：
---
${currentText}
---

请直接输出修改后的完整内容，不要加「修改后」等前缀，保持原有格式（如 Markdown、列表）。`;
    const refined = await this.chatForWizard(prompt, false);
    return { refinedText: typeof refined === 'string' ? refined : currentText };
  }

  /**
   * Generate a single-page HTML prototype from requirement (DesignFast-style).
   * Strips markdown code fences and validates HTML; logs usage as generatePrototype.
   */
  async generatePrototypeHtml(
    systemPrompt: string,
    userPrompt: string,
    _opts?: DeepseekCallOptions
  ): Promise<{ html: string; usage?: { prompt_tokens?: number; prompt_cache_hit_tokens?: number; completion_tokens?: number; total_tokens?: number }; model: string }> {
    const model = 'deepseek-chat';
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
      });
      const raw = (response.choices[0]?.message?.content || '').trim();
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'generatePrototype',
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
          cost: response.usage
            ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
            : 0,
          success: true,
        });
      } catch (_) {}
      const html = this.stripHtmlCodeFence(raw);
      if (!html || (!html.includes('<!DOCTYPE') && !html.includes('<html'))) {
        throw new Error('DeepSeek 未返回有效 HTML 文档');
      }
      return {
        html,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens,
          // DeepSeek 当前将缓存命中单独暴露在 prompt_cache_hit_tokens
          // 若未来 SDK 有变，可在此集中适配
          prompt_cache_hit_tokens: (response as any).usage?.prompt_cache_hit_tokens,
          completion_tokens: response.usage?.completion_tokens,
          total_tokens: response.usage?.total_tokens,
        },
        model,
      };
    } catch (err: any) {
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model: 'deepseek-chat',
          operation: 'generatePrototype',
          success: false,
          error_message: err?.message || String(err),
        });
      } catch (_) {}
      throw err;
    }
  }

  private stripHtmlCodeFence(content: string): string {
    let s = content.trim();
    const htmlMatch = s.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/im);
    if (htmlMatch) {
      s = htmlMatch[1].trim();
    } else {
      const start = s.indexOf('<!DOCTYPE');
      if (start === -1) {
        const startHtml = s.indexOf('<html');
        if (startHtml !== -1) s = s.slice(startHtml);
      } else {
        s = s.slice(start);
      }
      const end = s.lastIndexOf('</html>');
      if (end !== -1) s = s.slice(0, end + 7);
    }
    return s.trim();
  }

  /**
   * 内容安全审核：判断文本是否包含违法、违规、侵权、低俗、政治敏感等。
   * 超时或异常时视为不通过，避免违规内容漏审。
   */
  async moderateContent(text: string): Promise<{ pass: boolean; reason?: string }> {
    const model = 'deepseek-chat';
    const prompt = `你是一个内容安全审核助手。请判断下面这段用户提交的「应用需求描述」是否包含以下任一违规内容：
- 违法、违规
- 侵权（如仿冒、盗用他人品牌或作品）
- 低俗、色情、暴力
- 政治敏感、违禁政治内容

仅根据上述维度判断，不要对正常的产品创意、功能描述进行误判。
只返回 JSON，不要其他文字：
- 若内容合规，返回：{"pass": true}
- 若不合规，返回：{"pass": false, "reason": "简短说明原因（一句话）"}

待审核文本：
---
${(text || '').trim().slice(0, 8000)}
---`;

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      const content = (response.choices[0]?.message?.content || '').trim();
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'moderateContent',
          input_tokens: response.usage?.prompt_tokens,
          output_tokens: response.usage?.completion_tokens,
          cost: response.usage
            ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
            : 0,
          success: true,
        });
      } catch (_) {}
      const parsed = this.parseJSON(content);
      const pass = parsed.pass === true;
      return { pass, reason: pass ? undefined : (parsed.reason || '内容不符合规范') };
    } catch (err: any) {
      try {
        await aiMonitoringService.logUsage({
          provider: 'deepseek',
          model,
          operation: 'moderateContent',
          success: false,
          error_message: err?.message || String(err),
        });
      } catch (_) {}
      return { pass: false, reason: '审核服务暂时不可用，请稍后重试' };
    }
  }

  private async chatForWizard(userPrompt: string, parseJson = true): Promise<any> {
    const model = 'deepseek-chat';
    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.5,
    });
    const content = (response.choices[0]?.message?.content || '').trim();
    try {
      await aiMonitoringService.logUsage({
        provider: 'deepseek',
        model,
        operation: 'wizard',
        input_tokens: response.usage?.prompt_tokens,
        output_tokens: response.usage?.completion_tokens,
        cost: response.usage
          ? aiMonitoringService.calculateCost('deepseek', response.usage.prompt_tokens, response.usage.completion_tokens)
          : 0,
        success: true,
      });
    } catch (_) {}
    if (!parseJson) return content;
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {}
      }
      const arrMatch = content.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          return JSON.parse(arrMatch[0]);
        } catch {}
      }
      return {};
    }
  }
}

export const deepSeekService = new DeepSeekService();
