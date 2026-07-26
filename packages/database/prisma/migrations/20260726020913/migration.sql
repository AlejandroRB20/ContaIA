/*
  Warnings:

  - A unique constraint covering the columns `[id,company_id]` on the table `cfdis` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CfdiTaxScope" AS ENUM ('CFDI', 'CONCEPT');

-- CreateEnum
CREATE TYPE "CfdiTaxType" AS ENUM ('TRANSFER', 'WITHHOLDING');

-- CreateTable
CREATE TABLE "cfdi_concepts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cfdi_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "clave_prod_serv" TEXT NOT NULL,
    "no_identificacion" TEXT,
    "cantidad" DECIMAL(18,6) NOT NULL,
    "clave_unidad" TEXT NOT NULL,
    "unidad" TEXT,
    "descripcion" TEXT NOT NULL,
    "valor_unitario" DECIMAL(18,6) NOT NULL,
    "importe" DECIMAL(18,6) NOT NULL,
    "descuento" DECIMAL(18,6),
    "objeto_imp" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cfdi_concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdi_taxes" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cfdi_id" UUID NOT NULL,
    "cfdi_concept_id" UUID,
    "scope" "CfdiTaxScope" NOT NULL,
    "concept_slot" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "CfdiTaxType" NOT NULL,
    "impuesto" TEXT NOT NULL,
    "tipo_factor" TEXT NOT NULL,
    "tasa_o_cuota" DECIMAL(18,6),
    "base" DECIMAL(18,6),
    "importe" DECIMAL(18,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cfdi_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cfdi_concepts_cfdi_id_idx" ON "cfdi_concepts"("cfdi_id");

-- CreateIndex
CREATE INDEX "cfdi_concepts_company_id_idx" ON "cfdi_concepts"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_concepts_company_id_cfdi_id_position_key" ON "cfdi_concepts"("company_id", "cfdi_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_concepts_id_cfdi_id_company_id_key" ON "cfdi_concepts"("id", "cfdi_id", "company_id");

-- CreateIndex
CREATE INDEX "cfdi_taxes_cfdi_id_idx" ON "cfdi_taxes"("cfdi_id");

-- CreateIndex
CREATE INDEX "cfdi_taxes_company_id_idx" ON "cfdi_taxes"("company_id");

-- CreateIndex
CREATE INDEX "cfdi_taxes_cfdi_concept_id_idx" ON "cfdi_taxes"("cfdi_concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "cfdi_taxes_company_id_cfdi_id_concept_slot_position_key" ON "cfdi_taxes"("company_id", "cfdi_id", "concept_slot", "position");

-- CreateIndex
CREATE UNIQUE INDEX "cfdis_id_company_id_key" ON "cfdis"("id", "company_id");

-- AddForeignKey
ALTER TABLE "cfdi_concepts" ADD CONSTRAINT "cfdi_concepts_cfdi_id_company_id_fkey" FOREIGN KEY ("cfdi_id", "company_id") REFERENCES "cfdis"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdi_taxes" ADD CONSTRAINT "cfdi_taxes_cfdi_id_company_id_fkey" FOREIGN KEY ("cfdi_id", "company_id") REFERENCES "cfdis"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdi_taxes" ADD CONSTRAINT "cfdi_taxes_cfdi_concept_id_cfdi_id_company_id_fkey" FOREIGN KEY ("cfdi_concept_id", "cfdi_id", "company_id") REFERENCES "cfdi_concepts"("id", "cfdi_id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;
