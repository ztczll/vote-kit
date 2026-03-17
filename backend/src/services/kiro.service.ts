import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { calculateKiroCredits, addCredits } from './credits.service';

interface GeneratedApp {
  name: string;
  description: string;
  files: { [path: string]: string };
}

export class KiroService {
  private readonly workDir = '/tmp/generated-apps';

  /**
   * 使用 Kiro-CLI 生成应用，并在可能的情况下根据 /usage 结果为指定用户扣除 Credits。
   * @param devPlan 开发计划文本
   * @param appName 应用名
   * @param userId 可选，若提供则在生成前后调用 /usage 估算本次消耗的 kiro credits 并换算为平台 Credits
   */
  async generateApplication(devPlan: string, appName: string, userId?: string): Promise<GeneratedApp> {
    console.log('🤖 Starting Kiro-CLI application generation...');

    const appDir = path.join(this.workDir, appName);
    await fs.mkdir(appDir, { recursive: true });

    try {
      let usageBefore: number | null = null;
      if (userId) {
        usageBefore = await this.getKiroUsageSafe();
      }

      // Use Kiro-CLI to generate the application
      const prompt = this.buildGenerationPrompt(devPlan, appName);
      await this.callKiroCLI(prompt, appDir);

      if (userId) {
        const usageAfter = await this.getKiroUsageSafe();
        if (usageBefore != null && usageAfter != null && usageAfter > usageBefore) {
          const kiroCreditsDelta = usageAfter - usageBefore;
          const platformCredits = calculateKiroCredits(kiroCreditsDelta);
          if (platformCredits > 0) {
            console.log(
              `💳 Charging user ${userId} for Kiro usage: kiroCredits=${kiroCreditsDelta.toFixed(
                4
              )}, platformCredits=${platformCredits}`
            );
            await addCredits(userId, -platformCredits, 'kiro', {
              kiro_credits_delta: kiroCreditsDelta,
            });
          }
        }
      }
      
      // Read generated files
      const files = await this.readGeneratedFiles(appDir);
      
      return {
        name: appName,
        description: `Auto-generated application based on: ${devPlan.substring(0, 100)}...`,
        files
      };
    } catch (error: any) {
      console.error('❌ Kiro generation failed:', error.message);
      // Fallback to template generation
      return this.generateFromTemplate(devPlan, appName);
    }
  }

  private buildGenerationPrompt(devPlan: string, appName: string): string {
    return `Create a simple web application with the following requirements:

Application Name: ${appName}
Development Plan: ${devPlan}

Technical Requirements:
- Frontend: Vue 3 with TypeScript
- Backend: Express.js with TypeScript  
- Database: MySQL with simple CRUD operations
- Authentication: JWT token integration with Vote-Kit platform
- Docker: Include Dockerfile and docker-compose.yml
- Simple UI with Element Plus components

Generate a complete, runnable application with:
1. Basic CRUD operations for main entities
2. Simple responsive UI
3. API endpoints for data management
4. Database schema and migrations
5. Docker configuration for deployment
6. Integration with Vote-Kit authentication tokens

Keep the implementation minimal but functional.`;
  }

