import api from './client';
import type { Comment } from '@/types';

export const commentApi = {
  getByRequirement(requirementId: string) {
    return api.get<{ comments: Comment[] }>(`/comments/requirement/${requirementId}`);
  },

  create(requirement_id: string, content: string) {
    return api.post<{ comment: Comment }>('/comments', { requirement_id, content });
  },
};
