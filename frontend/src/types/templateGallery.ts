/**
 * 模板展示页（精选模板 / 中国特色模板）类型定义
 */

export type TemplateMainCategoryId =
  | 'all'
  | 'food'
  | 'culture'
  | 'retail'
  | 'education'
  | 'life'
  | 'enterprise';

export interface TemplateMainCategory {
  id: TemplateMainCategoryId;
  label: string;
}

export type StyleTag = '雅韵' | '国潮焕新' | '暗黑电影' | '极简现代' | '童趣插画';
export type FeatureTag =
  | '电商交易'
  | '预约预订'
  | '内容叙事'
  | '数据可视化'
  | '社区互动'
  | 'AR/VR体验';
export type ColorTag =
  | '朱砂红/赤色系'
  | '黛绿/石青'
  | '靛蓝/水墨'
  | '暖金/陶土'
  | '柔和粉彩';
export type DeviceTag = '响应式网站' | '移动APP' | '小程序';

export interface TemplateTags {
  style: StyleTag[];
  feature: FeatureTag[];
  color: ColorTag[];
  device: DeviceTag[];
}

export interface ChineseTemplateMeta {
  id: string;
  name: string;
  subTitle?: string;
  description: string;
  categoryId: Exclude<TemplateMainCategoryId, 'all'>;
  subCategory?: string;
  tags: TemplateTags;
  previewBg: string;
  previewColor: string;
  /** 可选：与后端 app_templates 关联，用于「用此模板提交」 */
  appTemplateKey?: string | null;
}
