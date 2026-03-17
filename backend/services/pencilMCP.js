const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class PencilMCPClient {
  constructor() {
    this.pencilPath = '/root/Pencil-1.1.17-linux-x64/pencil';
  }

  async getScreenshot(penFilePath, outputPath) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pencilPath, [
        '--no-sandbox',
        '--headless',
        '--screenshot',
        penFilePath,
        '--output',
        outputPath
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: outputPath });
        } else {
          reject(new Error(`Pencil 截图失败: ${stderr}`));
        }
      });

      setTimeout(() => {
        process.kill();
        reject(new Error('Pencil 截图超时'));
      }, 30000);
    });
  }

  async exportToCode(penFilePath, format = 'react') {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pencilPath, [
        '--no-sandbox',
        '--headless',
        '--export',
        format,
        penFilePath
      ]);

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code: stdout });
        } else {
          reject(new Error(`Pencil 导出失败: ${stderr}`));
        }
      });

      setTimeout(() => {
        process.kill();
        reject(new Error('Pencil 导出超时'));
      }, 30000);
    });
  }

  async getDesignData(penFilePath) {
    const content = await fs.readFile(penFilePath, 'utf-8');
    return JSON.parse(content);
  }
}

module.exports = PencilMCPClient;
