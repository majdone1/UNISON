import { jsonOk, mapRepoError } from '@/lib/api';
import { getServerRepo } from '@/lib/repo';

export async function GET() {
  try {
    return jsonOk({ orgs: await (await getServerRepo()).listOrgsForPlatform() });
  } catch (error) {
    return mapRepoError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      orgId: string;
      status: 'active' | 'suspended';
    };
    const org = await (await getServerRepo()).setOrgStatus(body.orgId, body.status);
    return jsonOk({ org });
  } catch (error) {
    return mapRepoError(error);
  }
}
