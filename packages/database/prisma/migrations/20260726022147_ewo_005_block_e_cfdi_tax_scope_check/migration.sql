-- CreateCheckConstraint (SQL manual, no expresable en schema.prisma — Addendum AD-5 §4.5.2, aprobado en E5-S1-T04)
-- Migración correctiva: 20260726020913 se aplicó antes de incorporar este CHECK manualmente.
ALTER TABLE "cfdi_taxes"
ADD CONSTRAINT "cfdi_taxes_scope_concept_check"
CHECK (
  (
    "scope" = 'CFDI'
    AND "cfdi_concept_id" IS NULL
    AND "concept_slot" = 0
  )
  OR
  (
    "scope" = 'CONCEPT'
    AND "cfdi_concept_id" IS NOT NULL
    AND "concept_slot" > 0
  )
);
