import Router from '@koa/router';
import multer from '@koa/multer';
import fs from 'fs/promises';
import path from 'path';
import { Context } from 'koa';

const router = new Router({ prefix: '/api/pencil' });
const upload = multer({ dest: 'uploads/pencil/' });

// 导入服务
import PencilMCPClient from '../services/pencilMCP';

const pencilMCP = new PencilMCPClient();

// 上传 .pen 文件
router.post('/upload', upload.single('file'), async (ctx: Context) => {
  try {
    const file = (ctx.request as any).file;
    const { name, projectId } = ctx.request.body as any;

    if (!file || !file.originalname.endsWith('.pen')) {
      ctx.status = 400;
      ctx.body = { error: '只支持 .pen 文件' };
      return;
    }

    const penFilePath = file.path;
    const previewPath = `${file.path}.png`;

    // 使用 Pencil 原生截图
    let previewResult;
    try {
      previewResult = await pencilMCP.getScreenshot(penFilePath, previewPath);
      console.log('✓ 使用 Pencil 原生截图');
    } catch (err: any) {
      console.error('Pencil 截图失败:', err.message);
      ctx.status = 500;
      ctx.body = { error: '预览生成失败，请确保 Pencil 服务正常运行' };
      return;
    }

    const designData = {
      id: path.basename(file.path),
      name: name || file.originalname,
      projectId: projectId || null,
      penFilePath: penFilePath,
      previewImagePath: previewPath,
      createdAt: new Date().toISOString()
    };

    ctx.body = designData;
  } catch (err: any) {
    console.error('上传失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 获取预览图
router.get('/preview/:id', async (ctx: Context) => {
  try {
    const { id } = ctx.params;
    const previewPath = `uploads/pencil/${id}.png`;
    
    const exists = await fs.access(previewPath).then(() => true).catch(() => false);
    if (!exists) {
      ctx.status = 404;
      ctx.body = { error: '预览图不存在' };
      return;
    }

    const image = await fs.readFile(previewPath);
    ctx.type = 'image/png';
    ctx.body = image;
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 列出所有设计
router.get('/designs', async (ctx: Context) => {
  try {
    const files = await fs.readdir('uploads/pencil/');
    const designs = files
      .filter(f => !f.includes('.'))
      .map(f => ({
        id: f,
        name: f,
        previewImagePath: `/api/pencil/preview/${f}`
      }));

    ctx.body = designs;
  } catch (err: any) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

export default router;
