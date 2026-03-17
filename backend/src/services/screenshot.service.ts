import puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOADS_DIR = process.env.PROTOTYPE_SCREENSHOT_DIR || path.join(process.cwd(), 'uploads', 'prototypes');

async function ensureUploadsDir(): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

export interface CaptureOptions {
  width?: number;
  height?: number;
  fullPage?: boolean;
}

/**
 * Capture a high-quality WEBP screenshot from HTML content using Puppeteer.
 * @param html - Full HTML document string
 * @param requirementId - Requirement ID for storage and URL
 * @param options - Optional viewport and capture options
 * @returns Public URL path for the screenshot (e.g. /api/prototype/screenshot/{requirementId})
 */
export async function captureFromHtml(
  html: string,
  requirementId: string | number,
  options?: CaptureOptions
): Promise<string> {
  await ensureUploadsDir();
  const fullPath = getScreenshotPath(requirementId);
  const fullPathDir = path.dirname(fullPath);
  await fs.mkdir(fullPathDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    const width = options?.width ?? 1280;
    const height = options?.height ?? 800;
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({
      path: fullPath,
      type: 'webp',
      quality: 80,
      fullPage: options?.fullPage ?? false,
    });

    const safeId = String(requirementId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `/api/prototype/screenshot/${safeId}`;
  } finally {
    await browser.close();
  }
}

/**
 * Get the filesystem path for a requirement's screenshot.
 */
export function getScreenshotPath(requirementId: string | number): string {
  const safeId = String(requirementId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(UPLOADS_DIR, `${safeId}.webp`);
}

/**
 * Check if a screenshot file exists for the given requirement.
 */
export async function screenshotExists(requirementId: string | number): Promise<boolean> {
  const p = getScreenshotPath(requirementId);
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
