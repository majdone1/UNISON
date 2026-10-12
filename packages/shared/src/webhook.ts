/**
 * Demo-safe HTTP webhook adapter — never performs real network I/O.
 * Records intended deliveries for automation execution logs.
 */

export interface WebhookDeliveryRequest {
  orgId: string;
  automationId: string;
  itemId: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface WebhookDeliveryRecord {
  id: string;
  orgId: string;
  automationId: string;
  itemId: string;
  url: string;
  method: string;
  status: 'mock_ok' | 'mock_rejected';
  statusCode: number;
  detail: string;
  requestBody?: unknown;
  createdAt: string;
}

export interface WebhookHttpAdapter {
  /** Demo adapters are sync — never perform real network I/O. */
  deliver(req: WebhookDeliveryRequest): WebhookDeliveryRecord;
}

function isSafeDemoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    // Block obvious SSRF targets in demo
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Mock adapter: validates URL shape, never fetches. */
export class MockHttpWebhookAdapter implements WebhookHttpAdapter {
  deliver(req: WebhookDeliveryRequest): WebhookDeliveryRecord {
    const method = (req.method ?? 'POST').toUpperCase();
    const id = `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    if (!isSafeDemoUrl(req.url)) {
      return {
        id,
        orgId: req.orgId,
        automationId: req.automationId,
        itemId: req.itemId,
        url: req.url,
        method,
        status: 'mock_rejected',
        statusCode: 400,
        detail: 'URL rejected by demo SSRF guard (use https public host)',
        requestBody: req.body,
        createdAt,
      };
    }
    return {
      id,
      orgId: req.orgId,
      automationId: req.automationId,
      itemId: req.itemId,
      url: req.url,
      method,
      status: 'mock_ok',
      statusCode: 202,
      detail: 'Mock accepted — no network call (demo adapter)',
      requestBody: req.body,
      createdAt,
    };
  }
}

let adapter: WebhookHttpAdapter = new MockHttpWebhookAdapter();

export function getWebhookAdapter(): WebhookHttpAdapter {
  return adapter;
}

export function setWebhookAdapter(next: WebhookHttpAdapter): void {
  adapter = next;
}
