import db from '../database/db';

export const PROMPT_DIMENSIONS = [
  'business_logic',
  'ui_ux',
  'tech_arch',
  'data_model',
  'test_strategy',
  'deployment',
  'security_compliance',
] as const;

export type PromptDimension = (typeof PROMPT_DIMENSIONS)[number];

export interface PromptTemplate {
  id: string;
  dimension: string;
  title: string;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PromptTemplateInsert {
  dimension: string;
  title: string;
  content: string;
  sort_order?: number;
  is_active?: boolean;
}

export class PromptTemplateService {
  async list(options?: { dimension?: string; activeOnly?: boolean }): Promise<PromptTemplate[]> {
    let q = db<PromptTemplate>('prompt_templates').select('*').orderBy('dimension').orderBy('sort_order', 'asc');
    if (options?.dimension) {
      q = q.where('dimension', options.dimension);
    }
    if (options?.activeOnly) {
      q = q.where('is_active', true);
    }
    return q;
  }

  async getById(id: string): Promise<PromptTemplate | null> {
    return db<PromptTemplate>('prompt_templates').where('id', id).first() ?? null;
  }

  async getByIds(ids: string[]): Promise<PromptTemplate[]> {
    if (ids.length === 0) return [];
    return db<PromptTemplate>('prompt_templates').whereIn('id', ids);
  }

  async create(data: PromptTemplateInsert): Promise<PromptTemplate> {
    await db('prompt_templates').insert({
      dimension: data.dimension,
      title: data.title,
      content: data.content,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });
    const row = await db<PromptTemplate>('prompt_templates')
      .where({ dimension: data.dimension, title: data.title })
      .orderBy('created_at', 'desc')
      .first();
    if (!row) throw new Error('PromptTemplate create failed');
    return row;
  }

  async update(id: string, data: Partial<PromptTemplateInsert>): Promise<PromptTemplate | null> {
    const payload: Record<string, unknown> = {};
    if (data.dimension !== undefined) payload.dimension = data.dimension;
    if (data.title !== undefined) payload.title = data.title;
    if (data.content !== undefined) payload.content = data.content;
    if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    if (Object.keys(payload).length === 0) return this.getById(id);
    await db('prompt_templates').where('id', id).update(payload);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const n = await db('prompt_templates').where('id', id).delete();
    return n > 0;
  }
}
