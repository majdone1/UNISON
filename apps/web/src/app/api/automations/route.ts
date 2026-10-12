import { z } from 'zod';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(['eq', 'neq', 'gt', 'lt', 'contains', 'is_blank', 'not_blank']),
  value: z.unknown().optional(),
});

const actionSchema = z.object({
  type: z.string().min(1),
  channel: z.string().optional(),
  adapter: z.string().optional(),
  userId: z.string().uuid().optional(),
  status: z.string().optional(),
  field: z.string().optional(),
  value: z.unknown().optional(),
  groupId: z.string().uuid().optional(),
  url: z.string().url().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  boardId: z.string().uuid().optional().nullable(),
  enabled: z.boolean().optional(),
  trigger: z.object({
    type: z.string().min(1),
    to: z.string().optional(),
    from: z.string().optional(),
    withinDays: z.number().int().positive().optional(),
  }),
  conditions: z.array(conditionSchema).optional(),
  actions: z.array(actionSchema).min(1),
});

export async function GET() {
  try {
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    return jsonOk({
      automations: await repo.listAutomations(session.org.id),
      runs: await repo.listAutomationRuns(session.org.id, 40),
      webhookDeliveries: await repo.listWebhookDeliveries(session.org.id, 40),
      recipes: [
        'WHEN status→done THEN notify watchers',
        'WHEN created THEN assign actor',
        'WHEN due within 2d THEN notify',
        'WHEN done IF name not blank THEN progress=100',
        'WHEN done THEN webhook.http (mock)',
      ],
    });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const session = await repo.getSession();
    const automation = await repo.createAutomation({
      orgId: session.org.id,
      boardId: parsed.data.boardId ?? null,
      name: parsed.data.name,
      enabled: parsed.data.enabled ?? true,
      trigger: parsed.data.trigger,
      conditions: parsed.data.conditions ?? [],
      actions: parsed.data.actions,
    });
    return jsonOk({ automation }, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = z
      .object({ id: z.string().uuid(), enabled: z.boolean() })
      .parse(await request.json());
    const repo = await getServerRepo() as DemoRepository;
    const automation = await repo.setAutomationEnabled(body.id, body.enabled);
    return jsonOk({ automation });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return jsonError('VALIDATION_ERROR');
    }
    return mapRepoError(error);
  }
}
