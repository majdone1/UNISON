import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  _request: Request,
  context: { params: Promise<{ roleId: string }> },
) {
  try {
    const { roleId } = await context.params;
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ preview: repo.previewRolePermissions(roleId) });
  } catch (error) {
    return mapRepoError(error);
  }
}
