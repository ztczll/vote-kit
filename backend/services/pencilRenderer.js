const { createCanvas } = require('canvas');
const fs = require('fs').promises;

class PencilRenderer {
  async renderToImage(penFilePath, outputPath) {
    const content = await fs.readFile(penFilePath, 'utf-8');
    const design = JSON.parse(content);

    // 计算画布大小
    const elements = design.elements || [];
    let maxX = 800, maxY = 600;
    
    elements.forEach(el => {
      if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0) + 50;
      if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0) + 50;
    });

    const canvas = createCanvas(maxX, maxY);
    const ctx = canvas.getContext('2d');

    // 白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 渲染元素
    for (const el of elements) {
      switch (el.type) {
        case 'rectangle':
          this.renderRectangle(ctx, el);
          break;
        case 'text':
          this.renderText(ctx, el);
          break;
        case 'circle':
          this.renderCircle(ctx, el);
          break;
      }
    }

    // 保存为 PNG
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    
    return { success: true, output: outputPath, width: maxX, height: maxY };
  }

  renderRectangle(ctx, el) {
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fillRect(el.x, el.y, el.width, el.height);
    }
    if (el.stroke) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth || 1;
      ctx.strokeRect(el.x, el.y, el.width, el.height);
    }
  }

  renderText(ctx, el) {
    ctx.fillStyle = el.fill || '#000000';
    ctx.font = `${el.fontSize || 16}px ${el.fontFamily || 'Arial'}`;
    ctx.textAlign = el.textAlign || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.content, el.x, el.y);
  }

  renderCircle(ctx, el) {
    ctx.beginPath();
    ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
    if (el.fill) {
      ctx.fillStyle = el.fill;
      ctx.fill();
    }
    if (el.stroke) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth || 1;
      ctx.stroke();
    }
  }
}

module.exports = PencilRenderer;
