/**
 * Datos de MOCK del panel financiero — contenido fiel al diseño fuente
 * `ContaIA Dashboard V2 (standalone) 2.html` (EWO-frontend-ui-02). Ningún
 * valor aquí proviene de `apps/api` ni de un cálculo fiscal/contable real.
 * Reemplazar cada bloque cuando exista el contrato de API correspondiente
 * (ver docs/08_API_DESIGN.md):
 *
 * - MOCK_DASHBOARD_KPIS       → endpoint de indicadores financieros del mes.
 * - MOCK_FINANCE_CHART        → endpoint de flujo de ingresos/egresos.
 * - MOCK_PERIOD_SUMMARY       → endpoint de resumen del periodo activo.
 * - MOCK_ATTENTION_ITEMS      → endpoint de pendientes que requieren acción.
 * - MOCK_INVOICES             → endpoint de documentos/CFDI (EWO-005).
 * - MOCK_AI_INSIGHTS          → módulo de IA (docs/10_AI_ARCHITECTURE.md).
 * - MOCK_DOCUMENT_STATUS      → endpoint de estado documental.
 * - MOCK_RECENT_ACTIVITY      → endpoint de actividad/movimientos recientes.
 * - MOCK_ASSISTANT_GREETING / MOCK_ASSISTANT_SUGGESTIONS → módulo de IA.
 *
 * Etiquetas sueltas del panel (periodo, rango de fechas, iniciales de
 * empresa, avisos de vencimiento/paginación) también viven aquí — ningún
 * componente debe declarar un literal de demostración por su cuenta.
 */

export type DeltaTone = 'up' | 'down';

export interface DashboardKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly deltaTone: DeltaTone;
  readonly helpText?: string;
}

export const MOCK_DASHBOARD_KPIS: readonly DashboardKpi[] = [
  { id: 'ingresos', label: 'Ingresos', value: '$142,300', delta: '+4.8%', deltaTone: 'up' },
  { id: 'gastos', label: 'Gastos', value: '$61,780', delta: '-2.1%', deltaTone: 'down' },
  { id: 'resultado', label: 'Resultado', value: '$80,520', delta: '+6.3%', deltaTone: 'up' },
  {
    id: 'flujo-disponible',
    label: 'Flujo disponible',
    value: '$58,900',
    delta: '+3.4%',
    deltaTone: 'up',
    helpText:
      'Efectivo disponible después de obligaciones inmediatas: nómina, proveedores y pagos próximos.',
  },
];

export interface FinanceChartPoint {
  readonly label: string;
  readonly ingresos: number;
  readonly egresos: number;
}

export const MOCK_FINANCE_CHART: readonly FinanceChartPoint[] = [
  { label: 'Ago 1', ingresos: 3200, egresos: 1800 },
  { label: 'Ago 4', ingresos: 4100, egresos: 2200 },
  { label: 'Ago 8', ingresos: 3800, egresos: 2600 },
  { label: 'Ago 11', ingresos: 5200, egresos: 2100 },
  { label: 'Ago 14', ingresos: 4700, egresos: 2900 },
  { label: 'Ago 18', ingresos: 6100, egresos: 2400 },
  { label: 'Ago 22', ingresos: 5600, egresos: 3100 },
  { label: 'Ago 26', ingresos: 6800, egresos: 2700 },
];

export const MOCK_PERIOD_LABEL = 'Agosto 2026';
export const MOCK_DATE_RANGE_LABEL = '1 – 31 Ago';

export interface PeriodSummary {
  readonly label: string;
  readonly status: string;
  readonly documentos: number;
  readonly movimientos: number;
  readonly pendientes: number;
  readonly revisados: number;
}

export const MOCK_PERIOD_SUMMARY: PeriodSummary = {
  label: MOCK_PERIOD_LABEL,
  status: 'En curso',
  documentos: 148,
  movimientos: 326,
  pendientes: 7,
  revisados: 319,
};

export const MOCK_ATTENTION_ITEMS: readonly string[] = [
  '4 facturas próximas a vencer',
  '3 movimientos pendientes de clasificación',
];

export interface QuickAction {
  readonly id: string;
  readonly label: string;
}

export const MOCK_QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'registrar-operacion', label: 'Registrar operación' },
  { id: 'subir-documento', label: 'Subir documento' },
  { id: 'nueva-poliza', label: 'Nueva póliza' },
  { id: 'ver-cuentas', label: 'Ver cuentas' },
  { id: 'preguntar-contaia', label: 'Preguntar a ContaIA' },
];

export type InvoiceStatus = 'vence-hoy' | 'pagada' | 'vencida' | 'pendiente';
export type InvoiceDocType = 'factura' | 'recibo';

