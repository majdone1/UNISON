import { jsonOk, mapRepoError } from '@/lib/api';
import { listAddableColumnTypes, COLUMN_REGISTRY } from '@unison/shared';

export async function GET() {
  try {
    return jsonOk({
      registry: Object.values(COLUMN_REGISTRY),
      addable: listAddableColumnTypes(),
    });
  } catch (error) {
    return mapRepoError(error);
  }
}
