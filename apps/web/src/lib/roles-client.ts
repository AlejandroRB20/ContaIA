import { apiRequest } from './http';

export async function fetchMyPermissions(companyId: string): Promise<string[]> {
  const result = await apiRequest<{ permissions: string[] }>(
    `/companies/${encodeURIComponent(companyId)}/my-permissions`,
  );
  return result.permissions;
}
