# MASTER_NAVIGATION_ARCHITECTURE.md — Arquitectura Maestra de Navegación — ContaIA

## Control del documento

| Campo | Valor |
| --- | --- |
| Documento | `32_MASTER_NAVIGATION_ARCHITECTURE.md` |
| Versión | `0.1` |
| **Estado** | **Draft v0.1 — Propuesta para aprobación** |
| Fecha de creación | 2026-08-03 |
| Propietario propuesto | Product Owner de ContaIA |
| Alcance | Decisiones de navegación web, rutas, contexto multiempresa y condiciones para un prototipo navegable. No implementa React, API, backend ni esquema. |
| Baseline documental | `feature/frontend-ux-audit` · `b5b289d32fdcc8d7ab61fd62ecfe0316b8c75be8` (el mismo declarado por `31_MASTER_SCREEN_MAP.md`) |
| Evidencia de frontend | Árbol de rutas versionado en el baseline y árbol de trabajo observado el 2026-08-03. Las rutas locales no versionadas no son evidencia de alcance aprobado. |
| Fuentes de verdad | `docs/01_PRD.md`, `docs/04_BUSINESS_RULES.md`, `docs/08_API_DESIGN.md`, `docs/12_FRONTEND_ARCHITECTURE.md`, `docs/13_DESIGN_SYSTEM.md`, `docs/14_INFORMATION_ARCHITECTURE.md`, `docs/15_UX_FLOWS.md`, `docs/16_WIREFRAMES_SPECIFICATION.md`, `docs/17_PROTOTYPE_SPECIFICATION.md`, `docs/18_UI_SPECIFICATION.md`, `docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`, `docs/31_MASTER_SCREEN_MAP.md` |

> **Autoridad y no duplicación.** `14_INFORMATION_ARCHITECTURE.md` conserva la autoridad vigente sobre taxonomía y rutas conceptuales; `08_API_DESIGN.md`, sobre contratos API. Este documento no los reemplaza todavía: concentra las decisiones pendientes que impiden una navegación verificable. Tras aprobación, las decisiones aceptadas deberán incorporarse de forma consistente a esas fuentes y a la implementación, en un cambio documental separado y trazable.

> **Límite de certeza.** Las decisiones de ruta de este documento son **propuestas de normalización**, no rutas ya aprobadas ni funcionalidad disponible. Una ruta observada en el frontend solo prueba su existencia técnica en el árbol revisado; no la convierte en canónica.

## 1. Propósito y alcance

La arquitectura de navegación convierte el inventario de 42 pantallas de `31_MASTER_SCREEN_MAP.md` en un sistema navegable y verificable. Define cómo se entra a una superficie, qué contexto transporta la URL, qué ve cada rol, cómo se recupera ante estados negativos y qué debe existir antes de construir el prototipo navegable.

Incluye:

- aplicación autenticada con Empresa activa, configuración personal y administración de plataforma;
- rutas canónicas propuestas, reglas de enlace directo y migración de rutas divergentes;
- shell global, navegación responsive, superficies transversales y accesibilidad de navegación;
- dependencias API que condicionan la viabilidad de una pantalla o interacción.

Excluye:

- código de React/Next.js, redirecciones, middleware, endpoints, esquemas y permisos de servidor;
- diseño visual final, contenido detallado de cada pantalla y contratos no aprobados;
- landing, precios, términos, privacidad y recursos públicos, que siguen fuera de este alcance operativo.

## 2. Alcance por etapa

| Etapa | Navegación incluida | Tratamiento |
| --- | --- | --- |
| **MVP propuesto** | 41 páginas del mapa, sus 17 subpantallas/paneles y 5 superficies globales. | Requiere ruta o clasificación explícita, permisos, estados transversales y contrato disponible cuando hay datos o mutaciones. |
| **PLANNED — fase intermedia** | `PAGE-0026` Reportes programados, vistas/filtros guardados compartidos y reportes avanzados. | La ruta se reserva para evitar ambigüedad, pero no autoriza diseño ni implementación sin contrato y aprobación de alcance. |
| **PLANNED — fase empresarial** | Integraciones configurables, analítica avanzada y personalización ampliada. | No se añade al menú, búsqueda ni sitemap del MVP. |

El conteo de referencia se mantiene en **64 superficies conceptuales**: 42 páginas, 17 subpantallas/paneles y 5 superficies globales. No debe inferirse de él el número de componentes, endpoints o historias de implementación.

## 3. Principios de navegación

