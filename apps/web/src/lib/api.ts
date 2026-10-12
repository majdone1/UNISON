import { NextResponse } from 'next/server';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function mapRepoError(error: unknown) {
  const message = error instanceof Error ? error.message : 'UNKNOWN';
  if (
    message === 'CROSS_TENANT_DENIED' ||
    message === 'FORBIDDEN' ||
    message === 'BOARD_PRIVATE_DENIED' ||
    message === 'COLUMN_WRITE_FORBIDDEN' ||
    message === 'FORM_ABUSE_REJECTED' ||
    message === 'RELATION_BOARD_FORBIDDEN' ||
    message === 'INVITE_ROLE_FORBIDDEN'
  ) {
    return jsonError(message, 403);
  }
  if (message.includes('NOT_FOUND')) return jsonError(message, 404);
  if (message.startsWith('ENTITLEMENT')) return jsonError(message, 402);
  return jsonError(message, 400);
}
