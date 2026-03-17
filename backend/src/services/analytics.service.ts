import db from '../database/db';

export class AnalyticsService {
  async track(event: {
    userId?: string;
    eventType: string;
    metadata?: any;
  }) {
    await db('analytics_events').insert({
      user_id: event.userId,
      event_type: event.eventType,
      metadata: JSON.stringify(event.metadata || {}),
    });
  }
}
