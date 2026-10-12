import { setCellValueSchema } from '@unison/validation';
import { jsonOk, mapRepoError, jsonError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function PATCH(request: Request) {
  try {
    const body = setCellValueSchema.parse(await request.json());
    const item = await (await getServerRepo()).setCellValue(body.itemId, body.columnId, body.value);
    return jsonOk({ item });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return jsonError('VALIDATION_ERROR', 400);
    }
    return mapRepoError(error);
  }
}
