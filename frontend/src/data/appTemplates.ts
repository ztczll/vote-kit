/**
 * 智能向导 - 应用功能模板与 UI 风格模板数据
 * 对应规划 Step 1：模板数据与类型设计
 */
import type { AppTemplateMeta, UiStyleOption } from '@/types/wizard';

/** 应用功能模板列表：复杂度、典型生成时间、社会证明等 */
export const appTemplates: AppTemplateMeta[] = [
  {
    id: 'shop-keeper',
    title: '微信小店管家',
    description: '商品管理、订单处理和销售数据可视化的一站式小店后台。',
    category: 'ecommerce',
    categoryLabel: '电商零售',
    complexity: 3,
    typicalTime: '2-4 分钟',
    socialProof: '168 位卖家选择了这个模板',
    icon: 'fas fa-store',
    previewBg: '#4A90E220',
    previewColor: '#4A90E2',
  },
  {
    id: 'blog-cms',
    title: '个人博客管理系统',
    description: '创建、管理与发布文章的轻量内容管理后台。',
    category: 'content',
    categoryLabel: '内容管理',
    complexity: 2,
    typicalTime: '1-3 分钟',
    socialProof: '96 位创作者正在使用',
    icon: 'fas fa-blog',
    previewBg: '#7B61FF20',
    previewColor: '#7B61FF',
  },
  {
    id: 'team-kanban',
    title: '团队任务看板',
    description: '支持多成员协作、进度跟踪与看板视图的项目管理工具。',
    category: 'team',
    categoryLabel: '团队协作',
    complexity: 4,
    typicalTime: '3-6 分钟',
    socialProof: '42 个小团队在使用',
    icon: 'fas fa-tasks',
    previewBg: '#52C41A20',
    previewColor: '#52C41A',
  },
  {
    id: 'dashboard',
    title: '业务数据仪表盘',
    description: '整合多源数据，生成可视化图表与关键指标看板。',
    category: 'tool',
    categoryLabel: '数据工具',
    complexity: 4,
    typicalTime: '3-6 分钟',
    socialProof: '58 位数据分析师收藏',
    icon: 'fas fa-chart-line',
    previewBg: '#FAAD1420',
    previewColor: '#FAAD14',
  },
  {
    id: 'personal-finance',
    title: '个人财务管理',
    description: '记录收支、设定预算与查看分析报表的个人理财工具。',
    category: 'personal',
    categoryLabel: '个人工具',
    complexity: 3,
    typicalTime: '2-4 分钟',
    socialProof: '73 位用户正在追踪消费',
    icon: 'fas fa-wallet',
    previewBg: '#F5222D20',
    previewColor: '#F5222D',
  },
];

/** 分类筛选选项 */
export const templateCategories = [
  { key: 'all', label: '全部' },
  { key: 'ecommerce', label: '电商零售' },
  { key: 'content', label: '内容管理' },
  { key: 'tool', label: '数据/效率工具' },
  { key: 'team', label: '团队协作' },
  { key: 'personal', label: '个人工具' },
] as const;

/** UI 风格模板：现代极简 / 温馨亲和 / 专业数据感 / 苹果风 */
export const uiTemplates: UiStyleOption[] = [
  { id: 'modern-minimal', title: '🎨 现代极简', desc: '留白多、对比清晰，适合后台类应用' },
  { id: 'warm-friendly', title: '🎨 温馨亲和', desc: '圆角与柔和配色，适合 C 端用户' },
  { id: 'professional-data', title: '🎨 专业数据感', desc: '深色主题 + 图表突出，适合数据中台' },
  { id: 'apple-style', title: '🎨 苹果风', desc: '毛玻璃与精致间距，适合高端工具' },
];
