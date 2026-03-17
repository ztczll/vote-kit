/**
 * 将后端返回的原型截图 URL 转为前端可访问的静态路径。
 * 当前：后端存 /api/prototype/screenshot/:id，宿主机文件在 backend/uploads/prototypes/:id.webp，
 * 通过 docker 挂载到前端 nginx 的 /uploads/prototypes/，故使用 /uploads/prototypes/:id.webp。
 * 后期改为 OSS 时，后端可直接返回完整 URL，此处对 http(s) 开头的原样返回。
 */
export function getPrototypeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const t = url.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const match = t.match(/^\/api\/prototype\/screenshot\/([^/?#]+)/);
  if (match) return `/uploads/prototypes/${match[1]}.webp`;
  if (t.startsWith('/uploads/prototypes/')) return t;
  return t.startsWith('/') ? t : `/${t}`;
}