1. **Contexto explícito.** Toda operación de una Empresa usa `/{companyId}/...`; la URL, la interfaz y las solicitudes al servidor expresan la misma Empresa.
2. **Autorización antes que visibilidad.** El menú se filtra para orientar, pero cada carga directa y mutación se revalida en servidor por membresía vigente, rol, recurso y estado.
3. **Rutas estables y semánticas.** Los identificadores son opacos; no se codifican nombres, RFC ni permisos en la URL. Un cambio de etiqueta visible no obliga a cambiar una URL.
4. **Una responsabilidad por destino.** Tareas no son notificaciones; Administración de plataforma no es configuración de Empresa; preferencias personales no son una ruta de Empresa.
5. **Profundidad recuperable.** Un detalle, caso o conversación compartido debe abrirse directamente si la persona conserva autorización, sin exigir pasar por un listado.
6. **Cambio de Empresa seguro.** Cambiar Empresa es una transición de seguridad y datos, no solo de apariencia: invalida contexto de consulta, permisos y caché pertinente; los cambios no guardados requieren confirmación.
7. **Estados no reveladores.** La interfaz ofrece recuperación, pero no confirma la existencia de un recurso en otra Empresa ni expone datos antes de autorizar.
8. **Móvil conserva la arquitectura.** El contenedor cambia (drawer, hoja o pantalla completa), no el destino, permiso ni significado de la ruta.

## 4. Sitemap jerárquico propuesto

```text
Público / acceso
├── /acceso/iniciar-sesion
├── /acceso/verificar-correo
├── /acceso/recuperar-contrasena
├── /acceso/restablecer-contrasena
├── /acceso/registro                         [clasificación pendiente]
├── /acceso/invitacion/{token}
├── /sesion-expirada                         [estado transversal]
└── /seleccionar-empresa

Aplicación por Empresa: /{companyId}
├── /inicio
├── /documentos
│   ├── /nuevo
│   └── /{documentId}
│       └── /cfdi                            [D-012: identidad canónica del CFDI es documentId, no cfdiId]
├── /fiscal/cfdi                              [listado de CFDI procesados; el detalle vive en /documentos/{documentId}/cfdi]
├── /contabilidad
│   ├── /cuentas
│   │   └── /{accountId}
│   ├── /polizas
│   │   ├── /nueva
│   │   └── /{entryId}
│   ├── /balanza
│   ├── /estados-financieros
│   ├── /ejercicios
│   └── /sugerencias                       [propuesta: PAGE-0018]
├── /reportes
│   ├── /{reportId}
│   └── /programados                       [PLANNED: PAGE-0026]
├── /asistente
│   ├── /historial
│   └── /{conversationId}                  [la raíz inicia conversación]
├── /tareas
│   └── /{approvalId}
├── /notificaciones
├── /auditoria
└── /configuracion                         [solo Administración de Empresa]

Ámbito de cuenta, sin Empresa
├── /empresas
│   ├── /nueva
│   └── /{companyId}
└── /configuracion
    ├── /perfil
    ├── /preferencias                      [propuesta: PAGE-0037]
    ├── /notificaciones                    [propuesta: PAGE-0032]
    └── /sesiones                          [propuesta: PAGE-0038]

Administración de plataforma, sin Empresa
└── /admin
    ├── /soporte
    ├── /cuentas
    └── /auditoria                         [propuesta: PAGE-0035]

Estados transversales
├── /no-autorizado
└── no encontrado del framework (HTTP 404; no es una URL de negocio)
```

La raíz de `/asistente` representa conversación nueva. `/{conversationId}` solo representa una conversación existente; esta separación evita que el literal `historial` sea interpretado como identificador. La resolución exacta de precedencia es una condición de implementación, no una garantía de este documento.

## 5. Registro de rutas canónicas propuestas

Las rutas sin marca son las ya presentes en el catálogo conceptual de `14_INFORMATION_ARCHITECTURE.md`. **Nueva** significa que resuelve una ausencia de ruta del mapa; **Cambia** que sustituye una ruta conceptual anterior. Ninguna entrada implica que el archivo de página ya exista.

