---
paths:
  - "apps/api/**/*.ts"
  - "apps/web/**/*.ts"
  - "apps/web/**/*.tsx"
  - "packages/database/prisma/**"
  - "packages/types/**/*.ts"
---

# Seguridad, sesión y aislamiento multiempresa

1. Preservar D-002: `User` no recupera `companyId`, `role` ni `isOwner`; la relación empresa-usuario-rol pertenece a `Membership`. Respetar `@@unique([userId, companyId])`, `membershipStatus` y `deletedAt`.
2. La sesión usa `userId`, `activeCompanyId` y `membershipId`. Nunca confiar en un `companyId` enviado por cliente sin validar pertenencia activa, alcance y autorización en el servidor.
3. Mantener `Role`, `Permission` y `RolePermission` como el modelo RBAC vigente. Ningún atajo de plataforma, ownership o rol puede evitar controles company-scoped sin una decisión aprobada.
4. Preservar D-006: MFA es obligatoria si el usuario tiene al menos una Membership activa con un rol distinto de Estudiante. No cambiar esta regla, su modelo global de usuario ni el flujo de sesión sin aprobación.
5. Para toda lectura, escritura, evento, job, consulta Prisma o endpoint de datos de negocio, comprobar explícitamente aislamiento por empresa, Membership activa y baja lógica cuando aplique.
6. No revelar secretos, tokens, credenciales, datos fiscales ni información de otra empresa en logs, respuestas, fixtures o pruebas. No leer ni editar archivos `.env` o equivalentes salvo autorización humana expresa.
7. Si se detecta riesgo de escalamiento de privilegios, fuga interempresa, bypass de MFA o exposición de secretos, detener la implementación y reportar severidad, ubicación, impacto y corrección mínima.
