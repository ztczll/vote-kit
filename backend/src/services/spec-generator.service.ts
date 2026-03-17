import { AppTemplateService } from './app-template.service';
import { PromptTemplateService } from './prompt-template.service';

export interface RequirementInput {
  title: string;
  description?: string | null;
  scene?: string | null;
  pain?: string | null;
  features?: string | null;
  extra?: string | null;
}

export interface SpecGeneratorServiceInput {
  requirement: RequirementInput;
  appTemplate: {
    layer1_product_vision: string | null;
    layer2_functional_spec: string | null;
    layer3_impl_guidance: string | null;
    layer4_deployment_spec: string | null;
  } | null;
  promptTemplatesByDimension: Record<string, { content: string }>;
}

/**
 * Fills placeholders like {{title}}, {{description}} in a string.
 */
function fillPlaceholders(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v ?? '');
  }
  return out;
}

/**
 * Builds the final AI prompt in the "专用提示词结构" format from
 * requirement + app template (four layers) + selected prompt templates.
 */
export function buildSpecPrompt(input: SpecGeneratorServiceInput): string {
  const { requirement, appTemplate, promptTemplatesByDimension } = input;
  const vars: Record<string, string> = {
    title: requirement.title ?? '',
    description: requirement.description ?? '',
    scene: requirement.scene ?? '',
    pain: requirement.pain ?? '',
    features: requirement.features ?? '',
    extra: requirement.extra ?? '',
  };

  const layer1 = appTemplate?.layer1_product_vision
    ? fillPlaceholders(appTemplate.layer1_product_vision, vars)
    : '';
  const layer2 = appTemplate?.layer2_functional_spec
    ? fillPlaceholders(appTemplate.layer2_functional_spec, vars)
    : '';
  const layer3 = appTemplate?.layer3_impl_guidance
    ? fillPlaceholders(appTemplate.layer3_impl_guidance, vars)
    : '';
  const layer4 = appTemplate?.layer4_deployment_spec
    ? fillPlaceholders(appTemplate.layer4_deployment_spec, vars)
    : '';

  // 项目上下文 <- 第一层 + 需求摘要
  const contextParts: string[] = [];
  if (layer1) contextParts.push(layer1);
  contextParts.push(`需求标题：${vars.title}`);
  contextParts.push(`需求描述：${vars.description}`);
  if (vars.scene) contextParts.push(`使用场景：${vars.scene}`);
  if (vars.pain) contextParts.push(`痛点：${vars.pain}`);
  if (vars.features) contextParts.push(`核心功能：${vars.features}`);

  // 技术约束 <- 第三层 + 第四层
  const techParts: string[] = [];
  if (layer3) techParts.push(layer3);
  if (layer4) techParts.push(layer4);
  const techFromPrompts =
    [promptTemplatesByDimension.tech_arch, promptTemplatesByDimension.deployment]
      .filter(Boolean)
      .map((p) => p.content)
      .join('\n');
  if (techFromPrompts) techParts.push(techFromPrompts);

  // 具体任务 <- 第二层 + 第三层 API + 业务逻辑类提示词
  const taskParts: string[] = [];
  if (layer2) taskParts.push(layer2);
  const taskFromPrompts = [
    promptTemplatesByDimension.business_logic,
    promptTemplatesByDimension.data_model,
  ]
    .filter(Boolean)
    .map((p) => p.content)
    .join('\n');
  if (taskFromPrompts) taskParts.push(taskFromPrompts);

  // 代码风格要求 <- UI/UX、测试、安全合规
  const styleParts: string[] = [];
  for (const key of ['ui_ux', 'test_strategy', 'security_compliance']) {
    const p = promptTemplatesByDimension[key];
    if (p?.content) styleParts.push(p.content);
  }

  // 预期输出 <- 第四层 + 部署相关提示词
  const outputParts: string[] = [];
  if (layer4) outputParts.push(layer4);
  if (promptTemplatesByDimension.deployment?.content) {
    outputParts.push(promptTemplatesByDimension.deployment.content);
  }

  const lines: string[] = [
    '## 项目上下文',
    contextParts.join('\n\n'),
    '',
    '## 技术约束',
    techParts.length ? techParts.join('\n\n') : '- 由实现根据需求自行选型',
    '',
    '## 具体任务',
    taskParts.length ? taskParts.join('\n\n') : '根据需求与项目上下文实现完整功能',
    '',
    '## 代码风格要求',
    styleParts.length ? styleParts.join('\n\n') : '- 命名规范: camelCase/PascalCase 按语言惯例\n- 错误处理: 统一 try/catch 或 Result',
    '',
    '## 预期输出',
    outputParts.length ? outputParts.join('\n\n') : '- 完整可运行项目，含前端、后端、配置与说明',
  ];

  return lines.join('\n');
}

export class SpecGeneratorService {
  constructor(
    private appTemplateService: AppTemplateService,
    private promptTemplateService: PromptTemplateService
  ) {}

  /**
   * Generate the final prompt for Forge from requirement id.
   * Loads requirement row (with app_template_id, prompt_template_ids), template and prompts, then builds spec.
   * Returns null if requirement has no template/prompts so caller can fall back to legacy prompt.
   */
  async buildPromptFromRequirement(requirement: {
    title: string;
    description?: string | null;
    scene?: string | null;
    pain?: string | null;
    features?: string | null;
    extra?: string | null;
    app_template_id?: string | null;
    prompt_template_ids?: string | null;
  }): Promise<string | null> {
    const templateId = requirement.app_template_id;
    let promptIds: Record<string, string> = {};
    try {
      if (requirement.prompt_template_ids) {
        const parsed = JSON.parse(requirement.prompt_template_ids as string);
        if (parsed && typeof parsed === 'object') promptIds = parsed;
      }
    } catch {
      // ignore invalid json
    }

    const hasTemplate = !!templateId;
    const hasPrompts = Object.keys(promptIds).length > 0;
    if (!hasTemplate && !hasPrompts) return null;

    let appTemplate: SpecGeneratorServiceInput['appTemplate'] = null;
    if (templateId) {
      const t = await this.appTemplateService.getById(templateId);
      if (t) {
        appTemplate = {
          layer1_product_vision: t.layer1_product_vision,
          layer2_functional_spec: t.layer2_functional_spec,
          layer3_impl_guidance: t.layer3_impl_guidance,
          layer4_deployment_spec: t.layer4_deployment_spec,
        };
      }
    }

    const promptIdsValues = Object.values(promptIds).filter(Boolean);
    const promptRows = promptIdsValues.length
      ? await this.promptTemplateService.getByIds(promptIdsValues)
      : [];
    const promptTemplatesByDimension: Record<string, { content: string }> = {};
    for (const row of promptRows) {
      promptTemplatesByDimension[row.dimension] = { content: row.content };
    }

    return buildSpecPrompt({
      requirement: {
        title: requirement.title,
        description: requirement.description,
        scene: requirement.scene,
        pain: requirement.pain,
        features: requirement.features,
        extra: requirement.extra,
      },
      appTemplate,
      promptTemplatesByDimension,
    });
  }
}
