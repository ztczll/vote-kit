import Router from '@koa/router';
import { Context } from 'koa';
import { aiService } from '../services/ai-factory.service';
import { authenticate } from '../middleware/auth.middleware';

const router = new Router({ prefix: '/api/ai' });

// AI生成需求和功能列表
router.post('/generate-requirement', authenticate, async (ctx: Context) => {
  try {
    const { description } = ctx.request.body as { description: string };

    if (!description || description.trim().length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请提供需求描述' };
      return;
    }

    console.log('🤖 Generating requirement with AI...');
    
    const generatedRequirement = await aiService.generateRequirement(description);

    ctx.body = {
      success: true,
      data: {
        title: generatedRequirement.title,
        scene: generatedRequirement.scene,
        pain: generatedRequirement.pain,
        features: generatedRequirement.features,
        value: generatedRequirement.value,
        originalDescription: description
      }
    };
  } catch (error: any) {
    console.error('❌ AI requirement generation failed:', error.message);
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'AI生成失败: ' + error.message 
    };
  }
});

// AI生成开发计划
router.post('/generate-dev-plan', authenticate, async (ctx: Context) => {
  try {
    const { title, scene, pain, features } = ctx.request.body as {
      title: string;
      scene: string;
      pain: string;
      features: string;
    };

    if (!title || !features) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请提供标题和功能描述' };
      return;
    }

    console.log('🤖 Generating development plan with AI...');
    
    const devPlan = await aiService.generateDevPlan({
      title,
      scene: scene || '',
      pain: pain || '',
      features
    });

    ctx.body = {
      success: true,
      data: {
        features: devPlan.features
      }
    };
  } catch (error: any) {
    console.error('❌ AI dev plan generation failed:', error.message);
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'AI开发计划生成失败: ' + error.message 
    };
  }
});

// 生成Forge引擎提示词
router.post('/generate-forge-prompt', authenticate, async (ctx: Context) => {
  try {
    const { requirements, features } = ctx.request.body as {
      requirements: {
        title: string;
        scene: string;
        pain: string;
        features: string;
        value: string;
      };
      features: Array<{
        title: string;
        description: string;
      }>;
    };

    if (!requirements || !features) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请提供需求信息和功能列表' };
      return;
    }

    // 生成结构化的Forge提示词
    const forgePrompt = {
      project: {
        name: requirements.title,
        description: requirements.scene,
        problem: requirements.pain,
        value: requirements.value
      },
      features: features.map(f => ({
        name: f.title,
        description: f.description,
        priority: 'high'
      })),
      technical_requirements: {
        framework: 'auto-detect',
        database: 'auto-select',
        deployment: 'containerized'
      },
      constraints: {
        development_time: 'optimize for speed',
        code_quality: 'production-ready',
        documentation: 'comprehensive'
      }
    };

    ctx.body = {
      success: true,
      data: {
        prompt: forgePrompt,
        formatted_prompt: JSON.stringify(forgePrompt, null, 2)
      }
    };
  } catch (error: any) {
    console.error('❌ Forge prompt generation failed:', error.message);
    ctx.status = 500;
    ctx.body = { 
      success: false, 
      message: 'Forge提示词生成失败: ' + error.message 
    };
  }
});

export default router;
