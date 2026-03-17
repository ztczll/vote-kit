import Router from '@koa/router';
import { Context } from 'koa';

const router = new Router();

// 生成需求 (简化版本)
router.post('/generate-requirement', async (ctx: Context) => {
  try {
    const { description } = ctx.request.body as { description: string };

    if (!description || description.trim().length < 10) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请输入至少10个字符的需求描述' };
      return;
    }

    console.log('📥 Received generation request:', description.substring(0, 50) + '...');

    // 简化的需求生成逻辑，不依赖AI服务
    const result = generateSimpleRequirement(description);

    ctx.body = {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('AI generation error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '需求生成失败，请稍后重试'
    };
  }
});

// 生成开发计划 (简化版本)
router.post('/generate-dev-plan', async (ctx: Context) => {
  try {
    const { title, scene, pain, features } = ctx.request.body as {
      title: string;
      scene: string;
      pain: string;
      features: string;
    };

    if (!title || !scene || !pain || !features) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请提供完整的需求信息' };
      return;
    }

    console.log('📥 Received dev plan generation request:', title);

    // 简化的开发计划生成
    const result = generateSimpleDevPlan({ title, scene, pain, features });

    ctx.body = {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Dev plan generation error:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '开发计划生成失败，请稍后重试'
    };
  }
});

// 简化的需求生成函数
function generateSimpleRequirement(description: string) {
  // 基于描述生成结构化需求
  const title = description.length > 50 ? 
    description.substring(0, 47) + '...' : 
    description;

  return {
    title: title,
    scene: `用户在日常使用中遇到了相关需求：${description}。这个场景下需要一个便捷的解决方案来提升效率和用户体验。`,
    pain: `当前的痛点是：缺少专门的工具来处理这类需求，用户需要手动操作，耗时且效率低下。希望通过技术手段来简化和优化这个流程。`,
    features: `1. 核心功能：${description.split('，')[0] || description.substring(0, 30)}\n2. 用户友好的界面设计\n3. 高效的数据处理能力\n4. 响应式设计支持多设备`,
    value: `这个需求能够帮助用户节省时间，提高工作效率，减少重复性劳动，提升整体的用户体验和满意度。`
  };
}

// 简化的开发计划生成函数
function generateSimpleDevPlan(requirementInfo: { title: string; scene: string; pain: string; features: string }) {
  const { title, features } = requirementInfo;
  
  // 基于功能描述生成开发计划
  const featureList = features.split(/[，,、\n]/).filter(f => f.trim());
  
  const planFeatures = [
    {
      title: `${title}核心功能模块`,
      description: `实现${title}的核心功能，包括${featureList.slice(0, 2).join('、')}等关键特性。采用模块化架构设计，确保系统的可扩展性和维护性。`
    },
    {
      title: "用户界面与交互设计",
      description: `设计直观友好的用户界面，提供良好的用户体验。实现响应式布局，支持多设备访问，确保界面简洁易用。`
    },
    {
      title: "数据处理与存储系统",
      description: `构建高效的数据处理架构，支持${featureList.slice(2).join('、')}等功能的数据需求。实现数据的安全存储、快速检索和实时同步。`
    },
    {
      title: "性能优化与系统监控",
      description: `实现系统性能监控和优化机制，确保${title}在高并发场景下的稳定运行。包括响应时间优化、资源使用监控、错误日志收集等功能。`
    }
  ];

  return {
    features: planFeatures
  };
}

export default router;
