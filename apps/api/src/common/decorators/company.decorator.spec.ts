import { RoleName } from '@contaia/database';
import type { Request } from 'express';

import { PlatformAdminWithoutSupportAccessException } from '../exceptions/auth.exceptions';

import { extractMembership } from './company.decorator';

function buildRequest(overrides: Record<string, unknown> = {}): Request {
  return overrides as unknown as Request;
}

describe('extractMembership (@Company)', () => {
  it('devuelve la Membership cuando existe en la solicitud', () => {
    const membership = {
      id: 'membership-1',
      companyId: 'company-1',
      roleId: 'role-1',
      roleName: RoleName.ADMINISTRADOR,
      isOwner: true,
    };

    const result = extractMembership(buildRequest({ membership }));

    expect(result).toBe(membership);
  });

  it('lanza PlatformAdminWithoutSupportAccessException cuando no hay Membership', () => {
    expect(() => extractMembership(buildRequest({}))).toThrow(
      PlatformAdminWithoutSupportAccessException,
    );
  });

  it('lanza PlatformAdminWithoutSupportAccessException cuando membership es undefined', () => {
    expect(() => extractMembership(buildRequest({ membership: undefined }))).toThrow(
      PlatformAdminWithoutSupportAccessException,
    );
  });
});
