import { apiRequest } from './http';

export async function fetchMyPermissions(companyId: string): Promise<string[]> {
  return apiRequest<string[]>(`/companies/${encodeURIComponent(companyId)}/my-permissions`);
}
