import db from '../database/db';
import redis from '../config/redis';
import { Requirement, RequirementStatus } from '../types/models';
import { AnalyticsService } from './analytics.service';
import { AppTemplateService } from './app-template.service';
import { PromptTemplateService } from './prompt-template.service';
import { deepSeekService } from './deepseek.service';

const analyticsService = new AnalyticsService();
const appTemplateService = new AppTemplateService();
const promptTemplateService = new PromptTemplateService();
const CACHE_TTL = 30; // 30 seconds

export class RequirementService {
  async create(data: { 
    title: string; 
    description: string; 
    scene?: string;
    pain?: string;
    features?: string;
    extra?: string;
    category: string; 
    contact_info?: string; 
    submitter_id: string;
    app_template_id?: string | null;
    prompt_template_ids?: Record<string, string> | null;
  }): Promise<{ requirement: Requirement; moderationRejected: boolean; moderationRejectReason?: string }> {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Description is required');
    }

    if (data.app_template_id) {
      const t = await appTemplateService.getById(data.app_template_id);
      if (!t || !t.is_active) {
        throw new Error('所选应用模板不存在或已禁用');
      }
    }

    if (data.prompt_template_ids && typeof data.prompt_template_ids === 'object') {
      const ids = Object.values(data.prompt_template_ids).filter(Boolean);
      if (ids.length > 0) {
        const prompts = await promptTemplateService.getByIds(ids);
        const idSet = new Set(prompts.map((p) => p.id));
        for (const id of ids) {
          if (!idSet.has(id)) throw new Error(`模板提示词不存在: ${id}`);
        }
        for (const p of prompts) {
          if (!p.is_active) throw new Error(`模板提示词已禁用: ${p.title}`);
        }
      }
    }

    const promptIdsJson = data.prompt_template_ids
      ? JSON.stringify(data.prompt_template_ids)
      : null;

    const textToModerate = [data.title, data.description, data.scene, data.pain, data.features, data.extra]
      .filter(Boolean)
      .join('\n');
    const moderation = await deepSeekService.moderateContent(textToModerate);
    const approved = moderation.pass;
    const initialStatus = approved ? '投票中' : '待审核';
    const rejectReason = approved ? null : (moderation.reason || '内容不符合规范');

    await db('requirements').insert({
      title: data.title,
      description: data.description,
      scene: data.scene,
      pain: data.pain,
      features: data.features,
      extra: data.extra,
      category: data.category,
      contact_info: data.contact_info,
      submitter_id: data.submitter_id,
      status: initialStatus,
      vote_count: 0,
      app_template_id: data.app_template_id || null,
      prompt_template_ids: promptIdsJson,
      moderation_reject_reason: rejectReason,
    });

    await analyticsService.track({
      userId: data.submitter_id,
      eventType: 'submit_requirement',
      metadata: { category: data.category },
    });

