import { describe, expect, it, vi } from 'vitest';

import { apiRequest } from './http';
import { fetchMyPermissions } from './roles-client';

vi.mock('./http', () => ({ apiRequest: vi.fn() }));

describe('fetchMyPermissions', () => {
  it('extrae las claves de permiso de la respuesta de la API', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ permissions: ['company.read'] });

    await expect(fetchMyPermissions('company/1')).resolves.toEqual(['company.read']);
    expect(apiRequest).toHaveBeenCalledWith('/companies/company%2F1/my-permissions');
  });
});
