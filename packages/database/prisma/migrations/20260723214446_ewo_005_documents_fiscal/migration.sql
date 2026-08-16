-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('XML', 'PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('XML_EXTRACTION');

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "file_type" "DocumentFileType" NOT NULL,
    "mime_type" VARCHAR(150) NOT NULL,
    "size_bytes" INTEGER,
    "storage_reference" VARCHAR(500) NOT NULL,
    "checksum_sha256" VARCHAR(64),
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdis" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "folio_fiscal" VARCHAR(36) NOT NULL,
    "rfc_emisor" VARCHAR(13) NOT NULL,
    "rfc_receptor" VARCHAR(13) NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "subtotal" DECIMAL(18,6) NOT NULL,
    "total" DECIMAL(18,6) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "tipo_comprobante" VARCHAR(20) NOT NULL,
    "ambiguous_fields" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cfdis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_reference_key" ON "documents"("storage_reference");

-- CreateIndex
CREATE INDEX "documents_company_id_status_idx" ON "documents"("company_id", "status");

-- CreateIndex
CREATE INDEX "documents_company_id_created_at_idx" ON "documents"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "documents_company_id_checksum_sha256_idx" ON "documents"("company_id", "checksum_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "documents_id_company_id_key" ON "documents"("id", "company_id");

-- CreateIndex
CREATE INDEX "cfdis_company_id_issued_at_idx" ON "cfdis"("company_id", "issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "cfdis_document_id_company_id_key" ON "cfdis"("document_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cfdis_company_id_folio_fiscal_key" ON "cfdis"("company_id", "folio_fiscal");

-- CreateIndex
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");

-- CreateIndex
CREATE INDEX "jobs_document_id_status_idx" ON "jobs"("document_id", "status");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_company_id_fkey" FOREIGN KEY ("uploaded_by_user_id", "company_id") REFERENCES "memberships"("user_id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdis" ADD CONSTRAINT "cfdis_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdis" ADD CONSTRAINT "cfdis_document_id_company_id_fkey" FOREIGN KEY ("document_id", "company_id") REFERENCES "documents"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_document_id_company_id_fkey" FOREIGN KEY ("document_id", "company_id") REFERENCES "documents"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;
