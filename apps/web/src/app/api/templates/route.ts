import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    await repo.getSession();
    return jsonOk({ templates: await repo.listTemplates() });
  } catch (error) {
    return mapRepoError(error);
  }
}