| Página / estado | Ruta canónica propuesta | Contexto | Decisión y motivo |
| --- | --- | --- | --- |
| PAGE-0002 Verificación | `/acceso/verificar-correo` **Cambia** | Sin Empresa | Describe el propósito y coincide con la ruta observada en frontend; la forma corta queda como candidata a alias temporal. |
| PAGE-0003 Recuperación | `/acceso/recuperar-contrasena` **Cambia** | Sin Empresa | Evita ambigüedad y coincide con la ruta observada. |
| PAGE-0008 Alta de Empresa | `/empresas/nueva` | Sin Empresa | Conserva jerarquía con su listado; `/crear-empresa` requeriría redirección de compatibilidad al migrar. |
| PAGE-0018 Sugerencias contables | `/{companyId}/contabilidad/sugerencias` **Nueva** | Empresa | Bandeja/listado de propuestas con enlace al recurso o caso relacionado. Requiere contrato de lectura; no permite que la IA ejecute una póliza. |
| PAGE-0026 Reportes programados | `/{companyId}/reportes/programados` **Nueva · PLANNED** | Empresa | Se anida bajo Reportes y se reserva sin convertir la función futura en MVP. |
| PAGE-0032 Preferencias de notificaciones | `/configuracion/notificaciones` **Nueva** | Cuenta | Se propone preferencia por persona, no por Empresa. Una futura excepción por Empresa necesitará un contrato y decisión explícitos. |
| PAGE-0035 Auditoría de plataforma | `/admin/auditoria` **Nueva** | Plataforma | Mantiene el perímetro `admin` separado de la auditoría de una Empresa. |
| PAGE-0036 Perfil personal | `/configuracion/perfil` | Cuenta | Es la primera sección de configuración de cuenta; `/configuracion/personal` requiere migración. |
| PAGE-0037 Preferencias personales | `/configuracion/preferencias` **Nueva** | Cuenta | Separa preferencias generales de perfil, alertas y sesiones. |
| PAGE-0038 Sesiones activas | `/configuracion/sesiones` **Nueva** | Cuenta | Elimina la ambigüedad con la sesión de Empresa y permite enlaces directos a gestión de sesiones. |
| PAGE-0041 Sin autorización | `/no-autorizado` **Cambia** | Variable | Expresa el estado al usuario; `/403` no será ruta de navegación de negocio. `/prohibido` queda como candidato a alias temporal. |
| PAGE-0042 No encontrado | `not-found` del framework **Cambia** | Variable | No se propone una URL de negocio como `/404`; el estado responde con HTTP 404 y enlaces de salida seguros. |

### 5.1 Resolución de las seis pantallas sin ruta

| Página | Resolución propuesta | Razón | Dependencia para ser implementable |
| --- | --- | --- | --- |
| PAGE-0018 Sugerencias contables | Ruta de módulo `/{companyId}/contabilidad/sugerencias`. | Es una superficie de trabajo, no una notificación ni una acción de escritura. | Consulta de sugerencias/propuestas y enlace a aprobación o póliza. |
| PAGE-0026 Reportes programados | Ruta reservada `/{companyId}/reportes/programados`; permanece `PLANNED`. | Es una subfunción de reportes, fuera del incremento MVP. | Contratos de programación, autorización y Jobs; aprobación de alcance. |
| PAGE-0032 Preferencias de notificaciones | Ruta de cuenta `/configuracion/notificaciones`. | La preferencia regula la entrega al usuario; no debe mezclar alertas de una Empresa. | Lectura/actualización de preferencias personales y definición de alcance por Empresa. |
| PAGE-0035 Auditoría de plataforma | Ruta `/admin/auditoria`. | Preserva el aislamiento entre plataforma y Empresa cliente. | Consulta agregada con minimización de datos y autorización de plataforma. |
| PAGE-0037 Preferencias personales | Ruta `/configuracion/preferencias`. | Evita convertir perfil en contenedor indefinido. | Contrato de preferencias y catálogo de opciones aprobadas. |
| PAGE-0038 Sesiones activas | Ruta `/configuracion/sesiones`. | La gestión de seguridad de la cuenta debe ser directa y separada. | Inventario, revocación y reglas de sesión/MFA aprobadas. |

## 6. Matriz de divergencias: documentación y frontend

La comparación se limita a rutas observables. El **baseline versionado** contiene seis coincidencias exactas con el catálogo anterior: iniciar sesión, invitación, seleccionar Empresa, listado/detalle de Empresas e inicio con Empresa. Las demás páginas de la documentación no se consideran implementadas por la sola presencia de una demo o de archivos locales sin versionar.

