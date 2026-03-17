/**
 * 成功故事与案例研究 - 静态数据
 */
export interface SuccessStory {
  id: string;
  title: string;
  userQuote: string;
  userName: string;
  process: string;
  solution: string;
  testimonial: string;
  appName: string;
  coverImage?: string;
  experienceLink?: string;
}

export const successStories: SuccessStory[] = [
  {
    id: '1',
    title: '从「手动整理」到「一键生成」：新媒体小编的素材库诞生记',
    userQuote: '作为新媒体小编，我每天要保存上百张图片和文章链接，用文件夹整理效率极低，经常找不到。',
    userName: '小美',
    process: '小美在平台提交了「一个能分类收藏图片和链接的工具」需求，3天内获得 152 票支持，高票入选开发队列。',
    solution: '平台通过 AI 生成了「灵感收藏夹」应用，支持拖拽上传、打标签和全文搜索，完美解决素材管理难题。',
    testimonial: '现在我的素材整理时间从每天1小时缩短到10分钟，这个由我们自己投票出来的工具真的懂我们！',
    appName: '灵感收藏夹',
    experienceLink: 'http://115.190.193.135:8082',
  },
  {
    id: '2',
    title: '高票需求如何变成可用的应用',
    userQuote: '我们团队需要一个简单的任务看板，市面上的工具要么太复杂要么要付费。',
    userName: '小明',
    process: '小明提交了「团队任务看板」需求，获得社区 127 票支持，高票进入开发。',
    solution: 'AI 根据需求生成了轻量级任务看板应用，支持看板列、拖拽排序和成员分配，满足小团队日常协作。',
    testimonial: '从投票到上线不到两周，用自己投票出来的产品特别有参与感。',
    appName: '每日任务管家',
    experienceLink: '/',
  },
];
