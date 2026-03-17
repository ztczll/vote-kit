import Router from '@koa/router';
import { Context } from 'koa';
import { authenticate } from '../middleware/auth.middleware';
import { deepSeekService } from '../services/deepseek.service';

const router = new Router({ prefix: '/api/wizard' });

const WIZARD_TEMPLATES = [
  { id: 'shop-keeper', title: '微信小店管家', description: '商品管理、订单与销售数据可视化' },
  { id: 'blog-cms', title: '个人博客管理系统', description: '创建、管理与发布文章' },
  { id: 'team-kanban', title: '团队任务看板', description: '多成员协作与进度跟踪' },
  { id: 'dashboard', title: '业务数据仪表盘', description: '多源数据与可视化图表' },
  { id: 'personal-finance', title: '个人财务管理', description: '收支记录与预算分析' },
];

router.post('/recommend-template', authenticate, async (ctx: Context) => {
  const { description } = ctx.request.body as { description?: string };
  const text = (description || '').trim().toLowerCase();

  try {
    const { recommendedId, reason } = await deepSeekService.recommendTemplate(text, WIZARD_TEMPLATES);
    ctx.body = { success: true, data: { recommendedId, reason } };
  } catch (err) {
    let recommended = 'shop-keeper';
    if (text.includes('博客') || text.includes('blog') || text.includes('文章')) recommended = 'blog-cms';
    else if (text.includes('团队') || text.includes('协作') || text.includes('任务')) recommended = 'team-kanban';
    else if (text.includes('数据') || text.includes('报表') || text.includes('dashboard')) recommended = 'dashboard';
    else if (text.includes('记账') || text.includes('财务') || text.includes('支出')) recommended = 'personal-finance';
    ctx.body = { success: true, data: { recommendedId: recommended } };
  }
});

router.post('/suggest-names', authenticate, async (ctx: Context) => {
  const { templateTitle, oneLiner } = ctx.request.body as { templateTitle?: string; oneLiner?: string };
  const base = templateTitle || '应用';
  const cat = '助手';

  try {
    const { suggestions } = await deepSeekService.suggestNames(base, oneLiner || '');
    ctx.body = { success: true, data: { suggestions } };
  } catch {
    ctx.body = {
      success: true,
      data: {
        suggestions: [`智能${base}`, `我的${cat}助手`, `${base} Pro`],
      },
    };
  }
});

router.post('/suggest-fields', authenticate, async (ctx: Context) => {
  const { domain, templateId } = ctx.request.body as { domain?: string; templateId?: string };

  try {
    const { fields } = await deepSeekService.suggestFields(domain || '', templateId || '');
    ctx.body = { success: true, data: fields };
  } catch {
    const list =
      domain && (domain.includes('健身') || domain.includes('补剂'))
        ? [
            { id: 'flavor', label: '口味', reason: '健身补剂用户常按口味偏好选择商品' },
            { id: 'level', label: '适用阶段', reason: '区分初级 / 中级 / 高级训练阶段' },
          ]
        : [
            { id: 'tag', label: '标签', reason: '方便对实体进行多维度分类与检索' },
            { id: 'status', label: '状态', reason: '跟踪生命周期，如草稿 / 已发布 / 归档' },
          ];
    ctx.body = { success: true, data: list };
  }
});

router.post('/suggest-features', authenticate, async (ctx: Context) => {
  const { templateId } = ctx.request.body as { templateId?: string };

  try {
    const { features } = await deepSeekService.suggestFeatures(templateId || '');
    ctx.body = { success: true, data: features };
  } catch {
    const common = [
      { id: 'dashboard', label: '数据看板', hint: '集中展示关键指标和趋势' },
      { id: 'member', label: '会员 / 用户体系', hint: '支持多用户与分级权益' },
    ];
    const extra =
      templateId === 'shop-keeper'
        ? [
            { id: 'recommendation', label: '补剂搭配推荐', hint: '提升客单价与复购率' },
            { id: 'supplier', label: '供应商管理', hint: '适合多渠道进货场景' },
            ...common,
          ]
        : common;
    ctx.body = { success: true, data: extra };
  }
});

router.post('/refine-section', authenticate, async (ctx: Context) => {
  const { sectionKey, currentText, userIntent } = ctx.request.body as {
    sectionKey?: string;
    currentText?: string;
    userIntent?: string;
  };
  if (currentText === undefined || currentText === null) {
    ctx.status = 400;
    ctx.body = { success: false, message: '缺少 currentText' };
    return;
  }
  try {
    const { refinedText } = await deepSeekService.refineSection(
      sectionKey || 'overview',
      String(currentText),
      userIntent || '更清晰、专业'
    );
    ctx.body = { success: true, data: { refinedText } };
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { success: false, message: err?.message || 'AI 改写失败' };
  }
});

