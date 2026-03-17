import db from '../database/db';
import { aiService } from './ai-factory.service';

export class DataMigrationService {
  async regenerateRequirements(limit?: number): Promise<{ success: number; failed: number; total: number }> {
    const query = db('requirements').select('*');
    if (limit) query.limit(limit);
    
    const requirements = await query;
    let success = 0, failed = 0;

    for (const req of requirements) {
      try {
        console.log(`🔄 Regenerating requirement ${req.id}: ${req.title}`);
        
        const generated = await aiService.generateRequirement(req.original_description || req.title);
        
        await db('requirements').where('id', req.id).update({
          title: generated.title,
          scene: generated.scene,
          pain_points: generated.pain,
          features: generated.features,
          value: generated.value,
          ai_provider: process.env.AI_PROVIDER || 'deepseek',
          updated_at: new Date()
        });
        
        success++;
      } catch (error: any) {
        console.error(`❌ Failed to regenerate requirement ${req.id}:`, error.message);
        failed++;
      }
    }

    return { success, failed, total: requirements.length };
  }

  async regenerateDevPlans(limit?: number): Promise<{ success: number; failed: number; total: number }> {
    const query = db('development_plans as dp')
      .join('requirements as r', 'dp.requirement_id', 'r.id')
      .select('dp.*', 'r.title', 'r.scene', 'r.pain_points', 'r.features');
    
    if (limit) query.limit(limit);
    
    const plans = await query;
    let success = 0, failed = 0;

    for (const plan of plans) {
      try {
        console.log(`🔄 Regenerating dev plan ${plan.id} for requirement: ${plan.title}`);
        
        const generated = await aiService.generateDevPlan({
          title: plan.title,
          scene: plan.scene || '',
          pain: plan.pain_points || '',
          features: plan.features || ''
        });

        // 删除旧功能点
        await db('plan_features').where('plan_id', plan.id).delete();
        
        // 插入新功能点
        for (const feature of generated.features) {
          await db('plan_features').insert({
            plan_id: plan.id,
            title: feature.title,
            description: feature.description,
            votes: 0
          });
        }

        await db('development_plans').where('id', plan.id).update({
          ai_provider: process.env.AI_PROVIDER || 'deepseek',
          updated_at: new Date()
        });
        
        success++;
      } catch (error: any) {
        console.error(`❌ Failed to regenerate dev plan ${plan.id}:`, error.message);
        failed++;
      }
    }

    return { success, failed, total: plans.length };
  }

  async getRegenerationStats() {
    const [reqStats, planStats] = await Promise.all([
      db('requirements').select('ai_provider').count('* as count').groupBy('ai_provider'),
      db('development_plans').select('ai_provider').count('* as count').groupBy('ai_provider')
    ]);

    return {
      requirements: reqStats.reduce((acc, stat) => {
        acc[stat.ai_provider || 'unknown'] = parseInt(stat.count as string);
        return acc;
      }, {} as Record<string, number>),
      devPlans: planStats.reduce((acc, stat) => {
        acc[stat.ai_provider || 'unknown'] = parseInt(stat.count as string);
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

export const dataMigrationService = new DataMigrationService();
