import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET() {
  try {
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk(repo.listIntegrations());
  } catch (error) {
    return mapRepoError(error);
  }
}

const connectSchema = z.object({
  providerId: z.string().min(1),
  action: z.enum(['connect', 'disconnect']).default('connect'),
});

export async function POST(request: Request) {
  try {
    const body = connectSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    const providerId = body.providerId as Parameters<DemoRepository['connectIntegration']>[0];
    if (body.action === 'disconnect') {
      return jsonOk({ connection: repo.disconnectIntegration(providerId) });
    }
    return jsonOk({ connection: repo.connectIntegration(providerId) });
  } catch (error) {
    return mapRepoError(error);
  }
}
