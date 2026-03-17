import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface DeploymentResult {
  containerId: string;
  port: number;
  subdomain: string;
}

export class DockerService {
  private readonly appsDir = '/tmp/deployed-apps';
  private readonly portRange = { min: 8082, max: 9000 };
  private usedPorts = new Set<number>();

  async deployForgeImage(imageName: string, appName: string, subdomain: string): Promise<DeploymentResult> {
    console.log(`🐳 Deploying Forge Engine image ${imageName} for ${appName}`);
    
    try {
      // Find available port
      const port = await this.findAvailablePort();
      
      // Run container from Forge Engine built image
      const containerName = `votekit-app-${subdomain}`;
      const containerId = await this.runContainer(imageName, containerName, port);
      
      console.log(`✅ Container ${containerId} deployed on port ${port}`);
      
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

  async deployApplication(appName: string, subdomain: string): Promise<DeploymentResult> {
    console.log(`🐳 Starting Docker deployment for ${appName}`);
    
    const appDir = path.join(this.appsDir, subdomain);
    await fs.mkdir(appDir, { recursive: true });

    try {
      // Generate application files
      await this.generateAppFiles(appDir, appName, subdomain);
      
      // Build Docker image
      const imageName = `votekit-app-${subdomain}`;
      await this.buildDockerImage(appDir, imageName);
      
      // Find available port
      const port = await this.findAvailablePort();
      
      // Run container
      const containerId = await this.runContainer(imageName, `votekit-${subdomain}`, port);
      
      console.log(`✅ Deployed ${appName} on port ${port} with container ${containerId}`);
      
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

  private async generateAppFiles(appDir: string, appName: string, subdomain: string): Promise<void> {
    // Generate minimal Express app
    const packageJson = {
      name: subdomain,
      version: "1.0.0",
      main: "index.js",
      scripts: { start: "node index.js" },
      dependencies: {
        express: "^4.18.0",
        cors: "^2.8.5"
      }
    };

    const indexJs = `
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: '${appName}' });
});

app.get('/api/info', (req, res) => {
  res.json({ 
    name: '${appName}',
    subdomain: '${subdomain}',
    message: 'Hello from auto-generated app!'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`${appName} running on port \${PORT}\`);
});`;

    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>${appName}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <script src="https://unpkg.com/element-plus/dist/index.full.js"></script>
</head>
<body>
    <div id="app">
        <el-container>
            <el-header style="background: #409EFF; color: white; text-align: center; line-height: 60px;">
                <h2>${appName}</h2>
                <el-button type="info" @click="backToVoteKit">返回应用广场</el-button>
            </el-header>
            <el-main>
                <el-card>
                    <h3>欢迎使用 ${appName}</h3>
                    <p>这是一个由AI自动生成的应用程序。</p>
                    <el-button type="primary" @click="loadInfo">获取应用信息</el-button>
                    <div v-if="appInfo" style="margin-top: 20px;">
                        <el-alert :title="appInfo.message" type="success" show-icon></el-alert>
                    </div>
                </el-card>
            </el-main>
        </el-container>
    </div>

    <script>
        const { createApp } = Vue;
        const { ElMessage } = ElementPlus;
        
        createApp({
            data() {
                return {
                    appInfo: null
                };
            },
            methods: {
                async loadInfo() {
                    try {
                        const response = await fetch('/api/info');
                        this.appInfo = await response.json();
                        ElMessage.success('信息加载成功');
                    } catch (error) {
                        ElMessage.error('加载失败');
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

    const dockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]`;

    // Write files
    await fs.writeFile(path.join(appDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    await fs.writeFile(path.join(appDir, 'index.js'), indexJs);
    await fs.writeFile(path.join(appDir, 'Dockerfile'), dockerfile);
    
    // Create public directory and index.html
    await fs.mkdir(path.join(appDir, 'public'), { recursive: true });
    await fs.writeFile(path.join(appDir, 'public', 'index.html'), indexHtml);
  }

  private async buildDockerImage(appDir: string, imageName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const build = spawn('docker', ['build', '-t', imageName, '.'], {
        cwd: appDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      build.stdout.on('data', (data) => {
        output += data.toString();
      });

      build.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      build.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Docker image ${imageName} built successfully`);
          resolve();
        } else {
          reject(new Error(`Docker build failed: ${errorOutput}`));
        }
      });
    });
  }

  private async findAvailablePort(): Promise<number> {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        // Check if port is actually available
        const isAvailable = await this.checkPortAvailable(port);
        if (isAvailable) {
          return port;
        }
      }
    }
    throw new Error('No available ports in range');
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      // Check both netstat and docker ps for port conflicts
      const checkNetstat = spawn('netstat', ['-tuln']);
      let netstatOutput = '';

      checkNetstat.stdout.on('data', (data) => {
        netstatOutput += data.toString();
      });

      checkNetstat.on('close', () => {
        // Check if port is used by system services
        const isSystemUsed = netstatOutput.includes(`:${port} `);
        if (isSystemUsed) {
          console.log(`Port ${port} is used by system service`);
          resolve(false);
          return;
        }

        // Check if port is used by Docker containers
        const checkDocker = spawn('docker', ['ps', '--format', 'table {{.Ports}}']);
        let dockerOutput = '';

        checkDocker.stdout.on('data', (data) => {
          dockerOutput += data.toString();
        });

        checkDocker.on('close', () => {
          const isDockerUsed = dockerOutput.includes(`:${port}->`);
          if (isDockerUsed) {
            console.log(`Port ${port} is used by Docker container`);
          }
          resolve(!isDockerUsed);
        });

        checkDocker.on('error', () => {
          // If docker ps fails, assume port is available
          resolve(true);
        });
      });

      checkNetstat.on('error', () => {
        // If netstat fails, just check docker
        const checkDocker = spawn('docker', ['ps', '--format', 'table {{.Ports}}']);
        let dockerOutput = '';

        checkDocker.stdout.on('data', (data) => {
          dockerOutput += data.toString();
        });

        checkDocker.on('close', () => {
          const isDockerUsed = dockerOutput.includes(`:${port}->`);
          resolve(!isDockerUsed);
        });

        checkDocker.on('error', () => {
          resolve(true);
        });
      });
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stop = spawn('docker', ['stop', containerId]);
      
      stop.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Container ${containerId} stopped`);
          resolve();
        } else {
          reject(new Error(`Failed to stop container ${containerId}`));
        }
      });
    });
  }

  async removeContainer(containerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const remove = spawn('docker', ['rm', containerId]);
      
      remove.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Container ${containerId} removed`);
          resolve();
        } else {
          reject(new Error(`Failed to remove container ${containerId}`));
        }
      });
    });
  }

  async getContainerLogs(containerId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const logs = spawn('docker', ['logs', '--tail', '100', containerId]);
      let output = '';
      let errorOutput = '';

      logs.stdout.on('data', (data) => {
        output += data.toString();
      });

      logs.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      logs.on('close', (code) => {
        if (code === 0) {
          resolve(output + errorOutput);
        } else {
          reject(new Error(`Failed to get logs for ${containerId}`));
        }
      });
    });
  }

  private async runContainer(imageName: string, containerName: string, port: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', [
        'run', '-d',
        '--name', containerName,
        '-p', `${port}:80`,  // Map to nginx default port 80
        '--restart', 'unless-stopped',
        imageName
      ]);

      let output = '';
      let errorOutput = '';

      docker.stdout.on('data', (data) => {
        output += data.toString();
      });

      docker.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      docker.on('close', (code) => {
        if (code === 0) {
          const containerId = output.trim();
          this.usedPorts.add(port);
          resolve(containerId);
        } else {
          reject(new Error(`Container start failed: ${errorOutput}`));
        }
      });
    });
  }
}

export const dockerService = new DockerService();