    await this.clearCache();
    const requirement = await db('requirements')
      .where({ submitter_id: data.submitter_id, title: data.title })
      .orderBy('created_at', 'desc')
      .first();
    return {
      requirement: requirement as Requirement,
      moderationRejected: !approved,
      moderationRejectReason: rejectReason || undefined,
    };
  }

  async getList(filters?: { status?: RequirementStatus | '开发中组'; limit?: number; offset?: number }): Promise<{ requirements: Requirement[]; total: number }> {
    const listCacheKey = `requirements:${filters?.status || 'all'}:${filters?.limit || 'all'}:${filters?.offset || 0}`;
    const totalCacheKey = `requirements:total:${filters?.status || 'all'}`;

    const cachedList = await redis.get(listCacheKey);
    const cachedTotal = await redis.get(totalCacheKey);
    if (cachedList != null && cachedTotal != null) {
      return { requirements: JSON.parse(cachedList), total: parseInt(cachedTotal, 10) };
    }

    let baseQuery = db('requirements');

    if (filters?.status) {
      if (filters.status === '开发中组') {
        baseQuery = baseQuery.whereIn('status', ['已采纳', '开发中', '测试中']);
      } else {
        baseQuery = baseQuery.where({ status: filters.status });
      }
    }

    const totalResult = await baseQuery.clone().count('* as count').first();
    const total = Number(totalResult?.count ?? 0);

    let listQuery = baseQuery
      .clone()
      .orderBy('vote_count', 'desc')
      .orderBy('created_at', 'desc');

    if (filters?.limit) {
      listQuery = listQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      listQuery = listQuery.offset(filters.offset);
    }

    const requirements = await listQuery;
    await redis.setex(listCacheKey, CACHE_TTL, JSON.stringify(requirements));
    await redis.setex(totalCacheKey, CACHE_TTL, String(total));
    return { requirements, total };
  }

  async getById(id: string, userId?: string): Promise<Requirement | null> {
    const requirement = await db('requirements').where({ id }).first();
    
    if (requirement && userId) {
      await analyticsService.track({
        userId,
        eventType: 'view_detail',
        metadata: { requirementId: id },
      });
    }
    
    return requirement;
  }

  async updateStatus(id: string, status: RequirementStatus, adminId: string, assignedTo?: string, assignedToType?: string): Promise<Requirement> {
    const requirement = await db('requirements').where({ id }).first();
    if (!requirement) {
      throw new Error('Requirement not found');
    }

    const validTransitions: Record<string, RequirementStatus[]> = {
      '待审核': ['投票中', '已拒绝'],
      '投票中': ['已采纳', '已拒绝'],
      '已采纳': ['开发中' as any, '已拒绝'],
      '开发中': ['测试中' as any],
      '测试中': ['已上线'],
      '已上线': [],
      '已拒绝': [],
    };

    if (!validTransitions[requirement.status]?.includes(status)) {
      throw new Error(`Cannot transition from ${requirement.status} to ${status}`);
    }

    await db('status_history').insert({
      requirement_id: id,
      from_status: requirement.status,
      to_status: status,
      admin_id: adminId,
    });

    const updateData: any = { status };
    if (assignedTo) {
      updateData.assigned_to = assignedTo;
      updateData.assigned_to_type = assignedToType || 'user';
    }

    await db('requirements').where({ id }).update(updateData);
    
    // 状态变更钩子：当状态变为"开发中"时，自动创建开发计划
    if (status === '开发中' as any) {
      await this.createDevelopmentPlan(id);
    }
    
    await this.clearCache();
    return await db('requirements').where({ id }).first() as Requirement;
  }

  private async createDevelopmentPlan(requirementId: string): Promise<void> {
    // 检查是否已存在开发计划
    const existing = await db('development_plans').where({ requirement_id: requirementId }).first();
    if (existing) {
      return; // 已存在，不重复创建
    }

    // 创建开发计划（7天投票期）
    const votingEndDate = new Date();
    votingEndDate.setDate(votingEndDate.getDate() + 7);

    await db('development_plans').insert({
      requirement_id: requirementId,
      voting_end_date: votingEndDate,
      status: 'voting'
    });
  }

  async approve(id: string, adminId: string): Promise<Requirement> {
    return await this.updateStatus(id, '投票中', adminId);
  }

  async reject(id: string, adminId: string): Promise<Requirement> {
    return await this.updateStatus(id, '已拒绝', adminId);
  }

  // 新增：开发者提交开发计划时调用，状态从"已采纳"转为"开发中"
  async startDevelopment(id: string, developerId: string): Promise<Requirement> {
    return await this.updateStatus(id, '开发中' as any, developerId);
  }

  // 新增：AI应用生成完成时调用，状态从"开发中"转为"测试中"
  async completeGeneration(id: string, systemId: string = 'system'): Promise<Requirement> {
    return await this.updateStatus(id, '测试中' as any, systemId);
  }

  // 新增：应用部署完成时调用，状态从"测试中"转为"已上线"
  async deployComplete(id: string, adminId: string): Promise<Requirement> {
    return await this.updateStatus(id, '已上线', adminId);
  }

  async delete(id: string): Promise<boolean> {
    const row = await db('requirements').where({ id }).first();
    if (!row) return false;
    await db('requirements').where({ id }).del();
    await this.clearCache();
    return true;
  }

  async updatePrototypeScreenshot(id: string, url: string): Promise<void> {
    await db('requirements').where({ id }).update({ prototype_screenshot_url: url });
    await this.clearCache();
  }

  private async clearCache(): Promise<void> {
    const keys = await redis.keys('requirements:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
