import { updateColumnSchema } from '@unison/validation';
import { jsonOk, mapRepoError, jsonError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ columnId: string }> },
) {
  try {
    const { columnId } = await context.params;
    const body = updateColumnSchema.parse({ ...(await request.json()), id: columnId });
    const column = await (await getServerRepo()).updateColumn(columnId, {
      name: body.name,
      settings: body.settings,
      width: body.width,
      isHidden: body.isHidden,
      position: body.position,
    });
    return jsonOk({ column });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return jsonError('VALIDATION_ERROR', 400);
    }
    return mapRepoError(error);
  }
}

export async function DELETE(
  _: Request,
  context: { params: Promise<{ columnId: string }> },
) {
  try {
    const { columnId } = await context.params;
    await (await getServerRepo()).deleteColumn(columnId);
    return jsonOk({ ok: true });
  } catch (error) {
    return mapRepoError(error);
  }
}
