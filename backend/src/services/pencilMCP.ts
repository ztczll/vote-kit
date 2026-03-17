import { spawn } from 'child_process';
import fs from 'fs/promises';

class PencilMCPClient {
  private pencilPath = '/root/Pencil-1.1.17-linux-x64/pencil';

  async getScreenshot(penFilePath: string, outputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pencilPath, [
        '--no-sandbox',
        '--headless',
        '--export-png',
        penFilePath,
        outputPath
      ]);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', async (code) => {
        // 检查文件是否生成
        const exists = await fs.access(outputPath).then(() => true).catch(() => false);
        if (exists) {
          resolve({ success: true, output: outputPath });
        } else {
          reject(new Error(`Pencil 截图失败: ${stderr || '未生成文件'}`));
        }
      });

      setTimeout(() => {
        process.kill();
        reject(new Error('Pencil 截图超时'));
      }, 30000);
    });
  }
}

export default PencilMCPClient;
