import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

export class DockerService {
  private runningServers: { [key: string]: any } = {};

  async deployApplication(appName: string, subdomain: string): Promise<any> {
    console.log(`🚀 Starting simplified deployment for ${appName}`);
    
    try {
      // 简化部署：直接启动内置服务器
      const port = 4000 + Math.floor(Math.random() * 1000);
      const containerId = `simple-${subdomain}-${Date.now()}`;
      
      // 启动内置的Express服务器来服务生成的应用
      await this.startBuiltinServer(appName, port, subdomain);
      
      console.log(`✅ Simplified deployment completed for ${appName} on port ${port}`);
      
      return {
        containerId,
        port,
        subdomain
      };
    } catch (error: any) {
      console.error(`❌ Deployment failed for ${appName}:`, error.message);
      throw error;
    }
  }

  private async startBuiltinServer(appName: string, port: number, subdomain: string): Promise<void> {
    // 检查生成的应用文件
    const appDir = `/tmp/generated-apps/${appName}`;
    if (!fs.existsSync(appDir)) {
      throw new Error(`Application files not found at ${appDir}`);
    }
    
    // 创建Express应用来服务生成的内容
    const app = express();
    
    // 中间件
    app.use(express.json());
    
    // 检查是否有public目录
    const publicDir = path.join(appDir, 'public');
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    
    // 模拟生成应用的API
    let items = [
      { id: 1, title: '示例项目', description: '这是一个示例数据项目', status: 'active' },
      { id: 2, title: appName, description: '自动生成的项目', status: 'active' }
    ];

    // API路由
    app.get('/api/items', (req: any, res: any) => {
      res.json({ success: true, data: items });
    });

    app.post('/api/items', (req: any, res: any) => {
      const newItem = {
        id: Date.now(),
        title: req.body.title,
        description: req.body.description,
        status: 'active'
      };
      items.push(newItem);
      res.json({ success: true, data: newItem });
    });

    app.put('/api/items/:id', (req: any, res: any) => {
      const id = parseInt(req.params.id);
      const index = items.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...req.body };
        res.json({ success: true, data: items[index] });
      } else {
        res.status(404).json({ success: false, message: 'Item not found' });
      }
    });

    app.delete('/api/items/:id', (req: any, res: any) => {
      const id = parseInt(req.params.id);
      items = items.filter((item: any) => item.id !== id);
      res.json({ success: true, message: 'Item deleted' });
    });

    app.get('/health', (req: any, res: any) => {
      res.json({ 
        status: 'ok', 
        app: appName,
        subdomain: subdomain,
        timestamp: new Date().toISOString()
      });
    });

    // 主页路由
    app.get('/', (req: any, res: any) => {
      const indexPath = path.join(appDir, 'public', 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // 如果没有生成的HTML，返回简单页面
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${appName}</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              .header { background: #409EFF; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
              .api-list { background: #f5f7fa; padding: 20px; border-radius: 8px; }
              .api-item { margin: 10px 0; }
              .btn { background: #409EFF; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🚀 ${appName}</h1>
              <p>应用正在运行中...</p>
            </div>
            <div class="api-list">
              <h3>📡 API接口</h3>
              <div class="api-item">GET <a href="/api/items">/api/items</a> - 获取所有项目</div>
              <div class="api-item">POST /api/items - 创建新项目</div>
              <div class="api-item">PUT /api/items/:id - 更新项目</div>
              <div class="api-item">DELETE /api/items/:id - 删除项目</div>
              <div class="api-item">GET <a href="/health">/health</a> - 健康检查</div>
            </div>
            <br>
            <button class="btn" onclick="window.parent.postMessage({action: 'navigate', path: '/app-store'}, '*')">
              返回应用广场
            </button>
          </body>
          </html>
        `);
      }
    });

    // 启动服务器
    const server = app.listen(port, () => {
      console.log(`📱 Built-in server for ${appName} running on port ${port}`);
    });

    // 存储服务器引用以便后续管理
    this.runningServers[subdomain] = server;
  }

  async stopContainer(containerId: string): Promise<void> {
    console.log(`🛑 Stopping built-in server ${containerId}`);
    
    // 从containerId中提取subdomain
    const subdomain = containerId.split('-')[1];
    
    if (this.runningServers[subdomain]) {
      this.runningServers[subdomain].close();
      delete this.runningServers[subdomain];
      console.log(`✅ Built-in server ${containerId} stopped`);
    }
  }

  async getContainerLogs(containerId: string): Promise<string> {
    return `Built-in server logs for ${containerId}:
- Server started successfully
- Serving generated application files
- API endpoints available at /api/*
- Health check available at /health`;
  }
}

export const dockerService = new DockerService();
