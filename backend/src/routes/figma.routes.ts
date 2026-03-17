import Router from '@koa/router';
import { Context } from 'koa';
import FigmaService from '../services/figmaService';

const router = new Router({ prefix: '/api/figma' });

// 从环境变量获取 Figma Token
const figmaToken = process.env.FIGMA_TOKEN || '';
const figmaService = new FigmaService({ token: figmaToken });

// 从需求生成原型图
router.post('/generate-prototype', async (ctx: Context) => {
  try {
    const { requirement, fileId } = ctx.request.body as any;

    if (!requirement) {
      ctx.status = 400;
      ctx.body = { error: '需求描述不能为空' };
      return;
    }

    if (!figmaToken) {
      ctx.status = 500;
      ctx.body = { error: 'Figma Token 未配置' };
      return;
    }

    // 生成设计建议
    const design = await figmaService.generateDesignFromRequirement(requirement);

    ctx.body = {
      success: true,
      design,
      message: '原型图生成建议已创建'
    };
  } catch (err: any) {
    console.error('生成原型图失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 获取 Figma 文件信息
router.get('/file/:fileId', async (ctx: Context) => {
  try {
    const { fileId } = ctx.params;

    if (!figmaToken) {
      ctx.status = 500;
      ctx.body = { error: 'Figma Token 未配置' };
      return;
    }

    const file = await figmaService.getFile(fileId);
    ctx.body = file;
  } catch (err: any) {
    console.error('获取文件失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 获取设计截图
router.post('/images', async (ctx: Context) => {
  try {
    const { fileId, nodeIds } = ctx.request.body as any;

    if (!fileId || !nodeIds || !Array.isArray(nodeIds)) {
      ctx.status = 400;
      ctx.body = { error: '参数错误' };
      return;
    }

    if (!figmaToken) {
      ctx.status = 500;
      ctx.body = { error: 'Figma Token 未配置' };
      return;
    }

    const images = await figmaService.getImages(fileId, nodeIds);
    ctx.body = images;
  } catch (err: any) {
    console.error('获取截图失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 导出为代码
router.post('/export/:fileId/:nodeId', async (ctx: Context) => {
  try {
    const { fileId, nodeId } = ctx.params;
    const { format = 'react' } = ctx.request.body as any;

    if (!figmaToken) {
      ctx.status = 500;
      ctx.body = { error: 'Figma Token 未配置' };
      return;
    }

    const result = await figmaService.exportToCode(fileId, nodeId, format);
    ctx.body = result;
  } catch (err: any) {
    console.error('导出失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
