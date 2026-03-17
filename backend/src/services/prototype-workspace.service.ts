/**
 * 原型工作区：类似 DesignFast 的 workspace 目录，支持版本化保存与 Git 管理。
 *
 * 目录结构：
 *   workspace/
 *   ├── prototypes/
 *   │   └── <requirementId>/
 *   │       ├── index.json    # 版本索引
 *   │       ├── v1.html, v2.html, ...
 *   │       └── latest.html  # 当前版本副本（稳定 URL）
 *   ├── exports/              # 预留导出
 *   └── .git/                 # 版本管理
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const WORKSPACE_ROOT =
  process.env.PROTOTYPE_WORKSPACE_DIR || path.join(process.cwd(), 'workspace');
const PROTOTYPES_DIR = path.join(WORKSPACE_ROOT, 'prototypes');
const EXPORTS_DIR = path.join(WORKSPACE_ROOT, 'exports');

const INDEX_FILE = 'index.json';
const LATEST_FILE = 'latest.html';

export interface PrototypeVersionEntry {
  version: number;
  file: string;
  createdAt: string;
  message?: string;
}

export interface PrototypeIndex {
  requirementId: string;
  versions: PrototypeVersionEntry[];
  current: number;
  updatedAt: string;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** 确保工作区目录存在（prototypes、exports），并写入 README。 */
export function ensureWorkspace(): void {
  ensureDir(WORKSPACE_ROOT);
  ensureDir(PROTOTYPES_DIR);
  ensureDir(EXPORTS_DIR);
  const readmePath = path.join(WORKSPACE_ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(
      readmePath,
      `# Vote-Kit 原型工作区（DesignFast 风格）

- \`prototypes/<requirementId>/\\\`：按需求保存的版本化原型
  - \`index.json\`：版本索引
  - \`v1.html\`, \`v2.html\`：各版本 HTML
  - \`latest.html\`：当前版本副本
- \`exports/\`：预留导出目录
- 本目录使用 Git 管理，每次生成会自动 commit。
`,
      'utf8'
    );
  }
}

/** 获取工作区根路径。 */
export function getWorkspaceRoot(): string {
  return WORKSPACE_ROOT;
}

/** 获取某需求的原型子目录。 */
export function getRequirementDir(requirementId: string | number): string {
  const safeId = String(requirementId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(PROTOTYPES_DIR, safeId);
}

/** 读取版本索引，不存在则返回 null。 */
export function readIndex(requirementId: string | number): PrototypeIndex | null {
  const dir = getRequirementDir(requirementId);
  const indexPath = path.join(dir, INDEX_FILE);
  if (!fs.existsSync(indexPath)) return null;
  try {
    const raw = fs.readFileSync(indexPath, 'utf8');
    return JSON.parse(raw) as PrototypeIndex;
  } catch {
    return null;
  }
}

/** 写入版本索引。 */
function writeIndex(requirementId: string | number, index: PrototypeIndex): void {
  const dir = getRequirementDir(requirementId);
  ensureDir(dir);
  const indexPath = path.join(dir, INDEX_FILE);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
}

/** 确保 workspace 下已初始化 Git，忽略错误（无 git 时仅跳过提交）。 */
function ensureGitInit(): boolean {
  const gitDir = path.join(WORKSPACE_ROOT, '.git');
  if (fs.existsSync(gitDir)) return true;
  try {
    execSync('git init', { cwd: WORKSPACE_ROOT, stdio: 'pipe' });
    const gitignore = path.join(WORKSPACE_ROOT, '.gitignore');
    if (!fs.existsSync(gitignore)) {
      fs.writeFileSync(gitignore, '*.log\n.DS_Store\n', 'utf8');
    }
    return true;
  } catch {
    return false;
  }
}

/** 在工作区内执行 git add 与 commit。 */
function gitCommit(relativePaths: string[], message: string): boolean {
  if (!ensureGitInit()) return false;
  try {
    const cwd = WORKSPACE_ROOT;
    for (const p of relativePaths) {
      execSync(`git add "${p}"`, { cwd, stdio: 'pipe' });
    }
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 保存新版本 HTML 到工作区并做 Git 提交。
 * @returns 新版本号
 */
export function saveVersion(
  requirementId: string | number,
  html: string,
  message?: string
): number {
  ensureWorkspace();
  const dir = getRequirementDir(requirementId);
  ensureDir(dir);

  const idStr = String(requirementId).replace(/[^a-zA-Z0-9_-]/g, '_');
  let index = readIndex(requirementId);
  const nextVersion = index ? index.current + 1 : 1;
  const versionFile = `v${nextVersion}.html`;

  const versionPath = path.join(dir, versionFile);
  fs.writeFileSync(versionPath, html, 'utf8');

  const latestPath = path.join(dir, LATEST_FILE);
  fs.writeFileSync(latestPath, html, 'utf8');

  const now = new Date().toISOString();
  const entry: PrototypeVersionEntry = {
    version: nextVersion,
    file: versionFile,
    createdAt: now,
    message: message || undefined,
  };

  if (!index) {
    index = {
      requirementId: idStr,
      versions: [entry],
      current: nextVersion,
      updatedAt: now,
    };
  } else {
    index.versions.push(entry);
    index.current = nextVersion;
    index.updatedAt = now;
    
    // 保留最多2个版本
    if (index.versions.length > 2) {
      const toRemove = index.versions.slice(0, index.versions.length - 2);
      toRemove.forEach(v => {
        const oldPath = path.join(dir, v.file);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      });
      index.versions = index.versions.slice(-2);
    }
  }
  writeIndex(requirementId, index);

  const commitMessage = message
    ? `prototype req-${requirementId} v${nextVersion}: ${message.slice(0, 50)}`
    : `prototype req-${requirementId} v${nextVersion}`;
  const relPrototypes = path.relative(WORKSPACE_ROOT, path.join(dir, versionFile));
  const relLatest = path.relative(WORKSPACE_ROOT, latestPath);
  const relIndex = path.relative(WORKSPACE_ROOT, path.join(dir, INDEX_FILE));
  gitCommit([relPrototypes, relLatest, relIndex], commitMessage);

  return nextVersion;
}

/** 获取当前最新版本的 HTML 文件路径（供 Forge / GET artifact 使用）。 */
export function getLatestPath(requirementId: string | number): string {
  return path.join(getRequirementDir(requirementId), LATEST_FILE);
}

/** 获取指定版本的 HTML 文件路径。 */
export function getVersionPath(requirementId: string | number, version: number): string {
  return path.join(getRequirementDir(requirementId), `v${version}.html`);
}

/** 列出某需求的所有版本（从 index.json 读取）。 */
export function listVersions(requirementId: string | number): PrototypeVersionEntry[] {
  const index = readIndex(requirementId);
  return index ? [...index.versions].reverse() : [];
}

/** 检查是否存在该需求的任意版本。 */
export function hasAnyVersion(requirementId: string | number): boolean {
  const latestPath = getLatestPath(requirementId);
  return fs.existsSync(latestPath);
}
