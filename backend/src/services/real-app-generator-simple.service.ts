import * as fs from 'fs/promises';
import * as path from 'path';

interface GeneratedApp {
  name: string;
  description: string;
  files: { [path: string]: string };
}

export class RealAppGenerator {
  private readonly workDir = '/tmp/generated-apps';

  async generateApplication(devPlan: string, appName: string, requirement: any): Promise<GeneratedApp> {
    console.log('🚀 Starting real application generation...');
    
    const appDir = path.join(this.workDir, appName);
    await fs.mkdir(appDir, { recursive: true });

    try {
      // Generate complete application files
      const files = await this.generateCompleteApp(requirement, appName, devPlan);
      
      // Write files to disk
      await this.writeFilesToDisk(appDir, files);
      
      console.log(`✅ Generated ${Object.keys(files).length} files for ${appName}`);
      
      return {
        name: appName,
        description: `基于需求"${requirement.title}"自动生成的Web应用`,
        files
      };
    } catch (error: any) {
      console.error('❌ App generation failed:', error.message);
      throw error;
    }
  }

  private async generateCompleteApp(requirement: any, appName: string, devPlan: string): Promise<{ [path: string]: string }> {
    const files: { [path: string]: string } = {};
    
    // 基于需求内容分析应用类型和功能
    const appType = this.analyzeAppType(requirement.title, devPlan);
    const features = this.extractFeatures(requirement, devPlan);
    
    // 1. Package.json - 基于需求定制
    files['package.json'] = this.generateCustomPackageJson(appName, requirement);
    
    // 2. Server.js - 根据需求生成定制API
    files['server.js'] = this.generateCustomServer(requirement, appName, features);
    
    // 3. Frontend HTML - 根据需求生成定制界面
    files['public/index.html'] = this.generateCustomFrontend(requirement, appName, features, appType);
    
    // 4. Dockerfile
    files['Dockerfile'] = this.generateDockerfile();
    
    // 5. README - 基于需求内容
    files['README.md'] = this.generateCustomReadme(requirement, appName, devPlan);
    
    return files;
  }

  private async writeFilesToDisk(appDir: string, files: { [path: string]: string }): Promise<void> {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(appDir, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }

  private analyzeAppType(title: string, devPlan: string): string {
    const text = (title + ' ' + devPlan).toLowerCase();
    
    if (text.includes('json') || text.includes('解析') || text.includes('格式化')) return 'json-tool';
    if (text.includes('任务') || text.includes('todo') || text.includes('管理')) return 'task-manager';
    if (text.includes('计算') || text.includes('工具') || text.includes('转换')) return 'utility-tool';
    if (text.includes('图片') || text.includes('文件') || text.includes('上传')) return 'file-processor';
    if (text.includes('聊天') || text.includes('消息') || text.includes('通讯')) return 'chat-app';
    
    return 'general-app';
  }

  private extractFeatures(requirement: any, devPlan: string): string[] {
    const features = [];
    const text = (requirement.title + ' ' + requirement.description + ' ' + devPlan).toLowerCase();
    
    if (text.includes('json') || text.includes('解析')) features.push('json-parsing');
    if (text.includes('格式化') || text.includes('美化')) features.push('formatting');
    if (text.includes('验证') || text.includes('校验')) features.push('validation');
    if (text.includes('转换') || text.includes('导出')) features.push('conversion');
    if (text.includes('搜索') || text.includes('查找')) features.push('search');
    if (text.includes('编辑') || text.includes('修改')) features.push('editing');
    
    return features.length > 0 ? features : ['basic-crud'];
  }

  private generateCustomPackageJson(appName: string, requirement: any): string {
    return JSON.stringify({
      name: appName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      description: `基于需求"${requirement.title}"自动生成的Web应用`,
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        dev: 'node server.js'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5'
      }
    }, null, 2);
  }

  private generateCustomServer(requirement: any, appName: string, features: string[]): string {
    const hasJsonParsing = features.includes('json-parsing');
    
    if (hasJsonParsing) {
      return this.generateJsonToolServer();
    } else {
      return this.generateGeneralAppServer(appName);
    }
  }

  private generateJsonToolServer(): string {
    return `const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// JSON解析API
app.post('/api/parse-json', (req, res) => {
  try {
    const { jsonString } = req.body;
    
    if (!jsonString) {
      return res.status(400).json({ success: false, error: 'JSON字符串不能为空' });
    }
    
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    
    res.json({
      success: true,
      parsed,
      formatted,
      size: jsonString.length,
      keys: Object.keys(parsed).length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'JSON格式错误: ' + error.message
    });
  }
});

// JSON格式化API
app.post('/api/format-json', (req, res) => {
  try {
    const { jsonString } = req.body;
    
    if (!jsonString) {
      return res.status(400).json({ success: false, error: 'JSON字符串不能为空' });
    }
    
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    
    res.json({
      success: true,
      formatted
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'JSON格式错误: ' + error.message
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`🚀 JSON工具应用运行在端口 \${PORT}\`);
});`;
  }

  private generateGeneralAppServer(appName: string): string {
    return `const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 基础API
app.get('/api/info', (req, res) => {
  res.json({
    name: '${appName}',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`🚀 ${appName} 运行在端口 \${PORT}\`);
});`;
  }

  private generateCustomFrontend(requirement: any, appName: string, features: string[], appType: string): string {
    const hasJsonParsing = features.includes('json-parsing');
    
    if (hasJsonParsing) {
      return this.generateJsonToolFrontend(requirement, appName);
    } else {
      return this.generateGeneralAppFrontend(requirement, appName);
    }
  }

