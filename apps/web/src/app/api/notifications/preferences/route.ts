import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const patchSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  desktop: z.boolean().optional(),
  digestEmail: z.boolean().optional(),
  muteAssign: z.boolean().optional(),
  muteMention: z.boolean().optional(),
  muteAutomation: z.boolean().optional(),
  muteMessage: z.boolean().optional(),
});

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    return jsonOk({ preferences: await repo.getNotificationPreferences() });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    return jsonOk({ preferences: await repo.updateNotificationPreferences(parsed.data) });
  } catch (error) {
    return mapRepoError(error);
  }
}
