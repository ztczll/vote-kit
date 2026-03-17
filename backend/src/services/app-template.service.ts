import db from '../database/db';

export interface AppTemplate {
  id: string;
  name: string;
  type_key: string;
  layer1_product_vision: string | null;
  layer2_functional_spec: string | null;
  layer3_impl_guidance: string | null;
  layer4_deployment_spec: string | null;
  sort_order: number;
  is_active: boolean;
  example_requirement_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AppTemplateInsert {
  name: string;
  type_key: string;
  layer1_product_vision?: string | null;
  layer2_functional_spec?: string | null;
  layer3_impl_guidance?: string | null;
  layer4_deployment_spec?: string | null;
  sort_order?: number;
  is_active?: boolean;
  example_requirement_id?: string | null;
}

export class AppTemplateService {
  async list(options?: { activeOnly?: boolean }): Promise<AppTemplate[]> {
    let q = db<AppTemplate>('app_templates').select('*').orderBy('sort_order', 'asc');
    if (options?.activeOnly) {
      q = q.where('is_active', true);
    }
    return q;
  }

  async getById(id: string): Promise<AppTemplate | null> {
    return db<AppTemplate>('app_templates').where('id', id).first() ?? null;
  }

  async create(data: AppTemplateInsert): Promise<AppTemplate> {
    await db('app_templates').insert({
      name: data.name,
      type_key: data.type_key,
      layer1_product_vision: data.layer1_product_vision ?? null,
      layer2_functional_spec: data.layer2_functional_spec ?? null,
      layer3_impl_guidance: data.layer3_impl_guidance ?? null,
      layer4_deployment_spec: data.layer4_deployment_spec ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
      example_requirement_id: data.example_requirement_id ?? null,
    });
    const row = await db<AppTemplate>('app_templates').where({ name: data.name, type_key: data.type_key }).orderBy('created_at', 'desc').first();
    if (!row) throw new Error('AppTemplate create failed');
    return row;
  }

  async update(id: string, data: Partial<AppTemplateInsert>): Promise<AppTemplate | null> {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.type_key !== undefined) payload.type_key = data.type_key;
    if (data.layer1_product_vision !== undefined) payload.layer1_product_vision = data.layer1_product_vision;
    if (data.layer2_functional_spec !== undefined) payload.layer2_functional_spec = data.layer2_functional_spec;
    if (data.layer3_impl_guidance !== undefined) payload.layer3_impl_guidance = data.layer3_impl_guidance;
    if (data.layer4_deployment_spec !== undefined) payload.layer4_deployment_spec = data.layer4_deployment_spec;
    if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    if (data.example_requirement_id !== undefined) payload.example_requirement_id = data.example_requirement_id;
    if (Object.keys(payload).length === 0) return this.getById(id);
    await db('app_templates').where('id', id).update(payload);
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const n = await db('app_templates').where('id', id).delete();
    return n > 0;
  }
}
