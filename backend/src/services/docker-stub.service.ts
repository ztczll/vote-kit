export class DockerService {
  async deployApplication(appName: string, subdomain: string): Promise<any> {
    console.log(`🐳 Starting real Docker deployment for ${appName}`);
    
    try {
      // 1. 获取生成的应用文件路径
      const appDir = `/tmp/generated-apps/${appName}`;
      
      // 2. 检查应用文件是否存在
      const fs = require('fs');
      if (!fs.existsSync(appDir)) {
        throw new Error(`Application files not found at ${appDir}`);
      }
      
      // 3. 分配端口
      const port = 4000 + Math.floor(Math.random() * 1000);
      
      // 4. 构建Docker镜像
      const imageName = `votekit-app-${subdomain}`;
      await this.buildDockerImage(appDir, imageName);
      
      // 5. 运行容器
      const containerId = await this.runContainer(imageName, port, subdomain);
      
      console.log(`✅ Successfully deployed ${appName} on port ${port}`);
      
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

  private async buildDockerImage(appDir: string, imageName: string): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      console.log(`🔨 Building Docker image ${imageName}...`);
      
      const build = spawn('docker', ['build', '-t', imageName, '.'], {
        cwd: appDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      build.stdout.on('data', (data: any) => {
        output += data.toString();
      });

      build.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      build.on('close', (code: number) => {
        if (code === 0) {
          console.log(`✅ Docker image ${imageName} built successfully`);
          resolve();
        } else {
          console.error(`❌ Docker build failed: ${errorOutput}`);
          reject(new Error(`Docker build failed: ${errorOutput}`));
        }
      });
    });
  }

  private async runContainer(imageName: string, port: number, subdomain: string): Promise<string> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const containerName = `votekit-${subdomain}`;
      
      console.log(`🚀 Starting container ${containerName} on port ${port}...`);
      
      const run = spawn('docker', [
        'run', '-d',
        '--name', containerName,
        '--network', 'vote-kit_votekit-network',
        '-p', `${port}:3000`,
        '--restart', 'unless-stopped',
        imageName
      ]);

      let containerId = '';
      let errorOutput = '';

      run.stdout.on('data', (data: any) => {
        containerId += data.toString().trim();
      });

      run.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      run.on('close', (code: number) => {
        if (code === 0 && containerId) {
          console.log(`✅ Container ${containerId} started on port ${port}`);
          resolve(containerId);
        } else {
          console.error(`❌ Container start failed: ${errorOutput}`);
          reject(new Error(`Container start failed: ${errorOutput}`));
        }
      });
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const stop = spawn('docker', ['stop', containerId]);
      
      stop.on('close', (code: number) => {
        if (code === 0) {
          console.log(`✅ Container ${containerId} stopped`);
          resolve();
        } else {
          reject(new Error(`Failed to stop container ${containerId}`));
        }
      });
    });
  }

  async getContainerLogs(containerId: string): Promise<string> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const logs = spawn('docker', ['logs', '--tail', '100', containerId]);
      let output = '';
      let errorOutput = '';

      logs.stdout.on('data', (data: any) => {
        output += data.toString();
      });

      logs.stderr.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      logs.on('close', (code: number) => {
        if (code === 0) {
          resolve(output + errorOutput);
        } else {
          reject(new Error(`Failed to get logs for ${containerId}`));
        }
      });
    });
  }
}

export const dockerService = new DockerService();