| Área | Documentación previa | Ruta observada | Propuesta canónica | Conflicto / tratamiento requerido |
| --- | --- | --- | --- | --- |
| Verificación | `/acceso/verificar` | `/acceso/verificar-correo` | `/acceso/verificar-correo` | Cambiar el catálogo; conservar alias/redirección si hay enlaces existentes. |
| Recuperación | `/acceso/recuperar` | `/acceso/recuperar-contrasena` | `/acceso/recuperar-contrasena` | Cambiar el catálogo; alias temporal sujeto a revisión de seguridad. |
| Alta de Empresa | `/empresas/nueva` | `/crear-empresa` | `/empresas/nueva` | El frontend debe migrar solo después de aprobación; mantener redirección de transición si aplica. |
| Perfil | `/configuracion/perfil` | `/configuracion/personal` | `/configuracion/perfil` | Convertir la ruta actual en transición; el contenido futuro se distribuye en perfil, preferencias, notificaciones y sesiones. |
| Acceso denegado | `/403` | `/no-autorizado` y `/prohibido` | `/no-autorizado` | Unificar mensajes, telemetría y destino seguro; no revelar recursos. |
| No encontrado | `/404` conceptual | No hay página de negocio dedicada observada | `not-found` del framework | Ratificar el tratamiento de estado y actualizar catálogo; no crear un acceso normal a una URL `/404`. |
| Acceso adicional | No catalogados homogéneamente | `/acceso/registro`, `/acceso/restablecer-contrasena`, `/acceso/cerrar-sesion`, `/sesion-expirada` | Pendiente de clasificar | Definir si son páginas, acciones o estados transversales y añadirlos al registro sin alterar el alcance por inferencia. |
| Demo aislada | No es fuente canónica | `/demo/*` | No pertenece al sitemap productivo | Mantener explícitamente separada: usa datos ficticios y no valida rutas ni contratos del producto. |

### 6.1 Reglas de migración de rutas

- No retirar una ruta divergente sin antes aprobar la ruta destino, impacto de enlaces y tratamiento de parámetros.
- Una ruta antigua solo redirige a una ruta canónica de la misma intención; nunca a una Empresa elegida implícitamente.
- `next` y cualquier retorno se aceptan únicamente si son rutas internas, relativas a la aplicación y autorizadas tras la revalidación de sesión/membresía.
- Los parámetros de filtros no esenciales pueden preservarse. Identificadores de recursos y `companyId` se revalidan siempre en servidor.
- Durante la transición se mide el uso de la ruta anterior y se documenta la fecha de retiro. Esta política no autoriza instrumentación ni redirecciones todavía.

## 7. Shell global y superficies transversales

### 7.1 Estructura del shell

| Zona | Contenido y comportamiento propuesto | Límites |
| --- | --- | --- |
| Sidebar | Inicio, Empresas cuando corresponda, Contabilidad, Fiscal, Documentos, Reportes, Asistente IA, Tareas, Notificaciones, Configuración y Administración solo para rol de plataforma. Marca el módulo activo, no cada detalle. | No expone módulos sin permiso ni sustituye autorización. Administración nunca se muestra como módulo de Empresa. |
| Topbar | Selector de Empresa, búsqueda global, indicador de tareas, notificaciones, ayuda y menú de perfil. Muestra Empresa y rol efectivos de la ruta. | Las superficies de cuenta y plataforma no muestran una Empresa como contexto de datos. |
| Breadcrumbs | Desde el primer nivel de aplicación: `Contabilidad / Pólizas / {referencia segura}`. El último elemento no es enlace. | No exponen nombre o existencia de recurso no autorizado; la etiqueta puede requerir la consulta ya autorizada. |
| Área de contenido | Título, estado, acciones permitidas y contenido de la ruta. | Una acción destructiva/crítica confirma Empresa y recurso afectados. |

### 7.2 Selector de Empresa activa

- Es visible en todas las rutas de Empresa; en rutas de cuenta o plataforma puede mostrar “Cambiar a una Empresa” sin atribuir datos a la pantalla actual.
- Solo lista membresías vigentes. Al elegir otra Empresa, la aplicación calcula permisos de nuevo, invalida datos sensibles al contexto y navega a `/{newCompanyId}/inicio` por defecto.
- Si la ruta actual tiene un equivalente seguro en la nueva Empresa, puede proponerse como destino solo tras definir la regla por módulo; no se asume equivalencia de recursos individuales.
- Si hay cambios no guardados o proceso en curso, solicita confirmación y explica la Empresa de origen y destino.
- El selector no autoriza por sí mismo: la ruta de destino valida membresía y permiso en servidor.

### 7.3 Búsqueda global y acciones rápidas

| Superficie | Regla propuesta | Dependencia |
| --- | --- | --- |
| Búsqueda global | Abre como diálogo accesible en escritorio y pantalla completa en móvil. Busca solo recursos permitidos de la Empresa activa; resultados indican tipo y destino, sin datos sensibles en la consulta o vista previa. | Falta contrato de búsqueda con tipo de resultado, permiso aplicado, paginación y tratamiento de términos. |
| Acciones rápidas | Menú contextual: cargar documento, crear póliza en borrador, abrir búsqueda, abrir asistente o ir a tareas, según rol y estado. | Cada acción lleva a una ruta/flujo existente; no crea una mutación sin formulario, validación y contrato. |
| Indicador de tareas | Cuenta únicamente tareas visibles para la persona y Empresa activa; enlaza a `/{companyId}/tareas`. | Contrato debe expresar conteo seguro o derivarlo de la lista autorizada. |
| Notificaciones | Panel breve para lectura/atención y enlace al centro completo. | Separa alertas de aprobaciones; preferencias de entrega no alteran permisos de lectura. |
| Asistente IA | Acceso persistente a conversación nueva o panel contextual. Siempre comunica fuente, vigencia e incertidumbre; una respuesta no ejecuta cambios contables. | Contratos AI y de aprobación ya documentados; faltan límites de navegación para sugerencias listadas. |

