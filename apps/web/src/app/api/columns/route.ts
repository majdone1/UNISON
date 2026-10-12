import { createColumnSchema, reorderColumnsSchema } from '@unison/validation';
import { jsonOk, mapRepoError, jsonError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function POST(request: Request) {
  try {
    const body = createColumnSchema.parse(await request.json());
    const column = await (await getServerRepo()).createColumn(body);
    return jsonOk({ column }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return jsonError('VALIDATION_ERROR', 400);
    }
    return mapRepoError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = reorderColumnsSchema.parse(await request.json());
    const columns = await (await getServerRepo()).reorderColumns(body.boardId, body.ids);
    return jsonOk({ columns });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return jsonError('VALIDATION_ERROR', 400);
    }
    return mapRepoError(error);
  }
}
