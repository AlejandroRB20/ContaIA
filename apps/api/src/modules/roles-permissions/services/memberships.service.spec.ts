import { MembershipStatus, RoleName } from '@contaia/database';
import type { EventEmitter2 } from '@nestjs/event-emitter';

import type { EmailSender } from '../../../common/email/email-sender.interface';
import type { CompaniesRepository } from '../../companies/repositories/companies.repository';
import type { UsersRepository } from '../../users/repositories/users.repository';
import type { InvitationsRepository } from '../repositories/invitations.repository';
import type { MembershipsRepository } from '../repositories/memberships.repository';
import type { RolesRepository } from '../repositories/roles.repository';

import { MembershipsService } from './memberships.service';

const CONTEXT = { correlationId: 'test-correlation-id' };

describe('MembershipsService', () => {
  let membershipsRepository: jest.Mocked<MembershipsRepository>;
  let invitationsRepository: jest.Mocked<InvitationsRepository>;
  let rolesRepository: jest.Mocked<RolesRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let companiesRepository: jest.Mocked<CompaniesRepository>;
  let events: jest.Mocked<EventEmitter2>;
  let emailSender: jest.Mocked<EmailSender>;
  let service: MembershipsService;

  beforeEach(() => {
    membershipsRepository = {
      findById: jest.fn(),
      findActiveByUserAndCompany: jest.fn(),
      findAllForCompany: jest.fn(),
      countActiveOwners: jest.fn(),
      updateRole: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<MembershipsRepository>;
    invitationsRepository = {
      findValidByTokenHash: jest.fn(),
      findByTokenHashWithRelations: jest.fn(),
      markDeclined: jest.fn(),
    } as unknown as jest.Mocked<InvitationsRepository>;
    rolesRepository = { findByName: jest.fn() } as unknown as jest.Mocked<RolesRepository>;
    usersRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    companiesRepository = {} as jest.Mocked<CompaniesRepository>;
    events = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    emailSender = { send: jest.fn() } as unknown as jest.Mocked<EmailSender>;

    service = new MembershipsService(
      membershipsRepository,
      invitationsRepository,
      rolesRepository,
      usersRepository,
      companiesRepository,
      events,
      emailSender,
      { INVITATION_TOKEN_TTL_DAYS: 7 } as never,
    );
  });

  describe('updateRole (BR-PERM-002)', () => {
    it('rechaza si el actor intenta modificar su propio rol', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-1',
        companyId: 'company-1',
        roleId: 'role-old',
      } as never);

      await expect(
        service.updateRole('membership-1', RoleName.CONTADOR, 1, 'user-1', CONTEXT),
      ).rejects.toThrow();

      expect(membershipsRepository.updateRole).not.toHaveBeenCalled();
    });

    it('rechaza si el actor no es Administrador de esa empresa', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        companyId: 'company-1',
        roleId: 'role-old',
      } as never);
      usersRepository.findById.mockResolvedValue({ isPlatformAdmin: false } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        membershipStatus: MembershipStatus.ACTIVE,
        role: { name: RoleName.CONTADOR },
      } as never);

      await expect(
        service.updateRole('membership-1', RoleName.AUXILIAR, 1, 'user-1', CONTEXT),
      ).rejects.toThrow();
    });

    it('permite el cambio de rol cuando el actor es Administrador de esa empresa', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        companyId: 'company-1',
        roleId: 'role-old',
      } as never);
      usersRepository.findById.mockResolvedValue({ isPlatformAdmin: false } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        membershipStatus: MembershipStatus.ACTIVE,
        role: { name: RoleName.ADMINISTRADOR },
      } as never);
      rolesRepository.findByName.mockResolvedValue({ id: 'role-new' } as never);
      membershipsRepository.updateRole.mockResolvedValue({} as never);

      await service.updateRole('membership-1', RoleName.SUPERVISOR, 1, 'user-1', CONTEXT);

      expect(membershipsRepository.updateRole).toHaveBeenCalledWith('membership-1', 'role-new', 1);
      expect(events.emit).toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('rechaza si el actor intenta revocar su propia Membership', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-1',
        companyId: 'company-1',
      } as never);

      await expect(service.revoke('membership-1', 'user-1', CONTEXT)).rejects.toThrow();
      expect(membershipsRepository.revoke).not.toHaveBeenCalled();
    });

    it('rechaza revocar al unico propietario activo de la empresa (BR-EMP-001)', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        companyId: 'company-1',
        isOwner: true,
      } as never);
      usersRepository.findById.mockResolvedValue({ isPlatformAdmin: false } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        membershipStatus: MembershipStatus.ACTIVE,
        role: { name: RoleName.ADMINISTRADOR },
      } as never);
      membershipsRepository.countActiveOwners.mockResolvedValue(1);

      await expect(service.revoke('membership-1', 'user-1', CONTEXT)).rejects.toThrow();
      expect(membershipsRepository.revoke).not.toHaveBeenCalled();
    });

    it('permite revocar a un propietario si existe otro propietario activo', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        companyId: 'company-1',
        isOwner: true,
      } as never);
      usersRepository.findById.mockResolvedValue({ isPlatformAdmin: false } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        membershipStatus: MembershipStatus.ACTIVE,
        role: { name: RoleName.ADMINISTRADOR },
      } as never);
      membershipsRepository.countActiveOwners.mockResolvedValue(2);

      await service.revoke('membership-1', 'user-1', CONTEXT);

      expect(membershipsRepository.revoke).toHaveBeenCalledWith('membership-1');
      expect(events.emit).toHaveBeenCalled();
    });

    it('permite revocar una Membership que no es propietaria sin consultar el conteo de propietarios', async () => {
      membershipsRepository.findById.mockResolvedValue({
        id: 'membership-1',
        userId: 'user-2',
        companyId: 'company-1',
        isOwner: false,
      } as never);
      usersRepository.findById.mockResolvedValue({ isPlatformAdmin: false } as never);
      membershipsRepository.findActiveByUserAndCompany.mockResolvedValue({
        membershipStatus: MembershipStatus.ACTIVE,
        role: { name: RoleName.ADMINISTRADOR },
      } as never);

      await service.revoke('membership-1', 'user-1', CONTEXT);

      expect(membershipsRepository.countActiveOwners).not.toHaveBeenCalled();
      expect(membershipsRepository.revoke).toHaveBeenCalledWith('membership-1');
    });
  });

  describe('listMembersForCompany (API-0016)', () => {
    it('devuelve el historial de Membresias de la Empresa en forma segura', async () => {
      membershipsRepository.findAllForCompany.mockResolvedValue([
        {
          id: 'membership-1',
          userId: 'user-1',
          isOwner: true,
          membershipStatus: MembershipStatus.ACTIVE,
          user: { id: 'user-1', firstName: 'Ana', lastName: 'Admin', email: 'ana@contaia.demo' },
          role: { name: RoleName.ADMINISTRADOR },
        } as never,
      ]);

      const result = await service.listMembersForCompany('company-1');

      expect(result).toEqual([
        {
          membershipId: 'membership-1',
          userId: 'user-1',
          firstName: 'Ana',
          lastName: 'Admin',
          email: 'ana@contaia.demo',
          role: RoleName.ADMINISTRADOR,
          isOwner: true,
          membershipStatus: MembershipStatus.ACTIVE,
        },
      ]);
    });
  });

  describe('previewInvitation (WF-0004)', () => {
    it('devuelve NOT_FOUND si el token no corresponde a ninguna invitacion', async () => {
      invitationsRepository.findByTokenHashWithRelations.mockResolvedValue(null);

      const result = await service.previewInvitation('token-invalido');

      expect(result).toEqual({ status: 'NOT_FOUND' });
    });

    it('devuelve EXPIRED si la invitacion vencio', async () => {
      invitationsRepository.findByTokenHashWithRelations.mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000),
        company: { name: 'Empresa Demo' },
        role: { name: RoleName.CONTADOR },
        invitedBy: { firstName: 'Ana', lastName: 'Admin' },
        email: 'invitado@example.com',
      } as never);
      usersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.previewInvitation('token-vencido');

      expect(result.status).toBe('EXPIRED');
    });

    it('devuelve PENDING con hasAccount=true si el correo ya tiene cuenta', async () => {
      invitationsRepository.findByTokenHashWithRelations.mockResolvedValue({
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        company: { name: 'Empresa Demo' },
        role: { name: RoleName.AUXILIAR },
        invitedBy: { firstName: 'Ana', lastName: 'Admin' },
        email: 'invitado@example.com',
      } as never);
      usersRepository.findByEmail.mockResolvedValue({ id: 'user-existente' } as never);

      const result = await service.previewInvitation('token-vigente');

      expect(result).toMatchObject({
        status: 'PENDING',
        companyName: 'Empresa Demo',
        role: RoleName.AUXILIAR,
        hasAccount: true,
      });
    });
  });

  describe('declineInvitation', () => {
    it('rechaza si el token no es valido', async () => {
      invitationsRepository.findValidByTokenHash.mockResolvedValue(null);

      await expect(service.declineInvitation('token-x', 'user-1', CONTEXT)).rejects.toThrow();
      expect(invitationsRepository.markDeclined).not.toHaveBeenCalled();
    });

    it('rechaza si el correo del usuario autenticado no coincide con el de la invitacion', async () => {
      invitationsRepository.findValidByTokenHash.mockResolvedValue({
        id: 'invitation-1',
        companyId: 'company-1',
        email: 'invitado@example.com',
      } as never);
      usersRepository.findById.mockResolvedValue({ email: 'otro@example.com' } as never);

      await expect(service.declineInvitation('token-x', 'user-1', CONTEXT)).rejects.toThrow();
      expect(invitationsRepository.markDeclined).not.toHaveBeenCalled();
    });

    it('marca la invitacion como rechazada y emite el evento de auditoria', async () => {
      invitationsRepository.findValidByTokenHash.mockResolvedValue({
        id: 'invitation-1',
        companyId: 'company-1',
        email: 'invitado@example.com',
      } as never);
      usersRepository.findById.mockResolvedValue({ email: 'invitado@example.com' } as never);

      await service.declineInvitation('token-x', 'user-1', CONTEXT);

      expect(invitationsRepository.markDeclined).toHaveBeenCalledWith('invitation-1');
      expect(events.emit).toHaveBeenCalled();
    });
  });
});
