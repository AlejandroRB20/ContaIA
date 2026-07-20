/**
 * Seed de ContaIA.
 *
 * EWO-001 sembraba unicamente `system_metadata` para validar la
 * infraestructura de extremo a extremo. EWO-002 agrega el primer bloque de
 * datos de dominio real: el catalogo de los seis Roles oficiales
 * (docs/04_BUSINESS_RULES.md seccion 5), el catalogo de Permission
 * solicitado explicitamente por EWO-002, su mapeo a RolePermission (basado
 * en la matriz de permisos de docs/04_BUSINESS_RULES.md seccion 5.1 y
 * docs/11_SECURITY_ARCHITECTURE.md seccion 9 — Estudiante no recibe
 * permisos reales, opera en sandbox), una Organizacion Demo con su Empresa
 * Demo (EWO-003: BR-ORG-001) y dos Usuario demo (Administrador propietario +
 * Contador), ambos con correo ya verificado para poder iniciar sesion de
 * inmediato en desarrollo.
 *
 * ADVERTENCIA: las contraseñas de este seed son de desarrollo unicamente,
 * nunca usar en un ambiente real (docs/25_DEVOPS.md / BR-SEC-002).
 */
import * as argon2 from 'argon2';

import {
  CompanyStatus,
  MembershipStatus,
  PrismaClient,
  RoleName,
  UserStatus,
} from '../generated/client/index.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ContaIA#Demo2026';

const PERMISSION_CATALOG: Array<{ key: string; description: string; module: string }> = [
  {
    key: 'company.read',
    description: 'Consultar datos generales de la empresa',
    module: 'company',
  },
  {
    key: 'company.update',
    description: 'Actualizar datos generales de la empresa',
    module: 'company',
  },
  {
    key: 'company.fiscal.update',
    description: 'Actualizar el perfil fiscal y domicilio de la empresa',
    module: 'company',
  },
  {
    key: 'company.settings.update',
    description: 'Actualizar la configuracion regional de la empresa',
    module: 'company',
  },
  { key: 'journal.read', description: 'Consultar polizas contables', module: 'journal' },
  { key: 'journal.create', description: 'Crear polizas contables (borrador)', module: 'journal' },
  { key: 'journal.approve', description: 'Aprobar polizas contables', module: 'journal' },
  { key: 'inventory.create', description: 'Crear movimientos de inventario', module: 'inventory' },
  {
    key: 'inventory.update',
    description: 'Actualizar movimientos de inventario',
    module: 'inventory',
  },
  { key: 'sat.download', description: 'Descargar informacion del SAT', module: 'sat' },
  { key: 'sat.upload', description: 'Cargar informacion hacia el SAT', module: 'sat' },
  { key: 'cfdi.generate', description: 'Generar/cargar CFDI', module: 'cfdi' },
  { key: 'cfdi.cancel', description: 'Cancelar CFDI', module: 'cfdi' },
  { key: 'users.invite', description: 'Invitar usuarios a la empresa', module: 'users' },
  { key: 'users.remove', description: 'Remover usuarios de la empresa', module: 'users' },
  { key: 'users.update', description: 'Actualizar el rol de un usuario', module: 'users' },
];

const ROLE_CATALOG: Array<{ name: RoleName; description: string }> = [
  {
    name: RoleName.ADMINISTRADOR,
    description: 'Administra la empresa: usuarios, configuracion y todo el alcance operativo.',
  },
  {
    name: RoleName.CONTADOR,
    description: 'Captura y aprueba polizas, gestiona el catalogo de cuentas y CFDI.',
  },
  { name: RoleName.AUXILIAR, description: 'Captura operativa (solo borrador) — nunca aprueba.' },
  {
    name: RoleName.SUPERVISOR,
    description: 'Revisa y aprueba casos sensibles, sin captura directa.',
  },
  { name: RoleName.AUDITOR, description: 'Acceso de solo lectura para auditoria.' },
  {
    name: RoleName.ESTUDIANTE,
    description: 'Entorno educativo simulado, sin acceso a datos reales de empresa.',
  },
];

