import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET() {
  try {
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ extensions: repo.listApiExtensions() });
  } catch (error) {
    return mapRepoError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(['view', 'widget', 'action', 'provider', 'field']),
  config: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ extension: repo.createApiExtension(body) });
  } catch (error) {
    return mapRepoError(error);
  }
}