### 7.4 Modales, drawers y overlays

Las cinco superficies globales del mapa son selector de Empresa, búsqueda global, indicador de tareas, centro/panel de notificaciones y acceso persistente al Asistente IA. Se aplican estas reglas:

- Un modal confirma una decisión o captura información breve; no oculta una pantalla que deba ser enlazable, auditable o recuperable.
- Un drawer muestra contexto secundario (por ejemplo, fuentes de IA o notificaciones); tiene título, foco inicial, cierre por botón/`Escape` cuando sea seguro y retorno de foco al invocador.
- Un overlay de procesamiento muestra estado y permite salir solo si la operación es segura de continuar en segundo plano; no simula éxito antes del estado terminal del Job.
- Los diálogos no se apilan salvo una confirmación crítica explícita. Al cerrarse, no cambian silenciosamente Empresa, permisos ni ruta.
- Acciones críticas (revocar sesión, cerrar Ejercicio, aprobar/rechazar) requieren confirmación explícita y trazabilidad; la confirmación no reemplaza la autorización de servidor.

## 8. Deep linking, estados y permisos

### 8.1 Reglas de deep linking

1. Al abrir una ruta protegida sin sesión, se redirige a inicio de sesión conservando solo un destino interno validado.
2. Con sesión, se valida `companyId`, membresía vigente, rol y autorización del recurso antes de obtener o mostrar datos.
3. Si la Empresa es válida pero el recurso no existe para esa Empresa, se presenta no encontrado sin revelar información externa. Si no hay permiso, se presenta acceso denegado con salida segura.
4. Tras una invitación, restablecimiento o reautenticación, el retorno solo se ejecuta si el destino sigue autorizado; de lo contrario se usa selección de Empresa o Inicio.
5. Un detalle enlazado conserva filtros del listado únicamente como mejora de retorno, nunca como requisito para abrir el recurso.
6. Una URL de cuenta (`/configuracion/*`) no adopta un `companyId` implícito. Una URL `/admin/*` exige rol de plataforma y no hereda el contexto de una Empresa.

### 8.2 Estados transversales mínimos

| Estado | Qué debe mostrar | Recuperación / seguridad |
| --- | --- | --- |
| Carga | Skeleton o indicador proporcional, título estable y progreso cuando exista Job. | No habilitar acción duplicada; conservar contexto autorizado. |
| Vacío | Explicación del conjunto vacío y acción que el rol sí puede realizar. | No redirigir ni inventar datos. |
| Error recuperable | Mensaje comprensible, detalle técnico no sensible y acción de reintento/corrección. | Preservar la entrada segura; no repetir mutaciones no idempotentes. |
| Sin permisos | Estado uniforme de acceso denegado y salida a superficie permitida. | No renderizar ni confirmar datos protegidos. |
| Sesión expirada | Explicar reautenticación y preservar retorno interno sujeto a nueva validación. | Limpiar datos de sesión y no restaurar información de otra Empresa. |
| No encontrado | Estado `not-found` con salida a Inicio, búsqueda o listado seguro. | No distinguir recursos inexistentes de recursos ajenos cuando eso revele información. |

### 8.3 Roles y visibilidad de navegación

| Rol | Navegación dominante | Restricciones determinantes |
| --- | --- | --- |
| Administrador de Empresa | Empresas, Inicio, reportes, configuración de Empresa y consulta según permisos. | No obtiene `/admin/*` por administrar una Empresa. |
| Contador | Contabilidad, Fiscal, Documentos, Reportes, IA y Tareas. | Puede aprobar solo donde la regla de negocio lo permita. |
| Auxiliar | Documentos, CFDI y pólizas en borrador. | No aprueba ni finaliza pólizas; no recibe reportes completos por defecto. |
| Supervisor | Tareas/aprobaciones, consulta de evidencia y auditoría de Empresa. | No recibe carga documental ni gestión de Empresas. |
| Auditor | Consulta de Contabilidad, Fiscal y auditoría de Empresa. | Sin controles de escritura ni asistente IA. |
| Estudiante | Asistente IA educativo. | Solo sandbox; no navega ni consulta datos reales de Empresa. |
| Administrador de plataforma | `/admin/soporte`, `/admin/cuentas`, `/admin/auditoria`. | Acceso JIT, auditado y separado del ámbito de una Empresa. |

