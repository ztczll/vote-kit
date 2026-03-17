/**
 * 展示墙配置：为已上线需求补充封面图、技术栈、体验链接等。
 * 若某需求 id 未在配置中，展示墙将使用默认占位图并链接到需求详情页。
 */
export interface ShowcaseConfigItem {
  coverImage?: string;
  techStack?: string[];
  experienceLink?: string;
  coverLabel?: string;
  placeholderIcon?: string;
}

export const showcaseConfig: Record<string, ShowcaseConfigItem> = {
  // 示例：当有已上线需求时，可按 id 补充配置
  // 'uuid-here': {
  //   coverImage: '/images/showcase/todo-app.webp',
  //   techStack: ['Vue 3', 'Express', 'MySQL'],
  //   experienceLink: 'https://demo.example.com/todo',
  //   coverLabel: '简洁直观的任务管理界面',
  // },
};

/**
 * 将需求列表与展示墙配置合并为 ShowcaseItem[]
 */
export function mergeShowcaseItems(
  requirements: Array<{ id: string; title: string; description: string; vote_count: number }>,
  config: Record<string, ShowcaseConfigItem>
): Array<{
  id: string;
  title: string;
  description: string;
  vote_count: number;
  coverImage?: string;
  techStack?: string[];
  experienceLink?: string;
  coverLabel?: string;
  placeholderIcon?: string;
}> {
  return requirements.map((req) => {
    const extra = config[req.id] || {};
    return {
      id: req.id,
      title: req.title,
      description: req.description.length > 100 ? req.description.slice(0, 100) + '...' : req.description,
      vote_count: req.vote_count,
      coverImage: extra.coverImage,
      techStack: extra.techStack ?? ['Vue 3', 'Express', 'MySQL'],
      experienceLink: extra.experienceLink,
      coverLabel: extra.coverLabel,
      placeholderIcon: extra.placeholderIcon,
    };
  });
}
