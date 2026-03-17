import api from './client';

export type FeedbackType = 'feature' | 'usage' | 'bug' | 'other';

export interface FeedbackPayload {
  type: FeedbackType | string;
  content: string;
  contact?: string;
  pageUrl?: string;
}

export const feedbackApi = {
  submit(payload: FeedbackPayload) {
    return api.post('/feedback', payload);
  },
};

export interface ContactSettings {
  wechat_group_qr_url: string | null;
  wechat_group_qr_updated_at: string | null;
  wechat_group_description?: string | null;
}

export const settingsApi = {
  getContact() {
    return api.get<ContactSettings>('/settings/contact');
  },
};

