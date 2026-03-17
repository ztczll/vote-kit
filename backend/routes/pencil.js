const Router = require('koa-router');
const multer = require('@koa/multer');
const fs = require('fs').promises;
const path = require('path');
const PencilMCPClient = require('../services/pencilMCP');
const PencilRenderer = require('../services/pencilRenderer');

const router = new Router({ prefix: '/api/pencil' });
const upload = multer({ dest: 'uploads/pencil/' });

const pencilMCP = new PencilMCPClient();
const pencilRenderer = new PencilRenderer();

// 上传 .pen 文件
router.post('/upload', upload.single('file'), async (ctx) => {
  try {
    const file = ctx.file;
    const { name, projectId } = ctx.request.body;

    // 验证文件
    if (!file.originalname.endsWith('.pen')) {
      ctx.status = 400;
      ctx.body = { error: '只支持 .pen 文件' };
      return;
    }

    const penFilePath = file.path;
    const previewPath = `${file.path}.png`;

    // 尝试使用 Pencil MCP 生成预览
    let previewResult;
    try {
      previewResult = await pencilMCP.getScreenshot(penFilePath, previewPath);
      console.log('✓ 使用 Pencil MCP 生成预览');
    } catch (err) {
      console.log('⚠ Pencil MCP 失败，使用备用渲染器:', err.message);
      previewResult = await pencilRenderer.renderToImage(penFilePath, previewPath);
    }

    // 保存到数据库（这里简化为返回数据）
    const designData = {
      id: Date.now(),
      name: name || file.originalname,
      projectId: projectId || null,
      penFilePath: penFilePath,
      previewImagePath: previewPath,
      createdAt: new Date().toISOString()
    };

    ctx.body = designData;
  } catch (err) {
    console.error('上传失败:', err);
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 获取预览图
router.get('/preview/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // 这里应该从数据库查询，简化为直接读取
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
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 导出为代码
router.post('/export/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { format = 'react', framework = 'tailwind' } = ctx.request.body;

    const penFilePath = `uploads/pencil/${id}`;
    
    // 尝试使用 Pencil MCP 导出
    let exportResult;
    try {
      exportResult = await pencilMCP.exportToCode(penFilePath, format);
      console.log('✓ 使用 Pencil MCP 导出代码');
    } catch (err) {
      console.log('⚠ Pencil MCP 导出失败:', err.message);
      // 备用：读取设计数据并生成简单代码
      const designData = await pencilMCP.getDesignData(penFilePath);
      exportResult = {
        success: true,
        code: generateSimpleCode(designData, format, framework)
      };
    }

    ctx.body = {
      code: exportResult.code,
      format,
      framework
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 列出所有设计
router.get('/designs', async (ctx) => {
  try {
    const { projectId } = ctx.query;
    
    // 这里应该从数据库查询
    // 简化为读取目录
    const files = await fs.readdir('uploads/pencil/');
    const designs = files
      .filter(f => f.endsWith('.pen') || (!f.includes('.')))
      .map(f => ({
        id: f,
        name: f,
        previewImagePath: `uploads/pencil/${f}.png`
      }));

    ctx.body = designs;
  } catch (err) {
    ctx.status = 500;
    ctx.body = { error: err.message };
  }
});

// 简单代码生成器（备用）
function generateSimpleCode(design, format, framework) {
  const elements = design.elements || [];
  
  if (format === 'react') {
    return `export default function Component() {
  return (
    <div className="design-container">
      ${elements.map(el => {
        if (el.type === 'rectangle') {
          return `<div style={{
            width: '${el.width}px',
            height: '${el.height}px',
            backgroundColor: '${el.fill}',
            border: '${el.strokeWidth || 1}px solid ${el.stroke || 'transparent'}'
          }} />`;
        }
        if (el.type === 'text') {
          return `<p style={{
            fontSize: '${el.fontSize || 16}px',
            color: '${el.fill || '#000'}'
          }}>${el.content}</p>`;
        }
        return '';
      }).join('\n      ')}
    </div>
  );
}`;
  }
  
  return '// 不支持的格式';
}

module.exports = router;
