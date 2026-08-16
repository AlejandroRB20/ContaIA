import type { MembershipStatus, RoleName } from '@contaia/database';

import type { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';
import type { RolesRepository } from '../roles-permissions/repositories/roles.repository';

import { DocumentsAuthorizationService } from './documents-authorization.service';
import { DocumentNotFoundException } from './documents.errors';

const COMPANY_ID = '11111111-1111-1111-1111-111111111111';
const ACTOR_ID = '22222222-2222-2222-2222-222222222222';
const PERMISSION = 'document.read';

function buildActiveMembership() {
  return {
    id: 'membership-1',
    userId: ACTOR_ID,
    companyId: COMPANY_ID,
    roleId: 'role-1',
    isOwner: false,
    membershipStatus: 'ACTIVE' as MembershipStatus,
    role: { name: 'CONTADOR' as RoleName },
  };
}

function buildHelper(
  overrides: {
    membershipsRepository?: Partial<jest.Mocked<MembershipsRepository>>;
    rolesRepository?: Partial<jest.Mocked<RolesRepository>>;
  } = {},
) {
  const membershipsRepository = {
    findActiveByUserAndCompany: jest.fn().mockResolvedValue(buildActiveMembership()),
    ...overrides.membershipsRepository,
  } as unknown as jest.Mocked<MembershipsRepository>;

  const rolesRepository = {
    findPermissionKeysForRole: jest.fn().mockResolvedValue(['document.read', 'document.upload']),
    ...overrides.rolesRepository,
  } as unknown as jest.Mocked<RolesRepository>;

  const service = new DocumentsAuthorizationService(membershipsRepository, rolesRepository);

  return { service, membershipsRepository, rolesRepository };
}

describe('DocumentsAuthorizationService', () => {
  describe('assertHasPermission — autorizado', () => {
    it('no lanza cuando la Membership esta activa y el Rol tiene el permiso', async () => {
      const { service } = buildHelper();

      await expect(
        service.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION),
      ).resolves.toBeUndefined();
    });

    it('consulta la Membership activa con el actor y la empresa correctos', async () => {
      const { service, membershipsRepository } = buildHelper();

      await service.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION);

      expect(membershipsRepository.findActiveByUserAndCompany).toHaveBeenCalledWith(
        ACTOR_ID,
        COMPANY_ID,
      );
    });
  });

  describe('assertHasPermission — no autorizado', () => {
    it('lanza DocumentNotFoundException si el actor no tiene Membership (incluye Administrador de plataforma sin Membership propia — mismo resultado que Membership inactiva, ambas resuelven a null en el repository)', async () => {
      const { service } = buildHelper({
        membershipsRepository: { findActiveByUserAndCompany: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION),
      ).rejects.toBeInstanceOf(DocumentNotFoundException);
    });

    it('lanza DocumentNotFoundException si el Rol de la Membership no incluye el permiso', async () => {
      const { service } = buildHelper({
        rolesRepository: {
          findPermissionKeysForRole: jest.fn().mockResolvedValue(['company.read']),
        },
      });

      await expect(
        service.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION),
      ).rejects.toBeInstanceOf(DocumentNotFoundException);
    });

    it('no consulta permisos si no hay Membership activa (evita trabajo innecesario)', async () => {
      const { service, rolesRepository } = buildHelper({
        membershipsRepository: { findActiveByUserAndCompany: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION)).rejects.toThrow();

      expect(rolesRepository.findPermissionKeysForRole).not.toHaveBeenCalled();
    });

    it('el mensaje es identico entre "sin Membership" y "sin permiso" — no distingue el motivo', async () => {
      const { service: withoutMembership } = buildHelper({
        membershipsRepository: { findActiveByUserAndCompany: jest.fn().mockResolvedValue(null) },
      });
      const { service: withoutPermission } = buildHelper({
        rolesRepository: { findPermissionKeysForRole: jest.fn().mockResolvedValue([]) },
      });

      const [errorA, errorB] = await Promise.all([
        withoutMembership.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION).catch((e) => e),
        withoutPermission.assertHasPermission(ACTOR_ID, COMPANY_ID, PERMISSION).catch((e) => e),
      ]);

      expect((errorA as Error).message).toBe((errorB as Error).message);
    });
  });
});
