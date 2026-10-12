import { formSubmitSchema } from '@unison/validation';
import { jsonError, jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';
import type { DemoRepository } from '@unison/database';

export async function GET(
  _: Request,
  context: { params: Promise<{ formId: string }> },
) {
  try {
    const { formId } = await context.params;
    const repo = await getServerRepo() as DemoRepository;
    return jsonOk({ form: await repo.getForm(formId) });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ formId: string }> },
) {
  try {
    const { formId } = await context.params;
    const parsed = formSubmitSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError('VALIDATION_ERROR');
    const repo = await getServerRepo() as DemoRepository;
    const result = await repo.submitForm(formId, parsed.data.fields, {
      honeypot: parsed.data.website,
    });
    return jsonOk(result, { status: 201 });
  } catch (error) {
    return mapRepoError(error);
  }
}