Un rol visible en esta tabla no resuelve conflictos de permisos compuestos. La regla efectiva sigue siendo: **membresía vigente + rol + Empresa activa o ámbito correcto + recurso + estado del recurso**.

## 9. Navegación móvil, responsive y accesibilidad

### 9.1 Responsive

- En escritorio se mantiene sidebar persistente. En móvil se sustituye por un drawer invocado desde la topbar; se conserva el orden, etiquetas y estado activo de los destinos.
- El selector de Empresa y el acceso a menú permanecen disponibles sin depender de hover. La búsqueda abre una experiencia de pantalla completa para conservar foco y espacio.
- Breadcrumbs pueden colapsar niveles intermedios, pero siempre preservan un retorno explícito al padre inmediato en detalles y formularios.
- Tablas, filtros y acciones se reorganizan sin ocultar estado crítico, Empresa activa o acciones de salida. Las acciones secundarias se agrupan en un menú accesible.
- No se fija un punto de quiebre numérico en este documento: debe respetar los definidos por el sistema de diseño y verificarse en escritorio, tablet y móvil antes de aprobar el prototipo.

### 9.2 Criterios de accesibilidad de navegación

- Landmarks semánticos y nombres accesibles: navegación principal, navegación secundaria, búsqueda, contenido principal y breadcrumbs.
- Todo destino, botón, selector, menú, drawer y diálogo es utilizable con teclado; el foco visible sigue un orden predecible y se restaura al cerrar una superficie.
- Los cambios de Empresa, navegación de ruta, validaciones y estados asíncronos comunican su resultado sin depender solo de color, icono o animación.
- El elemento activo se comunica de forma programática y visual. Los badges de tareas/notificaciones tienen texto alternativo con su significado.
- No se bloquea el lector de pantalla con overlays; los diálogos controlan foco y se anuncian con título y propósito.
- Los errores identifican el control afectado y explican cómo recuperarse. Los estados vacío, error, sin permisos y no encontrado son distinguibles por su texto, no por color.
- La aprobación exige revisión automatizada de accesibilidad y prueba manual de teclado, conforme a los criterios existentes de `18_UI_SPECIFICATION.md` y `19_FRONTEND_IMPLEMENTATION_PLAN.md`.

## 10. Dependencias API faltantes o incompletas

Estas necesidades no crean endpoints aprobados. Describen el contrato mínimo que Producto, Backend y Seguridad deben definir antes de implementar las superficies relacionadas.

| ID propuesto | Necesidad de navegación | Contrato mínimo a decidir | Pantallas afectadas | Estado |
| --- | --- | --- | --- | --- |
| NAV-API-01 | Dashboard de Inicio | Resumen por Empresa, permisos aplicados, estado de datos y enlaces permitidos. | PAGE-0006 | No catalogado como endpoint específico. |
| NAV-API-02 | Búsqueda global | Consulta por Empresa, tipos de resultado, paginación, permisos aplicados y política de no revelación. | Superficie global de búsqueda | No catalogado. |
| NAV-API-03 | Sugerencias contables | Listado/detalle de propuestas, relación con póliza/caso, fuente, vigencia, estado y autorización. | PAGE-0018 | No catalogado; no inferirlo de API de conversación. |
| NAV-API-04 | Catálogo y visor de reportes | Catálogo de tipos permitidos, parámetros, generación/estado, exportación y conservación de filtros. | PAGE-0024–0025 | Incompleto: API-0040/0041 cubre estados financieros, no todo el catálogo. |
| NAV-API-05 | Reportes programados | Crear/listar/editar/desactivar programación, destinatarios, zona horaria, autorización, Job y auditoría. | PAGE-0026 | PLANNED; no existe contrato. |
| NAV-API-06 | Preferencias de notificaciones | Lectura/actualización por persona, canales y alcance global vs. por Empresa; no cambia acceso a alertas. | PAGE-0032 | No catalogado. |
| NAV-API-07 | Auditoría de plataforma | Consulta agregada, filtros, minimización, retención, detalle y permiso de plataforma. | PAGE-0035 | API-0049/0050 es de Empresa; insuficiente para plataforma. |
| NAV-API-08 | Perfil y preferencias | Lectura/actualización de perfil y opciones personales con validación y auditoría aplicable. | PAGE-0036–0037 | No catalogado. |
| NAV-API-09 | Sesiones activas | Listado de sesiones propias, revocación, sesión actual, reautenticación/MFA y manejo de concurrencia. | PAGE-0038 | No catalogado; depende de la decisión MFA pendiente. |
| NAV-API-10 | Conteos del shell | Conteo autorizado de tareas/alertas o estrategia consistente para derivarlo de colecciones paginadas. | Topbar/sidebar | No definido explícitamente. |