/** 生成多维规格文档（V1 服务端拼接，V2 可切换为 AI 生成） */
interface GenerateSpecBody {
  wizardState?: {
    appName?: string;
    oneLiner?: string;
    scene?: string;
    pain?: string;
    dataFields?: string[];
    features?: string[];
    uiStyle?: string;
    platforms?: string[];
    dataScale?: string;
    permission?: string;
  };
  appTemplateId?: string | null;
  appTemplateTitle?: string;
  uiTemplateId?: string;
  dataFieldLabels?: Array<{ id: string; label: string }>;
  featureLabels?: string[];
}

function buildSpecSections(body: GenerateSpecBody): {
  overview: string;
  functions: string;
  design: string;
  tech: string;
  prompt: string;
} {
  const ws = body.wizardState || {};
  const templateTitle = body.appTemplateTitle || '自定义应用';
  const featureLabels = body.featureLabels || [];
  const dataFieldLabels = body.dataFieldLabels || [];
  const fieldsLine =
    dataFieldLabels.length > 0
      ? dataFieldLabels.map((f) => `- ${f.label}`).join('\n')
      : '- 暂未定义字段，请在 Wizard 中补充数据模型。';
  const uiStyle = ws.uiStyle || 'modern-minimal';
  const uiLabel =
    uiStyle === 'warm-friendly'
      ? '温馨亲和'
      : uiStyle === 'professional-data'
        ? '专业数据感'
        : uiStyle === 'apple-style'
          ? '苹果风'
          : '现代极简';
  const mainColor =
    uiStyle === 'warm-friendly'
      ? '#7B61FF'
      : uiStyle === 'professional-data'
        ? '#1A1A1A'
        : uiStyle === 'apple-style'
          ? '#007AFF'
          : '#4A90E2';
  const secondaryColor =
    uiStyle === 'warm-friendly'
      ? '#FFF9F0'
      : uiStyle === 'professional-data'
        ? '#2D2D2D'
        : uiStyle === 'apple-style'
          ? '#F5F5F7'
          : '#F5F7FA';
  const tpl = WIZARD_TEMPLATES.find((t) => t.id === (body.appTemplateId || ''));
  const complexityStars = tpl ? '★★★☆☆' : '★★★☆☆';

  const overview = [
    '# 应用概览',
    '',
    '## 基本信息',
    `- 应用名称：${ws.appName || '（未命名）'}`,
    `- 应用类型：${templateTitle}`,
    `- 一句话介绍：${ws.oneLiner || '（待补充）'}`,
    `- 模板复杂度：${complexityStars}`,
    '- 推荐技术栈：Vue 3 + Node.js + SQLite/PostgreSQL',
    '',
    '## 核心目标',
    ws.scene ? `- 使用场景：${ws.scene}` : '- 使用场景：待补充',
    ws.pain ? `- 解决痛点：${ws.pain}` : '- 解决痛点：待补充',
    '',
    '## 功能模块一览',
    featureLabels.length > 0 ? featureLabels.map((f) => `- ${f}`).join('\n') : '- （尚未选择功能模块）',
  ].join('\n');

  const featuresDetail = featureLabels
    .map((f, idx) => `### ${idx + 1}. ${f}\n- 描述：围绕该模块设计典型的用户操作流程与状态流转。`)
    .join('\n\n');
  const functions = [
    '# 功能规格',
    '',
    '## 1. 核心数据模型',
    '### 主实体（例如：商品 / 任务 / 条目）',
    fieldsLine,
    '',
    '## 2. 功能模块详情',
    featuresDetail || '- 基于上一步选择的功能模块，在此处由 AI 进一步展开实现细节。',
  ].join('\n');

  const design = [
    '# UI / UX 设计规格',
    '',
    '## 设计风格',
    `- 风格：${uiLabel}`,
    `- 主色：${mainColor}`,
    `- 辅色：${secondaryColor}`,
    '- 字体：系统字体，-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    `- 圆角：${uiStyle === 'warm-friendly' ? '12px' : '8px'}`,
    '- 间距系统：8px 基准（8 / 16 / 24 / 32 ...）',
    '',
    '## 布局结构',
    '- 顶部导航：显示应用名称与主导航入口',
    '- 左侧栏：功能模块导航（可折叠）',
    '- 主内容区：卡片 + 表格 + 图表组合',
    '- 底部：版权信息与外部链接',
  ].join('\n');

  const platforms = ws.platforms || ['web'];
  const dataScale = ws.dataScale || 'medium';
  const tech = [
    '# 技术约束',
    '',
    '## 开发栈',
    '- 前端：Vue 3 + Vite + Element Plus',
    platforms.includes('mobile')
      ? '- 移动端：优先支持移动端布局，推荐使用响应式栅格与断点设计'
      : '- 响应式：桌面优先，兼顾移动端体验',
    '- 后端：Node.js + Express',
    dataScale === 'large'
      ? '- 数据库：PostgreSQL，注意读写分离与索引优化'
      : '- 数据库：SQLite / PostgreSQL（中小规模优先 SQLite）',
    '- 容器化：须在应用根目录提供 Dockerfile，支持 docker build / tag / push 至 ACR。',
    '',
    '## 性能 & 安全',
    '- 列表加载：100 条记录内接口响应 < 2s',
    '- 权限控制：基于角色的接口访问控制',
    '- 日志：记录关键操作与错误堆栈，便于排查',
  ].join('\n');

  // 规范化的 forgePrompt：供后续「开始 AI Coding」时直接传给 Forge 引擎
  const prompt = [
    '# AI Coding 提示词（供 Forge / 代理模型使用）',
    '',
    '你是一个资深全栈工程师，请基于以下需求设计并实现一个完整 Web 应用：',
    '',
    '## 应用上下文',
    `- 名称：${ws.appName || '（未命名）'}`,
    `- 类型：${templateTitle}`,
    `- 一句话介绍：${ws.oneLiner || '（待补充）'}`,
    ws.scene ? `- 使用场景：${ws.scene}` : '',
    ws.pain ? `- 解决痛点：${ws.pain}` : '',
    '',
    '## 功能需求',
    featureLabels.length > 0
      ? featureLabels.map((f) => `- ${f}`).join('\n')
      : '- 用户尚未详细勾选功能模块，请根据场景与痛点推断合理的 MVP 功能。',
    '',
    '## UI / UX 要求',
    `- 设计风格：${uiLabel}`,
    `- 主色调：${mainColor}`,
    '- 使用 Element Plus 组件库统一界面交互与样式。',
    '',
    '## 技术约束',
    '- 前端：Vue 3 + Vite + TypeScript + Element Plus',
    `- 后端：Node.js + Express + ${dataScale === 'large' ? 'PostgreSQL' : 'SQLite / PostgreSQL'}`,
    '- 身份认证：JWT / Session 中至少选一种，并封装统一中间件。',
    '',
    '## Docker 与容器化部署（必选）',
    '- 必须在应用**根目录**提供 **Dockerfile**，使在项目根目录执行 `docker build -t <镜像名>:latest .` 即可构建出可运行镜像。',
    '- 镜像需支持后续：`docker tag <镜像名>:latest registry.cn-shanghai.aliyuncs.com/<命名空间>/<镜像名>:latest` 与 `docker push` 至阿里云 ACR。',
    '- 建议提供 **.dockerignore**，排除 node_modules、.git、日志等，以减小构建上下文、加快构建。',
    '',
    '## 输出格式',
    '请按以下结构输出代码：',
    '1. 数据库模型与迁移设计',
    '2. 后端 API 设计与实现',
    '3. 前端页面与组件结构',
    '4. 关键业务流程与状态流转',
    '5. 基本部署与运行说明',
    '6. Dockerfile（必选）及可选的 .dockerignore，支持在根目录执行 docker build，并支持 tag/push 至阿里云 ACR。',
  ].join('\n');

  return { overview, functions, design, tech, prompt };
}

