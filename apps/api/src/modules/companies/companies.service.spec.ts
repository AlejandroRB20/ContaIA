import { RoleName } from '@contaia/database';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import type { OrganizationsRepository } from '../organizations/repositories/organizations.repository';
import type { MembershipsRepository } from '../roles-permissions/repositories/memberships.repository';
import type { RolesRepository } from '../roles-permissions/repositories/roles.repository';
import type { UsersRepository } from '../users/repositories/users.repository';

import { CompaniesService } from './companies.service';
import type { CompaniesRepository } from './repositories/companies.repository';

const CONTEXT = { correlationId: 'test-correlation-id' };

describe('CompaniesService', () => {
  let companiesRepository: jest.Mocked<CompaniesRepository>;
  let organizationsRepository: jest.Mocked<OrganizationsRepository>;
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let events: jest.Mocked<EventEmitter2>;
  let service: CompaniesService;

  beforeEach(() => {
    companiesRepository = {
      findById: jest.fn(),
      findAggregateById: jest.fn(),
      createWithOwnerMembership: jest.fn(),
      update: jest.fn(),
      updateFiscalProfile: jest.fn(),
      updateAddress: jest.fn(),
      updateSettings: jest.fn(),
    } as unknown as jest.Mocked<CompaniesRepository>;
    organizationsRepository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<OrganizationsRepository>;
    membershipsRepository = {
      findAllForUser: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    rolesRepository = { findByName: jest.fn() } as unknown as jest.Mocked<RolesRepository>;
    usersRepository = { findById: jest.fn() } as unknown as jest.Mocked<UsersRepository>;
    events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new CompaniesService(
      companiesRepository,
      organizationsRepository,
      membershipsRepository,
      rolesRepository,
      usersRepository,
      events,
    );
  });

  describe('createCompany (BR-EMP-001)', () => {
    it('crea una Organizacion implicita cuando el usuario no administra ninguna Company (BR-ORG-001)', async () => {
      membershipsRepository.findAllForUser.mockResolvedValue([]);
      usersRepository.findById.mockResolvedValue({
        firstName: 'Ana',
        lastName: 'Demo',
      } as never);
      rolesRepository.findByName.mockResolvedValue({ id: 'role-admin' } as never);
      companiesRepository.createWithOwnerMembership.mockResolvedValue({
        company: {
          id: 'company-1',
          organizationId: 'org-implicit',
          name: 'Mi Empresa',
          businessActivity: 'Comercio',
          rfc: null,
        } as never,
        membershipId: 'membership-1',
        organizationId: 'org-implicit',
        organizationCreated: true,
      });

      const result = await service.createCompany(
        'user-1',
        { name: 'Mi Empresa', businessActivity: 'Comercio' },
        CONTEXT,
      );

      expect(companiesRepository.createWithOwnerMembership).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: { newName: 'Ana Demo' },
          ownerUserId: 'user-1',
          administradorRoleId: 'role-admin',
        }),
      );
      expect(result).toMatchObject({
        id: 'company-1',
        isOwner: true,
        role: RoleName.ADMINISTRADOR,
      });
      expect(events.emit).toHaveBeenCalledTimes(2); // ORGANIZATION_CREATED + COMPANY_CREATED
    });

    it('agrupa bajo la Organizacion existente si el usuario ya administra otra Company', async () => {
      membershipsRepository.findAllForUser.mockResolvedValue([
        {
          role: { name: RoleName.ADMINISTRADOR },
          company: { organizationId: 'org-existente' },
        } as never,
      ]);
      rolesRepository.findByName.mockResolvedValue({ id: 'role-admin' } as never);
      companiesRepository.createWithOwnerMembership.mockResolvedValue({
        company: {
          id: 'company-2',
          organizationId: 'org-existente',
          name: 'Segunda Empresa',
          businessActivity: 'Servicios',
          rfc: null,
        } as never,
        membershipId: 'membership-2',
        organizationId: 'org-existente',
        organizationCreated: false,
      });

      await service.createCompany(
        'user-1',
        { name: 'Segunda Empresa', businessActivity: 'Servicios' },
        CONTEXT,
      );

      expect(companiesRepository.createWithOwnerMembership).toHaveBeenCalledWith(
        expect.objectContaining({ organization: { existingId: 'org-existente' } }),
      );
      // Solo COMPANY_CREATED — la Organizacion ya existia, no se re-emite su evento.
      expect(events.emit).toHaveBeenCalledTimes(1);
    });

    it('rechaza asociar a un organizationId explicito que el usuario no administra', async () => {
      organizationsRepository.findById.mockResolvedValue({ id: 'org-ajena' } as never);
      membershipsRepository.findAllForUser.mockResolvedValue([
        {
          role: { name: RoleName.CONTADOR },
          company: { organizationId: 'org-ajena' },
        } as never,
      ]);
      rolesRepository.findByName.mockResolvedValue({ id: 'role-admin' } as never);

      await expect(
        service.createCompany(
          'user-1',
          { name: 'Empresa X', businessActivity: 'Giro X', organizationId: 'org-ajena' },
          CONTEXT,
        ),
      ).rejects.toThrow();

      expect(companiesRepository.createWithOwnerMembership).not.toHaveBeenCalled();
    });

    it('rechaza un organizationId que no existe', async () => {
      organizationsRepository.findById.mockResolvedValue(null);
      rolesRepository.findByName.mockResolvedValue({ id: 'role-admin' } as never);

      await expect(
        service.createCompany(
          'user-1',
          { name: 'Empresa X', businessActivity: 'Giro X', organizationId: 'org-inexistente' },
          CONTEXT,
        ),
      ).rejects.toThrow();
    });
  });

  describe('listForUser (BR-GLB-001/BR-ORG-001)', () => {
    it('devuelve solo las Company donde el usuario tiene Membresia activa', async () => {
      membershipsRepository.findAllForUser.mockResolvedValue([
        {
          id: 'membership-1',
          isOwner: true,
          role: { name: RoleName.ADMINISTRADOR },
          company: {
            id: 'company-1',
            organizationId: 'org-1',
            name: 'Empresa A',
            businessActivity: 'Comercio',
            rfc: null,
          },
        } as never,
      ]);

      const result = await service.listForUser('user-1');

      expect(result).toEqual([
        {
          membershipId: 'membership-1',
          companyId: 'company-1',
          organizationId: 'org-1',
          name: 'Empresa A',
          businessActivity: 'Comercio',
          rfc: null,
          role: RoleName.ADMINISTRADOR,
          isOwner: true,
        },
      ]);
    });
  });

  describe('getCompany', () => {
    it('lanza NotFound si la Company no existe', async () => {
      companiesRepository.findAggregateById.mockResolvedValue(null);
      await expect(service.getCompany('company-x')).rejects.toThrow();
    });

    it('devuelve el agregado completo (general + fiscal + domicilio + configuracion)', async () => {
      companiesRepository.findAggregateById.mockResolvedValue({
        company: {
          id: 'company-1',
          organizationId: 'org-1',
          name: 'Empresa A',
          tradeName: null,
          businessActivity: 'Comercio',
          rfc: null,
          version: 1,
        } as never,
        fiscalProfile: { taxRegime: '601 - General de Ley Personas Morales' } as never,
        address: { street: 'Reforma', country: 'MX' } as never,
        settings: {
          timeZone: 'America/Mexico_City',
          baseCurrency: 'MXN',
          language: 'es-MX',
          country: 'MX',
        } as never,
      });

      const result = await service.getCompany('company-1');

      expect(result).toMatchObject({
        id: 'company-1',
        fiscalProfile: { taxRegime: '601 - General de Ley Personas Morales' },
        address: { street: 'Reforma', country: 'MX' },
        settings: { timeZone: 'America/Mexico_City' },
      });
    });
  });

  describe('updateCompany (BR-EMP-003/BR-CFG-002)', () => {
    it('registra antes/despues solo de los campos enviados y emite el evento', async () => {
      companiesRepository.findById.mockResolvedValue({
        id: 'company-1',
        organizationId: 'org-1',
        name: 'Nombre Viejo',
        businessActivity: 'Giro Viejo',
        rfc: null,
      } as never);
      companiesRepository.update.mockResolvedValue({
        id: 'company-1',
        organizationId: 'org-1',
        name: 'Nombre Nuevo',
        businessActivity: 'Giro Viejo',
        rfc: null,
      } as never);

      await service.updateCompany('company-1', { name: 'Nombre Nuevo' }, 1, 'user-admin', CONTEXT);

      expect(companiesRepository.update).toHaveBeenCalledWith(
        'company-1',
        { name: 'Nombre Nuevo' },
        1,
      );
      expect(events.emit).toHaveBeenCalledWith(
        'companies.company_updated',
        expect.objectContaining({
          beforeState: { name: 'Nombre Viejo' },
          afterState: { name: 'Nombre Nuevo' },
        }),
      );
    });

    it('traduce un conflicto de version a CompanyVersionConflictException', async () => {
      companiesRepository.findById.mockResolvedValue({
        id: 'company-1',
        organizationId: 'org-1',
        name: 'Nombre',
        businessActivity: 'Giro',
        rfc: null,
      } as never);
      companiesRepository.update.mockRejectedValue(new Error('VERSION_CONFLICT'));

      await expect(
        service.updateCompany('company-1', { name: 'Otro' }, 1, 'user-admin', CONTEXT),
      ).rejects.toThrow();
    });
  });

  describe('updateFiscalProfile (EWO-003 seccion 5.7)', () => {
    it('registra antes/despues y emite el evento', async () => {
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: 'company-1' } as never,
        fiscalProfile: { taxRegime: 'Antiguo' } as never,
        address: null,
        settings: null,
      });
      companiesRepository.updateFiscalProfile.mockResolvedValue({ taxRegime: 'Nuevo' } as never);

      await service.updateFiscalProfile(
        'company-1',
        { taxRegime: 'Nuevo' },
        1,
        'user-admin',
        CONTEXT,
      );

      expect(companiesRepository.updateFiscalProfile).toHaveBeenCalledWith(
        'company-1',
        { taxRegime: 'Nuevo' },
        1,
      );
      expect(events.emit).toHaveBeenCalledWith(
        'companies.fiscal_profile_updated',
        expect.objectContaining({
          beforeState: { taxRegime: 'Antiguo' },
          afterState: { taxRegime: 'Nuevo' },
        }),
      );
    });

    it('traduce un conflicto de version a CompanyVersionConflictException', async () => {
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: 'company-1' } as never,
        fiscalProfile: { taxRegime: 'Antiguo' } as never,
        address: null,
        settings: null,
      });
      companiesRepository.updateFiscalProfile.mockRejectedValue(new Error('VERSION_CONFLICT'));

      await expect(
        service.updateFiscalProfile('company-1', { taxRegime: 'Nuevo' }, 1, 'user-admin', CONTEXT),
      ).rejects.toThrow();
    });

    it('lanza NotFound si la Company no existe', async () => {
      companiesRepository.findAggregateById.mockResolvedValue(null);
      await expect(
        service.updateFiscalProfile('company-x', { taxRegime: 'Nuevo' }, 1, 'user-admin', CONTEXT),
      ).rejects.toThrow();
    });
  });

  describe('updateAddress (EWO-003 seccion 5.7)', () => {
    it('registra antes/despues y emite el evento', async () => {
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: 'company-1' } as never,
        fiscalProfile: null,
        address: { street: 'Calle Vieja', country: 'MX' } as never,
        settings: null,
      });
      companiesRepository.updateAddress.mockResolvedValue({
        street: 'Calle Nueva',
        exteriorNumber: null,
        interiorNumber: null,
        neighborhood: null,
        municipality: null,
        state: null,
        postalCode: null,
        country: 'MX',
      } as never);

      await service.updateAddress('company-1', { street: 'Calle Nueva' }, 1, 'user-admin', CONTEXT);

      expect(companiesRepository.updateAddress).toHaveBeenCalledWith(
        'company-1',
        { street: 'Calle Nueva' },
        1,
      );
      expect(events.emit).toHaveBeenCalledWith(
        'companies.address_updated',
        expect.objectContaining({
          beforeState: { street: 'Calle Vieja' },
          afterState: { street: 'Calle Nueva' },
        }),
      );
    });
  });

  describe('updateSettings (EWO-003 seccion 5.8)', () => {
    it('registra antes/despues y emite el evento', async () => {
      companiesRepository.findAggregateById.mockResolvedValue({
        company: { id: 'company-1' } as never,
        fiscalProfile: null,
        address: null,
        settings: {
          timeZone: 'America/Mexico_City',
          baseCurrency: 'MXN',
          language: 'es-MX',
          country: 'MX',
        } as never,
      });
      companiesRepository.updateSettings.mockResolvedValue({
        timeZone: 'America/Cancun',
        baseCurrency: 'MXN',
        language: 'es-MX',
        country: 'MX',
      } as never);

      await service.updateSettings(
        'company-1',
        { timeZone: 'America/Cancun' },
        1,
        'user-admin',
        CONTEXT,
      );

      expect(companiesRepository.updateSettings).toHaveBeenCalledWith(
        'company-1',
        { timeZone: 'America/Cancun' },
        1,
      );
      expect(events.emit).toHaveBeenCalledWith(
        'companies.settings_updated',
        expect.objectContaining({
          beforeState: { timeZone: 'America/Mexico_City' },
          afterState: { timeZone: 'America/Cancun' },
        }),
      );
    });
  });
});