Los contratos existentes de Identity, Companies, Documents/CFDI, Journal Entries, AI, Approvals, Audit de Empresa, Notifications y Jobs siguen siendo las dependencias base indicadas en `08_API_DESIGN.md`. La existencia de una navegación no elimina sus invariantes de idempotencia, concurrencia, auditoría, multiempresa y mínimo privilegio.

## 11. Flujos críticos a validar

| ID | Flujo | Recorrido y condición de salida |
| --- | --- | --- |
| NAV-F-01 | Acceso y Empresa | Inicio de sesión → selección cuando hay varias membresías → `/{companyId}/inicio`. Una ruta profunda solo se restaura tras validar sesión, membresía y permiso. |
| NAV-F-02 | Cambio de Empresa | Selector → confirmación si hay cambios → `/{newCompanyId}/inicio` o equivalente previamente definido. No quedan datos, permisos ni filtros de la Empresa anterior. |
| NAV-F-03 | Documento a CFDI | Biblioteca → carga → detalle/procesamiento → CFDI. El usuario ve progreso y error; CFDI no se presenta como válido antes de procesamiento exitoso. |
| NAV-F-04 | Póliza con revisión humana | Listado → nueva/borrador → detalle → tarea/caso. Auxiliar no aprueba; la decisión se audita y el retorno conserva Empresa. |
| NAV-F-05 | IA con límite seguro | Asistente o panel contextual → fuentes/fundamentos → tarea si requiere revisión. La respuesta IA no realiza mutaciones contables ni sustituye una aprobación. |
| NAV-F-06 | Enlace directo protegido | URL de detalle → autenticación/reautenticación si corresponde → autorización → detalle, sin permiso o no encontrado. Ninguna variante revela un recurso ajeno. |
| NAV-F-07 | Cuenta y plataforma | Perfil/preferencias/sesiones no usan Empresa; `/admin/*` exige rol de plataforma. Cambiar de uno a otro no concede ni retiene privilegios. |

## 12. Decisiones abiertas y riesgos

### 12.1 Decisiones abiertas para aprobación

| ID | Decisión | Alternativas / impacto | Responsable propuesto |
| --- | --- | --- | --- |
| NAV-D-01 | Aprobar las seis rutas nuevas y las cinco normalizaciones de ruta. | Si no se aprueban, el prototipo no tendrá registro completo ni plan de migración. | Product Owner + Arquitectura. |
| NAV-D-02 | Clasificar registro, restablecimiento, cierre de sesión y sesión expirada como páginas, acciones o estados. | Afecta el inventario de 42 páginas y cobertura de negativos; no debe decidirse por existencia de archivos. | Product Owner + UX. |
| NAV-D-03 | Definir el alcance de preferencias de notificaciones. | Global por usuario (propuesta) vs. override por Empresa; afecta modelo, permisos y UI. | Product Owner + Seguridad + Backend. |
| NAV-D-04 | Definir contrato y alcance de sugerencias contables. | Bandeja propia propuesta vs. superficie contextual/tarea; afecta nueva ruta y API. | Product Owner + Dominio contable + Arquitectura. |
| NAV-D-05 | Confirmar que Reportes programados continúa fuera del MVP. | Incluirlo exigiría contrato, Jobs, auditoría y criterios adicionales. | Product Owner. |
| NAV-D-06 | Ratificar la política de no encontrado / sin permisos. | Debe balancear recuperación UX y no revelación de recursos. | Seguridad + Arquitectura. |

### 12.2 Riesgos

