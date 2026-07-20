/**
 * Contratos de Organizations & Companies (EWO-003) compartidos entre
 * apps/api y apps/web — docs/08_API_DESIGN.md sección 9.2 (API-0009 a
 * API-0014, más sub-recursos de perfil fiscal/domicilio/configuración
 * agregados en la ampliación de EWO-003, sin respaldo en docs/09, ver
 * docs/engineering/EWO-003_COMPANY_REPORT.md).
 */

import type { RoleName } from './auth';

export interface CompanySummary {
  membershipId: string;
  companyId: string;
  organizationId: string;
  name: string;
  tradeName: string | null;
  businessActivity: string;
  rfc: string | null;
  role: RoleName;
  isOwner: boolean;
}

export interface CompanyFiscalProfile {
  taxRegime: string | null;
}

export interface CompanyAddress {
  street: string | null;
  exteriorNumber: string | null;
  interiorNumber: string | null;
  neighborhood: string | null;
  municipality: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface CompanySettings {
  timeZone: string;
  baseCurrency: string;
  language: string;
  country: string;
}

export interface CompanyDetail {
  id: string;
  organizationId: string;
  name: string;
  tradeName: string | null;
  businessActivity: string;
  rfc: string | null;
  version: number;
  role: RoleName;
  isOwner: boolean;
  fiscalProfile: CompanyFiscalProfile | null;
  address: CompanyAddress | null;
  settings: CompanySettings | null;
}

export interface CreateCompanyInput {
  name: string;
  businessActivity: string;
  tradeName?: string;
  rfc?: string;
  organizationId?: string;
}

export interface CreatedCompany {
  id: string;
  organizationId: string;
  name: string;
  tradeName: string | null;
  businessActivity: string;
  rfc: string | null;
  membershipId: string;
  role: RoleName;
  isOwner: boolean;
}

export interface UpdateCompanyInput {
  name?: string;
  tradeName?: string;
  businessActivity?: string;
  rfc?: string;
}

export interface UpdateFiscalProfileInput {
  taxRegime?: string;
}

export interface UpdateAddressInput {
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  municipality?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface UpdateSettingsInput {
  timeZone?: string;
  baseCurrency?: string;
  language?: string;
  country?: string;
}

export interface OrganizationCompanySummary {
  id: string;
  name: string;
  role: RoleName;
  isOwner: boolean;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  companies: OrganizationCompanySummary[];
}
