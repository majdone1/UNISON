import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';
import { z } from 'zod';

export async function GET() {
  try {
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ channels: repo.listChannels() });
  } catch (error) {
    return mapRepoError(error);
  }
}

const createSchema = z.object({
  kind: z.enum(['dm', 'group', 'team', 'workspace', 'board', 'project']),
  name: z.string().trim().min(1).max(80),
  topic: z.string().max(200).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  workspaceId: z.string().uuid().optional(),
  boardId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const repo = (await getServerRepo()) as DemoRepository;
    return jsonOk({ channel: repo.createChannel(body) });
  } catch (error) {
    return mapRepoError(error);
  }
}
