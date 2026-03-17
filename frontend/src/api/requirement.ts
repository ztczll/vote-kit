import api from './client';
import type { Requirement, RequirementStatus } from '@/types';

export const requirementApi = {
  getList(params?: { status?: RequirementStatus; limit?: number; offset?: number }) {
    return api.get<{ requirements: Requirement[]; total: number }>('/requirements', { params });
  },

  getById(id: string) {
    return api.get<{ requirement: Requirement }>(`/requirements/${id}`);
  },

  getSpecPreview(id: string) {
    return api.get<{ spec: string; hasTemplateOrPrompts: boolean }>(`/requirements/${id}/spec-preview`);
  },

  create(data: {
    title: string;
    description: string;
    category: string;
    contact_info?: string;
    scene?: string;
    pain?: string;
    features?: string;
    extra?: string;
    app_template_id?: string | null;
    prompt_template_ids?: Record<string, string> | null;
  }) {
    return api.post<{ requirement: Requirement; moderationRejected?: boolean; moderationRejectReason?: string }>('/requirements', data);
  },

  getAppTemplates() {
    return api.get<{ data: Array<{ id: string; name: string; type_key: string }> }>('/requirements/app-templates');
  },

  getPromptTemplates(dimension?: string) {
    return api.get<{ data: Array<{ id: string; dimension: string; title: string }> }>(
      '/requirements/prompt-templates',
      dimension ? { params: { dimension } } : undefined
    );
  },

  approve(id: string) {
    return api.post<{ requirement: Requirement }>(`/requirements/${id}/approve`);
  },

  reject(id: string) {
    return api.post<{ requirement: Requirement }>(`/requirements/${id}/reject`);
  },

  updateStatus(id: string, status: RequirementStatus, assignedTo?: string, assignedToType?: string) {
    return api.post<{ requirement: Requirement }>(`/requirements/${id}/status`, { 
      status, 
      assigned_to: assignedTo,
      assigned_to_type: assignedToType
    });
  },

  /** 管理员删除需求（人工兜底） */
  deleteForAdmin(id: string) {
    return api.delete(`/admin/requirements/${id}`);
  },
};