/** docs/04_BUSINESS_RULES.md seccion 5.1 — Estudiante no aparece: opera en sandbox, sin permisos reales. */
const ROLE_PERMISSIONS: Partial<Record<RoleName, string[]>> = {
  [RoleName.ADMINISTRADOR]: PERMISSION_CATALOG.map((p) => p.key),
  [RoleName.CONTADOR]: [
    'company.read',
    'journal.read',
    'journal.create',
    'journal.approve',
    'inventory.create',
    'inventory.update',
    'sat.download',
    'sat.upload',
    'cfdi.generate',
    'cfdi.cancel',
  ],
  [RoleName.AUXILIAR]: [
    'company.read',
    'journal.read',
    'journal.create',
    'inventory.create',
    'inventory.update',
    'cfdi.generate',
  ],
  [RoleName.SUPERVISOR]: ['company.read', 'journal.read', 'journal.approve', 'sat.download'],
  [RoleName.AUDITOR]: ['company.read', 'journal.read', 'sat.download'],
};

async function seedSystemMetadata(): Promise<void> {
  const record = await prisma.systemMetadata.upsert({
    where: { key: 'foundation.bootstrapped_at' },
    update: { value: new Date().toISOString() },
    create: { key: 'foundation.bootstrapped_at', value: new Date().toISOString() },
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] system_metadata OK — key="${record.key}" id=${record.id}`);
}

async function seedRolesAndPermissions(): Promise<Map<RoleName, string>> {
  const roleIdByName = new Map<RoleName, string>();

  for (const role of ROLE_CATALOG) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description, isSystem: true },
    });
    roleIdByName.set(role.name, record.id);
  }

  const permissionIdByKey = new Map<string, string>();
  for (const permission of PERMISSION_CATALOG) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description, module: permission.module },
      create: permission,
    });
    permissionIdByKey.set(permission.key, record.id);
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS) as [
    RoleName,
    string[],
  ][]) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) continue;

    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed] roles OK (${ROLE_CATALOG.length}) — permissions OK (${PERMISSION_CATALOG.length})`,
  );

  return roleIdByName;
}

async function seedDemoCompanyAndUsers(roleIdByName: Map<RoleName, string>): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-4000-8000-000000000000' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000000',
      name: 'Organización Demo',
    },
  });

  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      organizationId: organization.id,
      name: 'Empresa Demo',
      businessActivity: 'Servicios de consultoría (datos sintéticos de desarrollo)',
      status: CompanyStatus.ACTIVE,
    },
  });

  await prisma.companyFiscalProfile.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id, taxRegime: '601 - General de Ley Personas Morales' },
  });

  await prisma.companyAddress.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      street: 'Av. Insurgentes Sur',
      exteriorNumber: '1234',
      neighborhood: 'Del Valle',
      municipality: 'Benito Juárez',
      state: 'Ciudad de México',
      postalCode: '03100',
      country: 'MX',
    },
  });

  await prisma.companySettings.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id },
  });

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@contaia.demo' },
    update: {},
    create: {
      email: 'admin@contaia.demo',
      passwordHash,
      firstName: 'Administradora',
      lastName: 'Demo',
      accountStatus: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const contador = await prisma.user.upsert({
    where: { email: 'contador@contaia.demo' },
    update: {},
    create: {
      email: 'contador@contaia.demo',
      passwordHash,
      firstName: 'Usuario',
      lastName: 'Demo',
      accountStatus: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  const administradorRoleId = roleIdByName.get(RoleName.ADMINISTRADOR);
  const contadorRoleId = roleIdByName.get(RoleName.CONTADOR);
  if (!administradorRoleId || !contadorRoleId) {
    throw new Error(
      '[seed] roles ADMINISTRADOR/CONTADOR no encontrados — revisa seedRolesAndPermissions.',
    );
  }

  await prisma.membership.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: {},
    create: {
      userId: admin.id,
      companyId: company.id,
      roleId: administradorRoleId,
      isOwner: true,
      membershipStatus: MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: { userId_companyId: { userId: contador.id, companyId: company.id } },
    update: {},
    create: {
      userId: contador.id,
      companyId: company.id,
      roleId: contadorRoleId,
      isOwner: false,
      membershipStatus: MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `[seed] Empresa Demo OK (${company.id})\n` +
      `[seed] Usuario Administrador: admin@contaia.demo / ${DEMO_PASSWORD} (isOwner=true)\n` +
      `[seed] Usuario Demo (Contador): contador@contaia.demo / ${DEMO_PASSWORD}\n` +
      '[seed] ADVERTENCIA: contraseñas de desarrollo unicamente — nunca usar en produccion.',
  );
}

async function main(): Promise<void> {
  await seedSystemMetadata();
  const roleIdByName = await seedRolesAndPermissions();
  await seedDemoCompanyAndUsers(roleIdByName);
}

main()
  .catch((error: unknown) => {
    console.error('[seed] fallo al ejecutar el seed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