| Severidad | Ubicación | Riesgo | Impacto | Corrección recomendada |
| --- | --- | --- | --- | --- |
| **ALTO** | Registro de rutas y frontend | Documentación y rutas observadas siguen divergentes. | Enlaces, middleware, pruebas y prototipo pueden usar contratos distintos. | Aprobar NAV-D-01 y ejecutar una migración con alias temporales y pruebas, en un cambio posterior. |
| **ALTO** | NAV-API-03 a NAV-API-09 | Varias pantallas no tienen contrato API suficiente. | Se diseñarían acciones, estados o permisos por suposición. | Definir contrato o retirar explícitamente la superficie del incremento. |
| **ALTO** | Cambio de Empresa y deep links | Tratar `companyId` como estado de UI en vez de límite de autorización. | Riesgo de mezcla de datos o de acceso cruzado entre Empresas. | Revalidar siempre membresía, recurso y Empresa en servidor; limpiar contexto cliente al cambiar. |
| **MEDIO** | Acceso y estados negativos | Registro/restablecimiento/cierre/sesión expirada no están clasificados uniformemente. | Cobertura incompleta del prototipo y pruebas inconsistentes. | Resolver NAV-D-02 antes de ratificar el conteo definitivo. |
| **MEDIO** | Demo `/demo` | Confundir una simulación local con rutas o alcance aprobados. | Decisiones basadas en evidencia no canónica. | Mantenerla aislada y validar el prototipo formal contra este registro aprobado. |
| **MEDIO** | Móvil y overlays | Drawer, modal o búsqueda sin control de foco y retorno. | Navegación inaccesible o pérdida de contexto. | Validar criterios del § 9 en pruebas manuales y automatizadas. |
| **BAJO** | Descubribilidad documental | El índice y changelog no se actualizan en esta fase para no mezclar cambios locales ajenos. | El nuevo documento no estará enlazado de inmediato. | Tras aprobación, actualizar ambos en un cambio documental aislado. |

## 13. Criterios de aceptación de esta fase

- [x] Existe un documento nuevo sin duplicar `14_INFORMATION_ARCHITECTURE.md` ni modificar código, backend, esquemas o contratos.
- [x] Las seis pantallas sin ruta tienen una resolución explícita, con etapa y dependencia identificadas.
- [x] El sitemap separa acceso, Empresa, cuenta, plataforma y estados transversales.
- [x] La matriz registra las divergencias conocidas entre catálogo conceptual y rutas observadas, sin tratar la demo como producto.
- [x] Se documentan shell global, selector de Empresa, búsqueda, acciones rápidas, superficies globales, deep links, roles, responsive, accesibilidad y estados negativos.
- [x] Las dependencias API faltantes se identifican sin inventar endpoints aprobados.
- [ ] Product Owner ratifica NAV-D-01 a NAV-D-06 o ajusta sus decisiones.
- [ ] `14_INFORMATION_ARCHITECTURE.md`, `08_API_DESIGN.md`, UX/prototipo y el índice se sincronizan únicamente con las decisiones aprobadas.
- [ ] Se valida NAV-F-01 a NAV-F-07 con los roles aplicables, Empresa visible y pruebas de acceso directo.
- [ ] Antes de implementar, se definen contratos aceptados, redirecciones de migración, pruebas de autorización y criterios de accesibilidad verificables.

## 14. Referencias

| Documento | Uso en esta arquitectura |
| --- | --- |
| `14_INFORMATION_ARCHITECTURE.md` | Taxonomía, rutas conceptuales, sitemap, roles, navegación global y responsive. |
| `31_MASTER_SCREEN_MAP.md` | Inventario de 42 páginas, seis ausencias de ruta, superficie global, cobertura y hallazgos. |
| `08_API_DESIGN.md` | Contratos existentes, contexto multiempresa, autorización, Jobs y límites de contratos. |
| `12_FRONTEND_ARCHITECTURE.md` | Estado de sesión, permisos y responsabilidad de la capa frontend. |
| `13_DESIGN_SYSTEM.md`, `16_WIREFRAMES_SPECIFICATION.md`, `18_UI_SPECIFICATION.md` | Componentes de navegación, diálogos, estados, responsive y accesibilidad. |
| `15_UX_FLOWS.md`, `17_PROTOTYPE_SPECIFICATION.md`, `19_FRONTEND_IMPLEMENTATION_PLAN.md` | Recorridos, prototipo, validación y Definition of Done. |
| `docs/frontend/CONTAIA_FUNCTIONAL_PROTOTYPE.md` | Evidencia auxiliar de la demo; no autoridad de rutas ni alcance. |

## 15. Siguiente paso recomendado

Realizar una sesión de ratificación acotada sobre NAV-D-01 a NAV-D-06. Con esas decisiones, preparar un cambio documental separado que sincronice el catálogo de rutas y los contratos necesarios; solo después diseñar o validar el prototipo navegable contra NAV-F-01 a NAV-F-07. La migración de React y de rutas observadas debe ser una fase posterior, con pruebas y sin mezclarla con esta aprobación documental.

---

## Historial de cambios

| Fecha | Cambio | Responsable |
| --- | --- | --- |
| 2026-08-03 | Creación de la propuesta de arquitectura de navegación. Resuelve documentalmente seis pantallas sin ruta, registra divergencias observadas y define condiciones de aprobación sin modificar implementación ni contratos. | Codex, por solicitud del Product Owner |
