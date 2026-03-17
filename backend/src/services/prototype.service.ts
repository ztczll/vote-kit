import axios from 'axios';
import db from '../config/database';
import { deepSeekService } from './deepseek.service';
import { chargeDeepseekUsage } from './credits.service';
import {
  getLatestPath,
  getVersionPath,
  saveVersion as workspaceSaveVersion,
} from './prototype-workspace.service';

/** Path to the latest saved HTML for a requirement (used by app-generation and GET /artifacts). */
export function getPrototypeArtifactPath(requirementId: string | number, version?: number): string {
  if (version != null) return getVersionPath(requirementId, version);
  return getLatestPath(requirementId);
}

/** Public URL for the prototype artifact so Forge/Kiro/Cursor can fetch it. */
export function getPrototypeArtifactUrl(requirementId: string | number): string {
  const base = (process.env.VOTE_KIT_BASE_URL || '').replace(/\/$/, '');
  return `${base}/api/prototype/artifacts/${requirementId}`;
}

function savePrototypeArtifact(requirementId: string | number, html: string, message?: string): void {
  try {
    workspaceSaveVersion(requirementId, html, message);
  } catch (err) {
    console.warn('Failed to save prototype artifact:', err);
  }
}

export interface RequirementForPrototype {
  id: number;
  title: string;
  description: string | null;
  scene: string | null;
  pain: string | null;
  features: string | null;
  extra: string | null;
}

export interface GeneratePrototypeResult {
  html: string;
  url?: string;
  /** Public URL of the saved artifact (for Forge/Kiro/Cursor to fetch as reference). */
  artifactUrl?: string;
}

/**
 * Build prompt text from requirement for designfast or any prototype generator.
 * When designfast npm/API is available, pass this prompt to it.
 */
export function buildPromptFromRequirement(req: RequirementForPrototype, feedback?: string): string {
  const parts = [
    `标题：${req.title}`,
    `描述：${req.description || '无详细描述'}`,
    `场景：${req.scene ?? '无场景描述'}`,
    `痛点：${req.pain ?? '无痛点描述'}`,
    `期望功能：${req.features ?? '无'}`,
  ];
  if (req.extra) parts.push(`补充：${req.extra}`);
  if (feedback && feedback.trim()) parts.push(`\n用户调整意见：\n${feedback.trim()}`);
  return parts.join('\n\n');
}

/**
 * Generate a simple HTML prototype from requirement (fallback when designfast is not configured).
 * Replace this with designfast SDK/API call when available.
 */
function generateFallbackHtml(prompt: string, title: string): string {
  const escaped = prompt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 原型预览</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; padding: 24px; line-height: 1.6; }
    .header { background: #3498db; color: #fff; padding: 16px 24px; border-radius: 8px; margin-bottom: 24px; }
    .content { display: flex; gap: 24px; flex-wrap: wrap; }
    .sidebar { width: 200px; min-height: 200px; background: #2ecc71; border-radius: 8px; }
    .main { flex: 1; min-height: 300px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 24px; }
    .spec { font-size: 14px; color: #555; white-space: pre-wrap; }
    .footer { margin-top: 24px; padding: 12px; background: #ecf0f1; border-radius: 8px; font-size: 12px; color: #7f8c8d; }
  </style>
</head>
<body>
  <div class="header"><h1>${escapeHtml(title)}</h1><p>AI 生成原型预览</p></div>
  <div class="content">
    <div class="sidebar"></div>
    <div class="main">
      <h2>需求摘要</h2>
      <pre class="spec">${escaped}</pre>
    </div>
  </div>
  <div class="footer">Vote-Kit 原型预览 · 确认后可生成完整代码</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** System prompt for DeepSeek prototype generation (DesignFast-style). */
const PROTOTYPE_SYSTEM_PROMPT = `你是 DesignFast 风格的原型生成 Agent，根据产品需求生成单页、可预览的 HTML 原型。

技术要求：
- 只输出一张完整 HTML 文档，不要 Markdown、不要代码块包裹、不要解释性文字。
- 使用 HTML5 语义标签：<header>, <nav>, <main>, <section>, <footer> 等。
- 通过 <script src="https://cdn.tailwindcss.com"></script> 引入 Tailwind，用 Tailwind 工具类排版与样式。
- 移动优先、响应式（如 max-w-7xl mx-auto px-4、md: 断点）。
- 页面语言与内容为中文（lang="zh-CN"）。
- 基础无障碍：表单带 <label>、按钮/链接可读、必要时 aria-label。

输出约束：直接以 <!DOCTYPE html> 开头，以 </html> 结尾，中间不要插入任何非 HTML 内容。`;

/**
 * Prototype service: generate or regenerate prototype from requirement.
 * Priority: DESIGNFAST_API_URL > DeepSeek (when DEEPSEEK_API_KEY) > fallback HTML.
 */
export class PrototypeService {
  async getRequirement(requirementId: string | number): Promise<RequirementForPrototype | null> {
    const row = await db('requirements')
      .where('id', requirementId)
      .select('id', 'title', 'description', 'scene', 'pain', 'features', 'extra')
      .first();
    if (!row) return null;
    return {
      id: row.id,
      title: row.title ?? '',
      description: row.description ?? null,
      scene: row.scene ?? null,
      pain: row.pain ?? null,
      features: row.features ?? null,
      extra: row.extra ?? null,
    };
  }

  async generate(
    requirementId: string | number,
    feedback?: string,
    userId?: string | null
  ): Promise<GeneratePrototypeResult> {
    const req = await this.getRequirement(requirementId);
    if (!req) {
      throw new Error('需求不存在');
    }
    const prompt = buildPromptFromRequirement(req, feedback);

    // Optional: call designfast API when DESIGNFAST_API_URL is set
    const apiUrl = process.env.DESIGNFAST_API_URL;
    if (apiUrl) {
      try {
        const res = await axios.post(
          apiUrl,
          { prompt, title: req.title, feedback: feedback || undefined },
          { timeout: 60000 }
        );
        if (res.data?.html) {
          savePrototypeArtifact(requirementId, res.data.html, feedback);
          return { html: res.data.html, url: res.data.url, artifactUrl: getPrototypeArtifactUrl(requirementId) };
        }
        if (res.data?.url) return { html: '', url: res.data.url };
      } catch (err: any) {
        console.warn('Designfast API call failed, using fallback:', err?.message);
      }
    }

    // DeepSeek as agent when DEEPSEEK_API_KEY is set
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        const response = await deepSeekService.generatePrototypeHtml(PROTOTYPE_SYSTEM_PROMPT, prompt, {
          logUsage: true,
        });
        const html = response.html;
        if (html) {
          savePrototypeArtifact(requirementId, html, feedback);
          // 记录并扣除 Credits（如果传入了 userId）
          if (userId) {
            await chargeDeepseekUsage(userId, response.usage, {
              model: response.model,
              operation: 'generatePrototype',
            });
          }
          return { html, artifactUrl: getPrototypeArtifactUrl(requirementId) };
        }
      } catch (err: any) {
        console.warn('DeepSeek prototype generation failed, using fallback:', err?.message);
      }
    }

    const html = generateFallbackHtml(prompt, req.title);
    savePrototypeArtifact(requirementId, html, feedback);
    return { html, artifactUrl: getPrototypeArtifactUrl(requirementId) };
  }
}

export const prototypeService = new PrototypeService();
