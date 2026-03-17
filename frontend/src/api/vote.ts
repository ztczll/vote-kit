import api from './client';
import type { VoteLimit } from '@/types';

export const voteApi = {
  vote(requirement_id: string) {
    return api.post('/votes', { requirement_id });
  },

  getLimit() {
    return api.get<VoteLimit>('/votes/limit');
  },
};