export interface Invoice {
  readonly id: string;
  readonly folio: string;
  readonly tipo: InvoiceDocType;
  readonly cliente: string;
  readonly monto: string;
  readonly fecha: string;
  readonly vencimiento: string;
  readonly estado: InvoiceStatus;
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  'vence-hoy': 'Vence hoy',
  pagada: 'Pagada',
  vencida: 'Vencida',
  pendiente: 'Pendiente',
};

export const INVOICE_DOC_TYPE_LABEL: Record<InvoiceDocType, string> = {
  factura: 'Factura',
  recibo: 'Recibo',
};

export const MOCK_INVOICES: readonly Invoice[] = [
  {
    id: 'FNS-348',
    folio: 'FNS-348',
    tipo: 'factura',
    cliente: 'Grupo Meridian',
    monto: '$35,102.00',
    fecha: '3 Ago',
    vencimiento: '7 Ago',
    estado: 'vence-hoy',
  },
  {
    id: 'FNS-347',
    folio: 'FNS-347',
    tipo: 'factura',
    cliente: 'Comercial Aurora',
    monto: '$12,450.00',
    fecha: '2 Ago',
    vencimiento: '12 Ago',
    estado: 'pagada',
  },
  {
    id: 'FNS-346',
    folio: 'FNS-346',
    tipo: 'factura',
    cliente: 'Distribuidora Solvex',
    monto: '$8,900.00',
    fecha: '31 Jul',
    vencimiento: '4 Ago',
    estado: 'vencida',
  },
  {
    id: 'FNS-345',
    folio: 'FNS-345',
    tipo: 'factura',
    cliente: 'Textiles del Norte',
    monto: '$21,780.00',
    fecha: '28 Jul',
    vencimiento: '11 Ago',
    estado: 'pendiente',
  },
  {
    id: 'REC-102',
    folio: 'REC-102',
    tipo: 'recibo',
    cliente: 'Comercial Aurora',
    monto: '$12,450.00',
    fecha: '2 Ago',
    vencimiento: '2 Ago',
    estado: 'pagada',
  },
  {
    id: 'REC-101',
    folio: 'REC-101',
    tipo: 'recibo',
    cliente: 'Grupo Meridian',
    monto: '$9,300.00',
    fecha: '29 Jul',
    vencimiento: '29 Jul',
    estado: 'pagada',
  },
];

export const MOCK_INVOICES_DUE_THIS_WEEK_LABEL = '4 vencen esta semana';
export const MOCK_INVOICES_PAGINATION_LABEL = 'Página 1 de 2';
export const MOCK_DEMO_COMPANY_INITIALS = 'CN';

export type AiInsightTone = 'up' | 'warning' | 'down';

export interface AiInsight {
  readonly id: string;
  readonly tone: AiInsightTone;
  readonly text: string;
}

export const MOCK_AI_INSIGHTS: readonly AiInsight[] = [
  { id: 'gastos-aumentaron', tone: 'up', text: 'Los gastos operativos aumentaron' },
  { id: 'facturas-atencion', tone: 'warning', text: '4 facturas requieren atención' },
  { id: 'flujo-disminuyo', tone: 'down', text: 'El flujo proyectado disminuyó' },
];

export interface DocumentStatus {
  readonly procesados: number;
  readonly pendientes: number;
  readonly conIncidencia: number;
}

export const MOCK_DOCUMENT_STATUS: DocumentStatus = {
  procesados: 142,
  pendientes: 6,
  conIncidencia: 2,
};

export interface ActivityItem {
  readonly id: string;
  readonly text: string;
  readonly time: string;
}

export const MOCK_RECENT_ACTIVITY: readonly ActivityItem[] = [
  {
    id: 'act-1',
    text: 'Se registró un nuevo ingreso de $12,450.00 de Comercial Aurora.',
    time: 'Hace 2 horas',
  },
  { id: 'act-2', text: 'Factura FNS-346 marcada como vencida.', time: 'Hace 5 horas' },
  { id: 'act-3', text: 'Se generó el reporte de flujo de caja de julio.', time: 'Ayer' },
  {
    id: 'act-4',
    text: 'Nuevo documento cargado: Estado de cuenta bancario.',
    time: 'Hace 2 días',
  },
];

export const MOCK_ASSISTANT_GREETING =
  '¡Hola María! Soy tu asistente de ContaIA. ¿En qué puedo ayudarte hoy?';

export const MOCK_ASSISTANT_SUGGESTIONS: readonly string[] = [
  'Resume mis finanzas del mes',
  '¿Qué facturas vencen pronto?',
  'Explica mi flujo de caja',
];

export interface MockUser {
  readonly nombre: string;
  readonly rol: string;
  readonly iniciales: string;
}

export const MOCK_DEMO_USER: MockUser = {
  nombre: 'María Reyes',
  rol: 'Administradora',
  iniciales: 'MR',
};

export const MOCK_DEMO_COMPANY_NAME = 'Contabilidad Norte S.A.';