  private generateJsonToolFrontend(requirement: any, appName: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${appName}</title>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/element-plus/dist/index.full.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f5f7fa; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
      .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
      .json-editor { font-family: monospace; }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>🔧 ${appName}</h1>
            <p>${requirement.title}</p>
            <el-button type="info" @click="backToVoteKit">返回应用广场</el-button>
        </div>
        
        <div class="container">
            <el-row :gutter="20">
                <el-col :span="12">
                    <el-card>
                        <template #header>📝 JSON输入</template>
                        <el-input
                            v-model="jsonInput"
                            type="textarea"
                            :rows="15"
                            placeholder="请输入JSON字符串..."
                            class="json-editor"
                        />
                        <div style="margin-top: 10px;">
                            <el-button type="primary" @click="parseJson">解析JSON</el-button>
                            <el-button @click="formatJson">格式化</el-button>
                            <el-button @click="clearInput">清空</el-button>
                        </div>
                    </el-card>
                </el-col>
                <el-col :span="12">
                    <el-card>
                        <template #header>✨ 解析结果</template>
                        <el-input
                            v-model="jsonOutput"
                            type="textarea"
                            :rows="15"
                            readonly
                            class="json-editor"
                        />
                        <div style="margin-top: 10px;">
                            <el-button @click="copyResult">复制结果</el-button>
                            <el-tag v-if="parseStatus" :type="parseStatus.type">{{ parseStatus.message }}</el-tag>
                        </div>
                    </el-card>
                </el-col>
            </el-row>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage } = ElementPlus;

        createApp({
            data() {
                return {
                    jsonInput: '',
                    jsonOutput: '',
                    parseStatus: null
                };
            },
            methods: {
                async parseJson() {
                    if (!this.jsonInput.trim()) {
                        ElMessage.warning('请输入JSON字符串');
                        return;
                    }
                    
                    try {
                        const response = await axios.post('/api/parse-json', {
                            jsonString: this.jsonInput
                        });
                        
                        if (response.data.success) {
                            this.jsonOutput = response.data.formatted;
                            this.parseStatus = { type: 'success', message: '解析成功' };
                            ElMessage.success('JSON解析成功');
                        }
                    } catch (error) {
                        this.parseStatus = { type: 'danger', message: '解析失败' };
                        ElMessage.error('JSON解析失败');
                    }
                },
                
                async formatJson() {
                    if (!this.jsonInput.trim()) {
                        ElMessage.warning('请输入JSON字符串');
                        return;
                    }
                    
                    try {
                        const response = await axios.post('/api/format-json', {
                            jsonString: this.jsonInput
                        });
                        
                        if (response.data.success) {
                            this.jsonOutput = response.data.formatted;
                            ElMessage.success('JSON格式化成功');
                        }
                    } catch (error) {
                        ElMessage.error('JSON格式化失败');
                    }
                },
                
                clearInput() {
                    this.jsonInput = '';
                    this.jsonOutput = '';
                    this.parseStatus = null;
                },
                
                copyResult() {
                    if (this.jsonOutput) {
                        navigator.clipboard.writeText(this.jsonOutput);
                        ElMessage.success('已复制到剪贴板');
                    }
                },
                
                backToVoteKit() {
                    if (window.parent !== window) {
                        window.parent.postMessage({ action: 'navigate', path: '/app-store' }, '*');
                    } else {
                        window.location.href = '/app-store';
                    }
                }
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;
  }

  private generateGeneralAppFrontend(requirement: any, appName: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${appName}</title>
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/element-plus/dist/index.full.js"></script>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f5f7fa; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
      .container { max-width: 800px; margin: 20px auto; padding: 0 20px; }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>🚀 ${appName}</h1>
            <p>${requirement.title}</p>
            <el-button type="info" @click="backToVoteKit">返回应用广场</el-button>
        </div>
        
        <div class="container">
            <el-card>
                <template #header>应用功能</template>
                <p>这是基于需求"${requirement.title}"自动生成的Web应用。</p>
                <p>应用正在运行中，可以根据具体需求进行功能扩展。</p>
            </el-card>
        </div>
    </div>

    <script>
        const { createApp } = Vue;
        
        createApp({
            methods: {
                backToVoteKit() {
                    if (window.parent !== window) {
                        window.parent.postMessage({ action: 'navigate', path: '/app-store' }, '*');
                    } else {
                        window.location.href = '/app-store';
                    }
                }
            }
        }).use(ElementPlus).mount('#app');
    </script>
</body>
</html>`;
  }

  private generateDockerfile(): string {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]`;
  }

  private generateCustomReadme(requirement: any, appName: string, devPlan: string): string {
    return `# ${appName}

## 应用描述

基于需求"${requirement.title}"自动生成的Web应用。

## 需求详情

**标题**: ${requirement.title}
**描述**: ${requirement.description || '无详细描述'}

## 开发计划

${devPlan}

## 快速启动

\`\`\`bash
# 安装依赖
npm install

# 启动应用
npm start
\`\`\`

应用将运行在 http://localhost:3000

## 功能特性

- 响应式Web界面
- 基于Vue 3 + Element Plus
- RESTful API接口
- 自动生成的业务逻辑

## 技术栈

- **后端**: Node.js + Express
- **前端**: Vue 3 + Element Plus
- **部署**: Docker

---

*此应用由Vote-Kit平台自动生成*`;
  }

  async cleanupWorkDir(appName: string): Promise<void> {
    const appDir = path.join(this.workDir, appName);
    try {
      await fs.rm(appDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('⚠️ Could not cleanup work directory:', error);
    }
  }
}

export const realAppGenerator = new RealAppGenerator();
