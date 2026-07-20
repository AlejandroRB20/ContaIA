import type {
  CompanyAddress,
  CompanyDetail,
  CompanyFiscalProfile,
  CompanySettings,
  CompanySummary,
  CreateCompanyInput,
  CreatedCompany,
  OrganizationDetail,
  UpdateAddressInput,
  UpdateCompanyInput,
  UpdateFiscalProfileInput,
  UpdateSettingsInput,
} from '@contaia/types';

import { apiRequest } from './http';

export async function fetchCompanies(): Promise<CompanySummary[]> {
  return apiRequest<CompanySummary[]>('/companies');
}

export async function fetchCompany(companyId: string): Promise<CompanyDetail> {
  return apiRequest<CompanyDetail>(`/companies/${encodeURIComponent(companyId)}`);
}

export async function createCompany(input: CreateCompanyInput): Promise<CreatedCompany> {
  return apiRequest<CreatedCompany>('/companies', { method: 'POST', body: input });
}

/**
 * `expectedVersion` viaja como `If-Match` (docs/08_API_DESIGN.md sección 13,
 * bloqueo optimista) — el mismo patrón ya usado para cambiar el Rol de una
 * Membership.
 */
export async function updateCompany(
  companyId: string,
  input: UpdateCompanyInput,
  expectedVersion: number,
): Promise<CompanyDetail> {
  return apiRequest<CompanyDetail>(`/companies/${encodeURIComponent(companyId)}`, {
    method: 'PATCH',
    body: input,
    headers: { 'If-Match': String(expectedVersion) },
  });
}

export async function fetchOrganization(organizationId: string): Promise<OrganizationDetail> {
  return apiRequest<OrganizationDetail>(`/organizations/${encodeURIComponent(organizationId)}`);
}

/** EWO-003 sección 5.7 — perfil fiscal, mismo patrón de bloqueo optimista que `updateCompany`. */
export async function updateFiscalProfile(
  companyId: string,
  input: UpdateFiscalProfileInput,
  expectedVersion: number,
): Promise<CompanyFiscalProfile> {
  return apiRequest<CompanyFiscalProfile>(
    `/companies/${encodeURIComponent(companyId)}/fiscal-profile`,
    {
      method: 'PATCH',
      body: input,
      headers: { 'If-Match': String(expectedVersion) },
    },
  );
}

/** EWO-003 sección 5.7 — domicilio fiscal. */
export async function updateAddress(
  companyId: string,
  input: UpdateAddressInput,
  expectedVersion: number,
): Promise<CompanyAddress> {
  return apiRequest<CompanyAddress>(`/companies/${encodeURIComponent(companyId)}/address`, {
    method: 'PATCH',
    body: input,
    headers: { 'If-Match': String(expectedVersion) },
  });
}

/** EWO-003 sección 5.8 — configuración regional. */
export async function updateSettings(
  companyId: string,
  input: UpdateSettingsInput,
  expectedVersion: number,
): Promise<CompanySettings> {
  return apiRequest<CompanySettings>(`/companies/${encodeURIComponent(companyId)}/settings`, {
    method: 'PATCH',
    body: input,
    headers: { 'If-Match': String(expectedVersion) },
  });
}
