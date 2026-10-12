/**
 * Signed file URL seam — demo issues opaque short-lived refs; production
 * should use storage provider signed URLs (env names in PRODUCTION_PROVIDERS).
 * Never returns permanent public URLs for protected files.
 */

export interface SignedFileUrl {
  url: string;
  expiresAt: string;
  attachmentId: string;
  /** Always false for protected files */
  public: false;
}

export function createMockSignedFileUrl(input: {
  attachmentId: string;
  orgId: string;
  ttlSeconds?: number;
}): SignedFileUrl {
  const ttl = Math.min(Math.max(input.ttlSeconds ?? 300, 60), 3600);
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  const token = Buffer.from(
    `${input.orgId}:${input.attachmentId}:${expiresAt}`,
  ).toString('base64url');
  return {
    url: `/api/files/${input.attachmentId}/content?sig=${token}`,
    expiresAt,
    attachmentId: input.attachmentId,
    public: false,
  };
}

export function isSignedFileUrlExpired(expiresAt: string, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= now;
}