  private async callKiroCLI(prompt: string, workDir: string): Promise<void> {
    const kiroCliPath = process.env.KIRO_CLI_PATH || 'kiro-cli';
    const timeoutMs = parseInt(process.env.KIRO_CLI_TIMEOUT_MS || '600000', 10); // default 10 min

    return new Promise((resolve, reject) => {
      // Non-interactive: first response to stdout then exit (no blocking)
      const kiro = spawn(kiroCliPath, ['chat', '--no-interactive', '--trust-all-tools'], {
        cwd: workDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';
      let settled = false;

      const settle = (err: Error | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          kiro.kill('SIGKILL');
        } catch {
          // ignore
        }
        if (err) reject(err);
        else resolve();
      };

      const timeout = setTimeout(() => {
        settle(new Error(`Kiro-CLI timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      kiro.stdout.on('data', (data) => {
        output += data.toString();
      });

      kiro.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      kiro.on('close', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (code === 0) {
          console.log('✅ Kiro-CLI generation completed');
          resolve();
        } else {
          reject(new Error(`Kiro-CLI failed with code ${code}${signal ? ` signal ${signal}` : ''}: ${errorOutput}`));
        }
      });

      kiro.on('error', (err) => {
        settle(err);
      });

      // Send the prompt via stdin; with --no-interactive the process exits after first response
      kiro.stdin.write(prompt + '\n');
      kiro.stdin.end();
    });
  }

  /**
   * 调用 `kiro-cli chat -a --no-interactive /usage` 并解析当前已用 credits。
   * 返回值可能为 null（解析失败或命令错误）。
   */
  private async getKiroUsageSafe(): Promise<number | null> {
    try {
      const kiroCliPath = process.env.KIRO_CLI_PATH || 'kiro-cli';
      const timeoutMs = parseInt(process.env.KIRO_USAGE_TIMEOUT_MS || '60000', 10);

      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(kiroCliPath, ['chat', '-a', '--no-interactive', '/usage'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let out = '';
        let err = '';
        let settled = false;

        const settle = (error: Error | null) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
          if (error) reject(error);
          else resolve(out || err);
        };

        const timer = setTimeout(() => {
          settle(new Error(`kiro-cli /usage timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        child.stdout.on('data', (data) => {
          out += data.toString();
        });
        child.stderr.on('data', (data) => {
          err += data.toString();
        });
        child.on('error', (e) => settle(e));
        child.on('close', () => settle(null));
      });

      const match = output.match(/Credits\s*\(([\d.]+)\s+of\s+([\d.]+)/i);
      if (!match) {
        console.warn('⚠️ Unable to parse kiro-cli /usage output for credits:', output.slice(0, 400));
        return null;
      }
      const used = parseFloat(match[1]);
      if (!isFinite(used)) return null;
      return used;
    } catch (e: any) {
      console.warn('⚠️ getKiroUsageSafe failed:', e?.message || e);
      return null;
    }
  }

  private async readGeneratedFiles(appDir: string): Promise<{ [path: string]: string }> {
    const files: { [path: string]: string } = {};
    
    try {
      const entries = await fs.readdir(appDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(appDir, entry.name);
          const content = await fs.readFile(filePath, 'utf-8');
          files[entry.name] = content;
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not read generated files, using fallback');
    }
    
    return files;
  }

  private async generateFromTemplate(devPlan: string, appName: string): Promise<GeneratedApp> {
    console.log('🔄 Using template-based generation as fallback');
    
    const files = {
      'package.json': this.generatePackageJson(appName),
      'Dockerfile': this.generateDockerfile(),
      'docker-compose.yml': this.generateDockerCompose(appName),
      'src/index.js': this.generateExpressApp(appName),
      'frontend/package.json': this.generateFrontendPackageJson(appName),
      'frontend/src/main.js': this.generateVueApp(appName),
      'frontend/src/App.vue': this.generateVueComponent(appName, devPlan)
    };

    return {
      name: appName,
      description: `Template-generated application: ${devPlan.substring(0, 100)}...`,
      files
    };
  }

  private generatePackageJson(appName: string): string {
    return JSON.stringify({
      name: appName,
      version: "1.0.0",
      main: "src/index.js",
      scripts: {
        start: "node src/index.js",
        dev: "nodemon src/index.js"
      },
      dependencies: {
        express: "^4.18.0",
        cors: "^2.8.5",
        mysql2: "^3.6.0",
        jsonwebtoken: "^9.0.0"
      }
    }, null, 2);
  }

  private generateDockerfile(): string {
    return `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;
  }

  private generateDockerCompose(appName: string): string {
    return `version: '3.8'
services:
  ${appName}:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - VOTEKIT_TOKEN_URL=http://votekit-backend:3000/api/auth/verify
    networks:
      - votekit-network
networks:
  votekit-network:
    external: true`;
  }

  private generateExpressApp(appName: string): string {
    return `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: '${appName}' });
});

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from ${appName}!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`${appName} running on port \${PORT}\`);
});`;
  }

  private generateFrontendPackageJson(appName: string): string {
    return JSON.stringify({
      name: `${appName}-frontend`,
      version: "1.0.0",
      scripts: {
        dev: "vite",
        build: "vite build"
      },
      dependencies: {
        vue: "^3.3.0",
        "element-plus": "^2.4.0"
      },
      devDependencies: {
        vite: "^4.4.0",
        "@vitejs/plugin-vue": "^4.3.0"
      }
    }, null, 2);
  }

  private generateVueApp(appName: string): string {
    return `import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')`;
  }

  private generateVueComponent(appName: string, devPlan: string): string {
    return `<template>
  <div class="app">
    <el-header>
      <h1>${appName}</h1>
      <el-button @click="backToVoteKit">返回应用广场</el-button>
    </el-header>
    <el-main>
      <el-card>
        <h2>应用功能</h2>
        <p>${devPlan.substring(0, 200)}...</p>
        <el-button type="primary" @click="loadData">加载数据</el-button>
      </el-card>
    </el-main>
  </div>
</template>

<script>
export default {
  name: 'App',
  methods: {
    backToVoteKit() {
      window.parent.postMessage({ action: 'navigate', path: '/app-store' }, '*');
    },
    async loadData() {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        this.$message.success('数据加载成功: ' + data.message);
      } catch (error) {
        this.$message.error('加载失败');
      }
    }
  }
}
</script>`;
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

export const kiroService = new KiroService();
