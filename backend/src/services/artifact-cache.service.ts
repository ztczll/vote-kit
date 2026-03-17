import db from '../database/db';
import crypto from 'crypto';

export async function getCachedArtifact(contentHash: string): Promise<{ storagePath: string } | null> {
  const row = await db('artifact_cache')
    .where({ content_hash: contentHash })
    .where(function () {
      this.whereNull('expires_at').orWhere('expires_at', '>', db.fn.now());
    })
    .first();
  return row ? { storagePath: row.storage_path } : null;
}

export function hashContent(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export async function setCachedArtifact(
  contentHash: string,
  storagePath: string,
  expiresAt: Date | null,
  userId?: string,
  artifactType?: string
): Promise<void> {
  const existing = await db('artifact_cache').where({ content_hash: contentHash }).first();
  if (existing) {
    await db('artifact_cache').where({ content_hash: contentHash }).update({
      storage_path: storagePath,
      expires_at: expiresAt,
      user_id: userId ?? null,
      artifact_type: artifactType ?? null,
      updated_at: db.fn.now(),
    });
  } else {
    await db('artifact_cache').insert({
      content_hash: contentHash,
      storage_path: storagePath,
      expires_at: expiresAt,
      user_id: userId ?? null,
      artifact_type: artifactType ?? null,
    });
  }
}

export async function getCacheDaysForPlan(plan: string): Promise<number> {
  const row = await db('plans_config').where({ plan }).select('cache_days').first();
  return row?.cache_days ?? 7;
}
