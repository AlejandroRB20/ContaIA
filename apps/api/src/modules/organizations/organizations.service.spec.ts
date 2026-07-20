import { RoleName } from '@contaia/database';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import type { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';

import { OrganizationsService } from './organizations.service';
import type { OrganizationsRepository } from './repositories/organizations.repository';

const CONTEXT = { correlationId: 'test-correlation-id' };

describe('OrganizationsService', () => {
  let organizationsRepository: jest.Mocked<OrganizationsRepository>;
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let events: jest.Mocked<EventEmitter2>;
  let service: OrganizationsService;

  beforeEach(() => {
    organizationsRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsRepository>;
    membershipsRepository = {
      findAllForUser: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new OrganizationsService(organizationsRepository, membershipsRepository, events);
  });

  describe('createOrganization (API-0009, BR-ORG-001)', () => {
    it('crea la Organizacion y emite el evento de auditoria', async () => {
      organizationsRepository.create.mockResolvedValue({
        id: 'org-1',
        name: 'Despacho Demo',
      } as never);

      const result = await service.createOrganization('Despacho Demo', 'user-1', CONTEXT);

      expect(result).toEqual({ id: 'org-1', name: 'Despacho Demo' });
      expect(events.emit).toHaveBeenCalledWith(
        'organizations.organization_created',
        expect.objectContaining({ organizationId: 'org-1', actorUserId: 'user-1' }),
      );
    });
  });

  describe('getOrganization (API-0010, BR-ORG-002)', () => {
    it('lanza NotFound si la Organizacion no existe', async () => {
      organizationsRepository.findById.mockResolvedValue(null);

      await expect(service.getOrganization('org-x', 'user-1')).rejects.toThrow();
    });

    it('rechaza el acceso si el usuario no tiene Membresia en ninguna Company de la Organizacion', async () => {
      organizationsRepository.findById.mockResolvedValue({
        id: 'org-1',
        name: 'Despacho',
      } as never);
      membershipsRepository.findAllForUser.mockResolvedValue([
        {
          role: { name: RoleName.CONTADOR },
          company: { organizationId: 'org-otra' },
          isOwner: false,
        } as never,
      ]);

      await expect(service.getOrganization('org-1', 'user-1')).rejects.toThrow();
    });

    it('devuelve unicamente las Company de la Organizacion donde el usuario tiene Membresia (BR-ORG-001, escenario de prueba)', async () => {
      organizationsRepository.findById.mockResolvedValue({
        id: 'org-1',
        name: 'Despacho',
      } as never);
      membershipsRepository.findAllForUser.mockResolvedValue([
        {
          role: { name: RoleName.CONTADOR },
          isOwner: false,
          company: { id: 'company-a', name: 'Empresa A', organizationId: 'org-1' },
        } as never,
        {
          role: { name: RoleName.ADMINISTRADOR },
          isOwner: true,
          company: { id: 'company-b', name: 'Empresa B', organizationId: 'org-1' },
        } as never,
        {
          role: { name: RoleName.CONTADOR },
          isOwner: false,
          company: { id: 'company-c', name: 'Empresa C (otra org)', organizationId: 'org-otra' },
        } as never,
      ]);

      const result = await service.getOrganization('org-1', 'user-1');

      expect(result.companies).toHaveLength(2);
      expect(result.companies.map((c) => c.id)).toEqual(['company-a', 'company-b']);
    });
  });
});
