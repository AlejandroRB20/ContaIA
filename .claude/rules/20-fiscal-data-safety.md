---
paths:
  - "apps/api/src/modules/**/*"
  - "packages/database/prisma/**"
  - "packages/database/src/**"
  - "docs/engineering/**"
---

# Seguridad fiscal, contable y de datos

1. No crear, cambiar ni certificar reglas fiscales, contables o legales sin fuente oficial vigente y revisión del responsable humano. Distinguir siempre fuente, interpretación y dato pendiente.
2. No ejecutar migraciones, seeds con efectos en datos, comandos de producción ni operaciones destructivas. Los cambios de Prisma requieren una Work Order aprobada, plan de reversión, revisión de arquitectura y validación humana previa.
3. Preservar la atomicidad, idempotencia, trazabilidad y reglas de concurrencia aprobadas para CFDI. No sustituir transacciones, validaciones, checksums o transiciones por atajos silenciosos.
4. No alterar importes, impuestos, fechas de emisión, estados de CFDI o evidencia de auditoría para que una prueba o un flujo aparente aprobar. Reportar descuadres y datos insuficientes.
5. Toda propuesta que afecte cálculo, retención, CFDI, SAT, IMSS, INFONAVIT o conservación de datos debe incluir fuente, periodo de vigencia, supuestos, impacto y revisión fiscal requerida.
