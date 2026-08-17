'use client';

import { useState } from 'react';

import {
  INVOICE_DOC_TYPE_LABEL,
  INVOICE_STATUS_LABEL,
  MOCK_INVOICES_DUE_THIS_WEEK_LABEL,
  MOCK_INVOICES_PAGINATION_LABEL,
  type Invoice,
  type InvoiceDocType,
  type InvoiceStatus,
} from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

type Tab = 'Facturas' | 'Recibos' | 'Todas';

const TABS: readonly Tab[] = ['Facturas', 'Recibos', 'Todas'];

const TAB_DOC_TYPE: Record<Tab, InvoiceDocType | null> = {
  Facturas: 'factura',
  Recibos: 'recibo',
  Todas: null,
};

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; color: string }> = {
  'vence-hoy': { bg: DASHBOARD_COLORS.warningTint, color: DASHBOARD_COLORS.warning },
  pagada: { bg: DASHBOARD_COLORS.successTint, color: DASHBOARD_COLORS.success },
  vencida: { bg: DASHBOARD_COLORS.dangerTint, color: DASHBOARD_COLORS.danger },
  pendiente: { bg: DASHBOARD_COLORS.accentTint, color: DASHBOARD_COLORS.accent },
};

export function InvoicesTable({ invoices }: { invoices: readonly Invoice[] }): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('Facturas');

  const docType = TAB_DOC_TYPE[activeTab];
  const filtered = docType ? invoices.filter((invoice) => invoice.tipo === docType) : invoices;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="tablist" aria-label="Filtrar documentos">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab)}
                className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold"
                style={
                  isActive
                    ? {
                        backgroundColor: DASHBOARD_COLORS.accentTint,
                        color: DASHBOARD_COLORS.accent,
                      }
                    : { color: DASHBOARD_COLORS.mutedText }
                }
              >
                {tab}
              </button>
            );
          })}
        </div>
        <span className="text-[11.5px] font-medium" style={{ color: DASHBOARD_COLORS.danger }}>
          {MOCK_INVOICES_DUE_THIS_WEEK_LABEL}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12.5px]">
          <thead>
            <tr style={{ color: DASHBOARD_COLORS.fadedText }} className="text-[11px] uppercase">
              <th className="pb-2 font-semibold">Documento</th>
              <th className="pb-2 font-semibold">Folio</th>
              <th className="pb-2 font-semibold">Monto</th>
              <th className="pb-2 font-semibold">Fecha</th>
              <th className="pb-2 font-semibold">Vencimiento</th>
              <th className="pb-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((invoice) => {
              const statusStyle = STATUS_STYLE[invoice.estado];
              return (
                <tr
                  key={invoice.id}
                  className="border-t"
                  style={{ borderColor: DASHBOARD_COLORS.cardBorder }}
                >
                  <td className="py-2.5">
                    <div className="font-semibold" style={{ color: DASHBOARD_COLORS.headingText }}>
                      {INVOICE_DOC_TYPE_LABEL[invoice.tipo]} #{invoice.folio}
                    </div>
                    <div style={{ color: DASHBOARD_COLORS.fadedText }}>{invoice.cliente}</div>
                  </td>
                  <td style={{ color: DASHBOARD_COLORS.mutedText }}>{invoice.folio}</td>
                  <td className="font-medium" style={{ color: DASHBOARD_COLORS.headingText }}>
                    {invoice.monto}
                  </td>
                  <td style={{ color: DASHBOARD_COLORS.mutedText }}>{invoice.fecha}</td>
                  <td style={{ color: DASHBOARD_COLORS.mutedText }}>{invoice.vencimiento}</td>
                  <td>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                    >
                      {INVOICE_STATUS_LABEL[invoice.estado]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center"
                  style={{ color: DASHBOARD_COLORS.fadedText }}
                >
                  No hay documentos de este tipo en el periodo de demostración.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div
        className="flex items-center justify-between text-[12px]"
        style={{ color: DASHBOARD_COLORS.mutedText }}
      >
        <span>{MOCK_INVOICES_PAGINATION_LABEL}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Próximamente"
            className="cursor-not-allowed opacity-60"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Próximamente"
            className="cursor-not-allowed opacity-60"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