router.post('/generate-spec', authenticate, async (ctx: Context) => {
  const body = ctx.request.body as GenerateSpecBody;
  const ws = body.wizardState || {};
  const appName = (ws.appName || '').trim();
  const oneLiner = (ws.oneLiner || '').trim();

  if (appName && oneLiner) {
    try {
      console.log(`[wizard] Calling DeepSeek for spec generation: ${appName}`);
      const spec = await deepSeekService.generateSpecFromClarification({
        appTemplateTitle: body.appTemplateTitle || '自定义应用',
        appName,
        oneLiner,
        scene: ws.scene || '',
        pain: ws.pain || '',
        platforms: ws.platforms || ['web'],
      });
      console.log(`[wizard] DeepSeek spec generation succeeded`);
      ctx.body = { success: true, data: spec };
      return;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.warn(`[wizard] generateSpecFromClarification failed, fallback to buildSpecSections:`, errorMsg);

      // 如果是超时错误，明确告知用户
      if (errorMsg.includes('timeout') || errorMsg.includes('Timeout') || errorMsg.includes('ETIMEDOUT')) {
        console.warn(`[wizard] DeepSeek API timeout detected, using fallback template`);
        // 继续使用 fallback，不中断流程
      }
    }
  }

  try {
    console.log(`[wizard] Using fallback buildSpecSections`);
    const spec = buildSpecSections(body);
    ctx.body = { success: true, data: spec };
  } catch (err: any) {
    console.error(`[wizard] buildSpecSections failed:`, err);
    ctx.status = 500;
    ctx.body = { success: false, message: err?.message || '生成规格失败' };
  }
});

export default router;

