import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET() {
  try {
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ docs: repo.listWorkdocs() });
  } catch (error) {
    return mapRepoError(error);
  }
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  workspaceId: z.string().uuid().optional(),
  boardId: z.string().uuid().optional(),
  itemId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ doc: repo.createWorkdoc(body) });
  } catch (error) {
    return mapRepoError(error);
  }
}
