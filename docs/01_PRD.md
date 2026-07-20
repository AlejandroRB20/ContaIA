# PRD — Product Requirements Document — ContaIA

## Control del documento

| Campo                              | Valor                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documento                          | 01_PRD.md                                                                                                                                                                        |
| Versión                            | 0.1                                                                                                                                                                              |
| Estado                             | Borrador — primera versión completa                                                                                                                                              |
| Fecha de creación                  | 2026-07-18                                                                                                                                                                       |
| Última actualización               | 2026-07-18                                                                                                                                                                       |
| Documentos fuente                  | `MASTER_CONTEXT.md`, `docs/00_PRODUCT_VISION.md`                                                                                                                                 |
| Documentos que este PRD alimentará | `docs/03_ROADMAP.md`, `docs/04_BUSINESS_RULES.md`, `docs/05_SYSTEM_DOMAIN_MODEL.md`, `docs/07_SOFTWARE_ARCHITECTURE.md`, `docs/17_UI_UX_DESIGN.md`, `docs/10_AI_ARCHITECTURE.md` |

> Nota: Este documento define **qué** construiremos y **por qué**, no cómo. No contiene diseño de base de datos, diseño de API ni arquitectura técnica profunda — eso corresponde a los documentos técnicos listados arriba. Ante cualquier contradicción con `MASTER_CONTEXT.md`, este último prevalece salvo que aquí se indique explícitamente una decisión de alcance de MVP, que es la autoridad de esta capa. Este documento aún no debe usarse para programar.

---

## 1. Resumen ejecutivo

ContaIA es un producto SaaS real, no un ejercicio académico. Su objetivo es convertirse en la plataforma de contabilidad, fiscalidad, administración empresarial e inteligencia artificial más completa y confiable de México, sirviendo como copiloto para contadores, despachos, empresas y estudiantes — sin sustituir nunca el criterio profesional humano.

Este PRD no describe "el sistema contable más grande posible". Describe **el mejor MVP posible**: un producto acotado, verificable y con un ciclo de valor completo (cargar → organizar → contabilizar → consultar → entender), construido sobre los principios ya aprobados en `MASTER_CONTEXT.md` — en particular revisión humana obligatoria, cálculos determinísticos, IA con fundamentos y trazabilidad.

A largo plazo, ContaIA se organizará como un ecosistema de cuatro pilares — **ContaIA Fiscal**, **ContaIA Empresarial**, **ContaIA Intelligence** y **ContaIA Academy** — pero el MVP no construye los cuatro. El MVP construye el núcleo transversal que los sostiene: identidad, multiempresa, documentos, contabilidad básica y un copiloto de IA fundamentado y acotado. Esta segmentación en pilares es una propuesta narrativa nueva, todavía no ratificada en `MASTER_CONTEXT.md` (ver sección 21, "Preguntas pendientes").

**No-goals explícitos de este documento:** este PRD no promete cobertura fiscal completa, no promete automatización total, no promete integración real con el SAT, y no promete que la IA calculará impuestos. Cada uno de estos límites es intencional y está justificado en las secciones siguientes.

---

## 2. Objetivos del producto (largo plazo)

Heredados de `MASTER_CONTEXT.md` (secciones 5 y 7):

1. Reducir tareas repetitivas en el trabajo contable y fiscal.
2. Facilitar el cumplimiento normativo sin sustituir la responsabilidad profesional.
3. Mejorar la calidad y confiabilidad de la información financiera.
4. Ayudar a los usuarios a comprender sus propias operaciones, no solo a registrarlas.
5. Convertirse en un copiloto de confianza, con fundamentos verificables en cada respuesta relevante.
6. Sentar las bases de un ecosistema (los cuatro pilares) que crezca de forma modular, sin comprometer prematuramente la simplicidad del producto.

## 3. Objetivos del MVP

El MVP tiene un propósito distinto al del producto a largo plazo: **validar que el modelo funciona**, no cubrir todo el alcance posible.

1. Validar el ciclo de valor completo end-to-end: un contador puede cargar CFDI, organizar documentos, capturar y aprobar pólizas, y consultar balanza y estados financieros básicos, todo dentro de una empresa administrada de forma segura.
2. Validar que el modelo "IA con fundamentos + revisión humana" es viable en la práctica, no solo en principio — con un alcance de conocimiento deliberadamente pequeño y curado.
3. Validar la disposición de contadores independientes y despachos pequeños a adoptar la plataforma como reemplazo, al menos parcial, de su flujo actual.
4. Construir la base estructural (autenticación, multiempresa, roles, trazabilidad, seguridad) sobre la que se apoyarán todos los módulos futuros, evitando retrabajo estructural en etapas posteriores.
5. Mantener el MVP como un monolito modular (principio 10.9 de `MASTER_CONTEXT.md`), evitando complejidad de infraestructura prematura.

## 4. Qué NO incluye el MVP

Exclusión explícita, con justificación, para evitar inflación de alcance:

| Excluido del MVP                                                                      | Por qué                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nómina, inventarios, activos fijos, tesorería, presupuestos                           | Corresponden a la Etapa 5 (gestión empresarial) de `MASTER_CONTEXT.md`; cada uno añade reglas de cálculo y cumplimiento propias que no son el núcleo del value prop inicial. |
| Integración con PAC / timbrado / descarga masiva del SAT                              | Corresponde a la Etapa 4; requiere una integración autorizada real. El MVP solo lee XML que el usuario ya posee y carga manualmente.                                         |
| Automatizaciones y reglas recurrentes de conciliación                                 | Corresponde a la Etapa 3; el MVP debe primero demostrar que la conciliación asistida por humano funciona antes de automatizarla.                                             |
| Auditoría formal (hallazgos automatizados, opinión de auditor)                        | El MVP solo ofrece historial y evidencias (módulo 11); el Agente de auditoría completo queda fuera.                                                                          |
| Agentes de nómina, jurídico corporativo, auditoría y educativo en su versión completa | El MVP activa únicamente 4 agentes núcleo (ver sección 10). El resto queda documentado en `MASTER_CONTEXT.md` pero no implementado.                                          |
| Marketplace de especialistas, aplicación móvil, API pública                           | Corresponden a la Etapa 6 (expansión), explícitamente marcada como fase futura.                                                                                              |
| Los cuatro pilares como productos independientes                                      | El MVP construye el núcleo transversal, no ContaIA Fiscal, Empresarial, Intelligence o Academy como ofertas separadas.                                                       |
| Cobertura fiscal normativa completa en el chat                                        | El chat lanza con un conjunto pequeño y curado de fuentes validadas, no con todo el marco fiscal mexicano (ver riesgo crítico en sección 16).                                |

## 5. Problemas del mercado

Heredados de `MASTER_CONTEXT.md` (sección 9), organizados por área:

**Operación y captura:** captura manual repetitiva; errores en registros contables; desorganización de documentos; procesos lentos de revisión y cierre.

**Documentos fiscales y conciliación:** dificultad para interpretar XML y CFDI; falta de conciliación entre bancos, CFDI y contabilidad; dificultad para generar pólizas y papeles de trabajo.

**Información y conocimiento:** información legal y fiscal dispersa; falta de explicaciones comprensibles; riesgo de respuestas de IA sin fundamento.

**Gestión y control:** uso de sistemas contables complejos; dificultad para administrar varias empresas; falta de trazabilidad y evidencia; dificultad para elaborar estados financieros; falta de alertas sobre inconsistencias.

El MVP ataca directamente los problemas de **captura, desorganización, interpretación de CFDI, falta de trazabilidad y respuestas de IA sin fundamento** — los que tienen mayor impacto inmediato y menor dependencia de integraciones externas.

## 6. Usuarios

Los diez usuarios de `MASTER_CONTEXT.md` (sección 8) siguen siendo el mapa completo de mercado. Para el MVP se priorizan así:

**Usuarios primarios del MVP** (el producto debe funcionar bien para ellos desde el día uno):

- Contador independiente
- Despacho contable (a través de varios usuarios con roles distintos)
- Auxiliar contable
- Empresa o negocio (como consumidor de reportes)

**Usuarios secundarios del MVP** (tienen valor parcial, sin ser el foco de diseño inicial):

- Director financiero o administrador (consume estados financieros, no captura)
- Administrador interno de ContaIA (necesario desde el día uno para operar el negocio, aunque invisible para el cliente)
- Especialista humano que revisa (cubierto por el rol Supervisor, ver sección 11)

**Usuarios diferidos o de alcance limitado en el MVP:**

- Auditor y Asesor fiscal: pueden usar el producto con acceso de solo consulta/revisión, pero sus flujos dedicados (opinión de auditoría, gestión de casos fiscales) no son parte del MVP.
- Estudiante de contaduría: acceso limitado a un entorno sandbox con datos simulados (ver sección 21, pregunta pendiente sobre su alcance exacto).

## 7. Casos de uso principales

1. Un contador independiente crea su cuenta, da de alta una empresa y configura su catálogo de cuentas inicial.
2. Un auxiliar contable carga los XML de CFDI del mes y el sistema extrae y organiza los datos estructurados de cada comprobante.
3. Un contador revisa los datos extraídos de los CFDI, los vincula con pólizas propuestas y las aprueba para volverlas definitivas.
4. Un director financiero consulta la balanza de comprobación y los estados financieros básicos de su empresa en tiempo real.
5. Un contador pregunta al chat contable-fiscal el fundamento de un concepto (por ejemplo, cómo se clasifica cierto tipo de gasto) y recibe una respuesta con fuente y vigencia, o una declaración explícita de que no hay fundamento suficiente disponible.
6. Un despacho contable administra varias empresas de distintos clientes desde una sola cuenta, con aislamiento total de datos entre ellas.
7. Un supervisor revisa una póliza marcada como sensible antes de que se contabilice de forma definitiva.
8. Un auxiliar recibe una alerta básica de que una póliza está descuadrada o un XML tiene campos incompletos, antes de continuar el proceso.
9. Un administrador interno de ContaIA da soporte a una empresa cliente, con su acceso registrado y justificado.
10. Un estudiante explora el chat contable-fiscal y ejemplos prácticos en un entorno sandbox, sin acceso a datos reales de ninguna empresa.

## 8. User journey completo

**Fase 1 — Registro y activación**

1. El usuario se registra con correo electrónico y contraseña.
2. Verifica su cuenta y configura autenticación multifactor.
3. Crea su primera empresa (razón social, giro básico, datos generales no sensibles).
4. Se le asigna automáticamente el rol de Administrador de esa empresa.

**Fase 2 — Configuración inicial** 5. Configura o importa un catálogo de cuentas inicial. 6. Invita a otros usuarios (por ejemplo, un auxiliar) y les asigna rol dentro de esa empresa.

**Fase 3 — Operación diaria** 7. Carga documentos (XML de CFDI, PDF, otros) al repositorio documental. 8. El sistema extrae y presenta los datos estructurados de cada CFDI cargado, señalando cualquier inconsistencia. 9. El usuario captura o revisa pólizas propuestas, en estado borrador. 10. Un usuario con permiso de aprobación (Contador o Supervisor) revisa y aprueba las pólizas, que pasan a estado definitivo. 11. El sistema actualiza balanza y estados financieros básicos de forma determinística.

**Fase 4 — Consulta y comprensión** 12. El usuario consulta balanza, estados financieros y reportes. 13. El usuario pregunta al chat contable-fiscal sobre un concepto o una cifra; recibe una respuesta fundamentada o una declaración de límite de conocimiento. 14. El usuario revisa alertas básicas de inconsistencia (por ejemplo, documentos sin clasificar o pólizas descuadradas).

**Fase 5 — Uso recurrente** 15. El usuario regresa periódicamente (diario o semanal) para repetir el ciclo de carga, revisión, aprobación y consulta. 16. El historial y trazabilidad quedan disponibles para revisión en cualquier momento (por el propio usuario, un supervisor o un auditor con acceso de consulta).

En todo el recorrido, ninguna acción que contabilice, apruebe o dé por definitiva una operación ocurre sin un paso de revisión humana explícito (principio 10.2).

## 9. Módulos del MVP

Los ocho puntos de la Etapa 2 de `MASTER_CONTEXT.md` se descomponen aquí en doce módulos concretos.

### M1. Autenticación, usuarios y roles

- **Objetivo:** permitir acceso seguro y controlado, con permisos diferenciados por rol y por empresa.
- **Descripción:** registro, verificación, inicio de sesión, autenticación multifactor, asignación de roles por empresa.
- **Usuario:** todos.
- **Reglas:** aislamiento entre empresas; un usuario puede tener roles distintos en empresas distintas; MFA obligatorio para roles con acceso a datos sensibles.
- **Dependencias:** ninguna (módulo base).
- **Prioridad:** P0 — crítica, bloqueante.
- **Valor de negocio:** sin este módulo no existe un producto seguro; habilita todo lo demás.
- **Complejidad:** Media.
- **Criterios de aceptación:** el usuario puede registrarse, verificar su cuenta e iniciar sesión con MFA; se le asigna un rol por empresa; no puede ver datos de una empresa a la que no pertenece; toda acción de acceso queda registrada.

### M2. Administración multiempresa

- **Objetivo:** permitir administrar varias empresas desde una sola cuenta.
- **Descripción:** creación de empresas, cambio de contexto entre empresas, expediente básico por empresa.
- **Usuario:** contador independiente, despacho contable, empresa.
- **Reglas:** aislamiento estricto de datos entre empresas; la empresa activa siempre es visible en la interfaz.
- **Dependencias:** M1.
- **Prioridad:** P0.
- **Valor de negocio:** núcleo de la propuesta para contadores y despachos.
- **Complejidad:** Media.
- **Criterios de aceptación:** creación de empresa con datos básicos; cambio de empresa activa sin cerrar sesión; ningún dato cruzado entre empresas.

### M3. Gestión documental / repositorio

- **Objetivo:** centralizar y organizar los documentos de cada empresa.
- **Descripción:** carga de archivos (XML, PDF, imágenes), organización por tipo, periodo y cliente, búsqueda básica.
- **Usuario:** auxiliar contable, contador, empresa.
- **Reglas:** cada documento pertenece a una sola empresa; se registran metadatos mínimos de carga.
- **Dependencias:** M1, M2.
- **Prioridad:** P0.
- **Valor de negocio:** resuelve directamente la "desorganización de documentos".
- **Complejidad:** Media.
- **Criterios de aceptación:** carga de archivo con metadatos; listado filtrable; ningún archivo accesible fuera de su empresa.

### M4. Carga y lectura de CFDI/XML

- **Objetivo:** extraer y presentar de forma estructurada los datos de comprobantes fiscales ya emitidos.
- **Descripción:** lectura estructural del XML (Agente de CFDI y XML), detección de inconsistencias de formato, vínculo con el repositorio documental.
- **Usuario:** auxiliar contable, contador.
- **Reglas:** no timbra; no valida ante el SAT; no simula una conexión real (límite explícito de `MASTER_CONTEXT.md`, sección 15); todo dato extraído se marca como sujeto a revisión.
- **Dependencias:** M3.
- **Prioridad:** P0.
- **Valor de negocio:** resuelve la "dificultad para interpretar XML y CFDI"; habilita conciliación y pólizas.
- **Complejidad:** Media-alta.
- **Criterios de aceptación:** al cargar un XML válido, el sistema extrae emisor, receptor, conceptos, montos e impuestos declarados en el propio archivo; los campos ambiguos o incompletos se señalan explícitamente; ningún dato se presenta como validado ante autoridad.

### M5. Catálogo de cuentas

- **Objetivo:** configurar la estructura contable base de cada empresa.
- **Descripción:** alta, edición y organización jerárquica de cuentas contables.
- **Usuario:** contador.
- **Reglas:** catálogo por empresa; cambios trazados.
- **Dependencias:** M2.
- **Prioridad:** P0.
- **Valor de negocio:** base indispensable para pólizas y estados financieros.
- **Complejidad:** Baja-media.
- **Criterios de aceptación:** creación, edición y desactivación de cuentas; jerarquía básica; historial de cambios.

### M6. Pólizas contables (captura y consulta)

- **Objetivo:** registrar movimientos contables, con revisión previa a su contabilización definitiva.
- **Descripción:** captura manual o asistida, vínculo opcional con CFDI cargados, consulta y filtrado.
- **Usuario:** auxiliar (captura), contador o supervisor (aprobación).
- **Reglas:** toda póliza pasa por estado "borrador" antes de "definitiva" (flujo de aprobación, sección 12); ninguna sugerencia de IA se contabiliza sin aprobación humana.
- **Dependencias:** M4, M5.
- **Prioridad:** P0.
- **Valor de negocio:** núcleo operativo del producto contable.
- **Complejidad:** Alta.
- **Criterios de aceptación:** captura manual de póliza balanceada (cargos = abonos); estados borrador/definitiva; bitácora de quién y cuándo aprobó; una póliza definitiva no puede editarse sin dejar rastro.

### M7. Balanza de comprobación

- **Objetivo:** mostrar el resumen de saldos por cuenta en un periodo determinado.
- **Descripción:** cálculo determinístico a partir de pólizas definitivas.
- **Usuario:** contador, director financiero.
- **Reglas:** solo considera pólizas definitivas; cálculo 100% determinístico, no generado por IA.
- **Dependencias:** M6.
- **Prioridad:** P0.
- **Valor de negocio:** primer entregable de valor tangible y verificable para el usuario.
- **Complejidad:** Media.
- **Criterios de aceptación:** la balanza cuadra (cargos = abonos); es filtrable por periodo y empresa; es exportable.

### M8. Estados financieros básicos

- **Objetivo:** presentar balance general y estado de resultados básicos.
- **Descripción:** generación determinística a partir de la balanza de comprobación.
- **Usuario:** contador, director financiero, empresa.
- **Reglas:** cálculo determinístico y versionado; se indica siempre el periodo y la fecha de generación.
- **Dependencias:** M7.
- **Prioridad:** P0.
- **Valor de negocio:** entregable clave para la toma de decisiones y para justificar el valor del producto ante el cliente final.
- **Complejidad:** Media-alta.
- **Criterios de aceptación:** el balance general cuadra (activo = pasivo + capital); el estado de resultados es coherente con la balanza; ambos son exportables; se indica que no constituyen un documento fiscal oficial cuando corresponda.

### M9. Chat contable-fiscal con fuentes validadas (alcance acotado)

- **Objetivo:** responder preguntas contables y fiscales generales con fundamento verificable, dentro de un conjunto curado y deliberadamente pequeño de fuentes.
- **Descripción:** combina el Agente contable, el Agente fiscal y el Agente supervisor de calidad y fuentes (`MASTER_CONTEXT.md`, secciones 13.1, 13.2 y 13.11). No cubre todo el marco normativo mexicano, solo los temas para los que exista contenido validado en `knowledge/`.
- **Usuario:** todos los roles, con distinto nivel de profundidad.
- **Reglas:** toda respuesta muestra fuente y vigencia, o declara explícitamente que no tiene fundamento suficiente; ninguna respuesta se presenta como asesoría definitiva; las preguntas sobre datos de una empresa nunca usan datos de otra.
- **Dependencias:** M2; disponibilidad de contenido curado en `knowledge/` (riesgo crítico, ver sección 16).
- **Prioridad:** P0 como diferenciador central del producto, con alcance de contenido intencionalmente pequeño al momento del lanzamiento.
- **Valor de negocio:** es el diferenciador principal frente a sistemas contables tradicionales.
- **Complejidad:** Alta.
- **Criterios de aceptación:** toda respuesta especializada cita fuente y vigencia o declara ausencia de fundamento; ninguna respuesta afirma certeza sobre un tema fuera del conjunto curado; el usuario puede marcar cualquier respuesta para revisión humana.

### M10. Calculadoras determinísticas seleccionadas

- **Objetivo:** ofrecer un número reducido de cálculos de apoyo, verificables, no un motor fiscal completo.
- **Descripción:** un conjunto pequeño de calculadoras bien definidas (por ejemplo, apoyo a la revisión de impuestos trasladados/acreditados a partir de datos que el propio usuario ya capturó), cada una con fórmula documentada, versión y casos de prueba.
- **Usuario:** contador, auxiliar contable.
- **Reglas:** la IA no calcula, solo interpreta el resultado ya calculado por el motor determinístico; ninguna calculadora se presenta como declaración lista para presentar ante autoridad.
- **Dependencias:** M6, M7.
- **Prioridad:** P1 — alto valor, pero deliberadamente acotado en cantidad.
- **Valor de negocio:** refuerza la confiabilidad sin asumir la responsabilidad de un cálculo fiscal completo.
- **Complejidad:** Media por calculadora individual; el conjunto debe mantenerse pequeño para no inflar el MVP.
- **Criterios de aceptación:** cada calculadora documenta su fórmula y sus supuestos; produce el mismo resultado ante las mismas entradas; se acompaña siempre de una advertencia de que no sustituye revisión profesional.

### M11. Historial, evidencias, trazabilidad y alertas básicas

- **Objetivo:** dejar rastro auditable de toda acción relevante y advertir de inconsistencias evidentes.
- **Descripción:** bitácora de acciones (usuario, empresa, fecha/hora, acción, resultado) y alertas básicas y deterministas (por ejemplo, póliza descuadrada, XML con campos incompletos, documento sin clasificar). No es un motor de alertas inteligentes ni predictivo.
- **Usuario:** todos, especialmente Supervisor y Auditor.
- **Reglas:** todo registro incluye usuario, empresa, fecha y hora, acción, información afectada y resultado; las alertas son deterministas, no generadas por IA generativa.
- **Dependencias:** transversal a M3-M10.
- **Prioridad:** P0 — requisito de confiabilidad, no opcional.
- **Valor de negocio:** sostiene los principios de confiabilidad y trazabilidad; requisito indispensable para cualquier cliente profesional.
- **Complejidad:** Media.
- **Criterios de aceptación:** toda acción sensible queda registrada y es consultable; las alertas básicas se generan sin intervención de IA generativa; el historial no puede alterarse retroactivamente.

### M12. Panel administrativo interno básico

- **Objetivo:** dar al equipo de ContaIA visibilidad y control operativo mínimo para operar el negocio.
- **Descripción:** gestión de cuentas, soporte a incidencias, visibilidad agregada de uso, sin exponer datos sensibles de una empresa cliente a otra.
- **Usuario:** administrador interno de ContaIA.
- **Reglas:** acceso restringido y auditado; ningún acceso a datos operativos de una empresa cliente sin un motivo de soporte registrado.
- **Dependencias:** M1.
- **Prioridad:** P1.
- **Valor de negocio:** necesario para operar el negocio desde el primer día, aunque no sea visible para el cliente final.
- **Complejidad:** Media.
- **Criterios de aceptación:** el equipo interno puede ver estado de cuentas y soporte básico; cualquier acceso a datos de un cliente queda registrado con motivo.

---

## 10. Inteligencia artificial

**Alcance del MVP:** de los once agentes definidos en `MASTER_CONTEXT.md` (sección 13), el MVP activa únicamente cuatro: **Agente contable**, **Agente fiscal**, **Agente de CFDI y XML** y **Agente supervisor de calidad y fuentes**. Los agentes de nómina, jurídico corporativo, auditoría, educativo, financiero-empresarial y de soporte quedan documentados pero no implementados en esta etapa.

**Qué hará:**

- Explicar conceptos contables y fiscales con fuente citada, cuando exista en el conjunto curado de `knowledge/`.
- Extraer datos estructurados de comprobantes fiscales (XML) y señalar inconsistencias evidentes.
- Sugerir clasificaciones o pólizas como propuestas, nunca como hechos consumados.
- Interpretar el resultado de una calculadora determinística ya calculada por el motor de reglas.
- Responder preguntas en lenguaje natural sobre los propios datos de la empresa del usuario y sobre el contenido curado disponible.

**Qué NO hará:**

- Calcular impuestos o cifras contables críticas por sí misma (principio 10.4).
- Timbrar comprobantes ni presentar declaraciones.
- Tomar decisiones irreversibles sin aprobación humana.
- Usar información de una empresa para responder a otra.
- Presentar una estimación o interpretación como hecho verificado.
- Inventar fundamento cuando no exista fuente disponible.

**Cuándo pedirá revisión humana:**

- Antes de que cualquier póliza pase de borrador a definitiva.
- Antes de que un dato extraído de un XML se use con efectos contables o fiscales.
- Cuando el Agente supervisor de calidad marque una respuesta como insuficiente o de alto riesgo.
- Ante cualquier acción irreversible o ambigüedad normativa relevante.

**Cómo mostrará fundamentos:** todo módulo con IA en el MVP sigue el mismo patrón reutilizable: fuente, documento, apartado o regla, vigencia y advertencias, cuando corresponda; si no hay fundamento disponible, la respuesta lo declara de forma explícita en lugar de omitirlo.

**Cómo manejará la incertidumbre:** distingue entre "regla general" y "caso especial que requiere consulta adicional"; nunca convierte una estimación en un hecho; ante ambigüedad, remite al usuario a revisión humana en vez de forzar una respuesta.

## 11. Roles

> **Actualización 2026-07-18 (decisión del responsable de producto durante CEW-004):** "Empresa" deja de ser un rol del sistema y pasa a ser una **entidad de dominio**. Un usuario no "es" el rol Empresa; un usuario pertenece a una o varias empresas y tiene un **rol independiente dentro de cada empresa**. El propietario de una empresa no es un rol distinto: es un usuario con rol **Administrador** marcado con el atributo **propietario** dentro de esa empresa (ver `docs/04_BUSINESS_RULES.md`, regla BR-PERM-003). Esta sección reemplaza la versión anterior, que incluía "Empresa" como rol y trataba a Auditor como una variante de consulta de Supervisor.

Los roles del sistema (control de acceso) son distintos de los usuarios/personas de mercado descritos en `MASTER_CONTEXT.md` (sección 8). Los **seis roles oficiales del MVP** son: Administrador, Contador, Auxiliar, Supervisor, Auditor, Estudiante. Esta tabla los reconcilia con las personas de mercado:

| Rol del sistema | Personas de `MASTER_CONTEXT.md` que representa                                                                                                                        | Alcance típico en el MVP                                                                  |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Administrador   | Administrador interno de ContaIA (nivel plataforma) y Director financiero/administrador o dueño de la empresa (nivel empresa, opcionalmente marcado como propietario) | Gestión de usuarios y configuración de su ámbito (plataforma o empresa)                   |
| Contador        | Contador independiente, Asesor fiscal (con alcance de consulta)                                                                                                       | Configura catálogo, captura y aprueba pólizas, consulta estados financieros y chat        |
| Auxiliar        | Auxiliar contable                                                                                                                                                     | Captura documentos y pólizas en borrador; no aprueba ni finaliza                          |
| Supervisor      | Especialista humano que revisa                                                                                                                                        | Aprueba o rechaza pólizas y respuestas de IA marcadas como sensibles                      |
| Auditor         | Auditor                                                                                                                                                               | Acceso de solo consulta a evidencia, trazabilidad y estados financieros; no modifica nada |
| Estudiante      | Estudiante de contaduría                                                                                                                                              | Entorno sandbox con datos simulados; sin acceso a empresas reales                         |

**Notas:**

- "Despacho contable" no es un rol ni una empresa; es una **Organización** (entidad de dominio) que agrupa varias empresas administradas por el mismo conjunto de usuarios, con roles independientes por empresa dentro de ella (ver `docs/04_BUSINESS_RULES.md`, módulo Organizaciones).
- "Empresa o negocio" (la persona dueña del negocio) se representa con rol **Administrador** marcado como propietario de esa empresa — ya no con un rol propio.
- El rol **Invitado** (acceso externo de solo lectura) queda explícitamente **fuera del alcance del MVP** (ver sección 19, "Fuera de alcance").
- Un mismo usuario puede tener roles distintos en empresas distintas (por ejemplo, Contador en una empresa y Auxiliar en otra).

## 12. Flujo de aprobación

Toda acción sensible debe poder revisarse antes de aprobarse, contabilizarse, descargarse o enviarse (principio 10.2 de `MASTER_CONTEXT.md`). El flujo general es:

1. Un usuario o un agente de IA genera una propuesta (póliza en borrador, dato extraído de un XML, respuesta de chat marcada como sensible, etc.).
2. El sistema clasifica la propuesta según su nivel de sensibilidad (definitivo vs. borrador; respuesta con fundamento suficiente vs. insuficiente).
3. Si requiere revisión humana, se enruta a un rol con permiso de aprobación (Contador, Supervisor o Administrador de empresa, según el tipo de acción).
4. El aprobador revisa el fundamento, la evidencia y el resultado propuesto.
5. El aprobador aprueba (la propuesta se vuelve definitiva y queda registrada en trazabilidad, módulo M11) o rechaza (la propuesta regresa a borrador con un motivo documentado).
6. Ninguna acción sensible — contabilizar, aprobar, descargar en definitivo, enviar — se ejecuta automáticamente sin este paso.

## 13. Requisitos funcionales

**Autenticación y acceso**

- RF-01. El sistema debe permitir registro, verificación de cuenta e inicio de sesión.
- RF-02. El sistema debe exigir autenticación multifactor para roles con acceso a datos sensibles.
- RF-03. El sistema debe permitir asignar uno o más roles a un usuario, diferenciados por empresa.
- RF-04. El sistema debe impedir el acceso a datos de una empresa a la que el usuario no pertenece.

**Multiempresa**

- RF-05. El sistema debe permitir crear una empresa con datos generales básicos.
- RF-06. El sistema debe permitir a un usuario cambiar de empresa activa sin cerrar sesión.
- RF-07. El sistema debe garantizar aislamiento total de datos entre empresas.

**Documentos y CFDI**

- RF-08. El sistema debe permitir cargar archivos (XML, PDF, imágenes) asociados a una empresa.
- RF-09. El sistema debe registrar metadatos mínimos de cada documento cargado (fecha, tipo, usuario).
- RF-10. El sistema debe extraer los datos estructurados contenidos en un XML de CFDI válido.
- RF-11. El sistema debe señalar explícitamente campos ambiguos o incompletos en un XML cargado.
- RF-12. El sistema no debe timbrar, validar ante el SAT ni simular una conexión real con el SAT.

**Contabilidad**

- RF-13. El sistema debe permitir crear, editar y desactivar cuentas dentro de un catálogo por empresa.
- RF-14. El sistema debe permitir capturar pólizas contables en estado borrador.
- RF-15. El sistema debe validar que toda póliza esté balanceada (cargos = abonos) antes de permitir su aprobación.
- RF-16. El sistema debe requerir aprobación humana explícita para que una póliza pase de borrador a definitiva.
- RF-17. El sistema debe impedir la edición de una póliza definitiva sin dejar rastro en trazabilidad.
- RF-18. El sistema debe generar la balanza de comprobación de forma determinística a partir de pólizas definitivas.
- RF-19. El sistema debe generar balance general y estado de resultados básicos de forma determinística a partir de la balanza.

**Inteligencia artificial y chat**

- RF-20. El sistema debe permitir realizar preguntas en lenguaje natural sobre los datos de la empresa activa y sobre el contenido curado disponible.
- RF-21. Toda respuesta especializada debe mostrar fuente y vigencia, o declarar explícitamente que no cuenta con fundamento suficiente.
- RF-22. El sistema debe permitir al usuario marcar cualquier respuesta de IA para revisión humana.
- RF-23. El sistema no debe permitir que una respuesta de IA use datos de una empresa distinta a la activa.
- RF-24. El sistema debe ofrecer un conjunto acotado de calculadoras determinísticas, cada una con fórmula y supuestos documentados.

**Trazabilidad y alertas**

- RF-25. El sistema debe registrar usuario, empresa, fecha, hora, acción y resultado de toda acción sensible.
- RF-26. El sistema debe generar alertas básicas y deterministas ante inconsistencias evidentes (pólizas descuadradas, documentos sin clasificar, campos incompletos en un XML).
- RF-27. El historial de trazabilidad no debe poder alterarse retroactivamente.

**Administración interna**

- RF-28. El sistema debe permitir al equipo interno de ContaIA dar soporte a una cuenta, registrando el motivo del acceso.
- RF-29. El sistema debe impedir que el personal interno acceda a datos operativos de una empresa cliente sin un motivo de soporte registrado.

## 14. Requisitos no funcionales

`Estado: Propuesta pendiente de validación` — estos son objetivos de diseño iniciales, no compromisos contractuales; deberán validarse en `docs/07_SOFTWARE_ARCHITECTURE.md` y `docs/11_SECURITY_ARCHITECTURE.md`.

- **Rendimiento:** las operaciones comunes (consulta de balanza, listado de documentos, respuesta de chat) deben percibirse como ágiles para el usuario; las operaciones pesadas (carga masiva, generación de estados financieros) deben mostrar progreso claro.
- **Seguridad:** aislamiento estricto entre empresas; autenticación multifactor; cifrado de datos sensibles; gestión segura de secretos; mínimos privilegios por rol.
- **Accesibilidad:** interfaz utilizable con teclado y lectores de pantalla en los flujos principales; contraste y tamaños de texto adecuados.
- **Disponibilidad:** el servicio debe estar disponible de forma consistente, con mantenimiento planificado comunicado con anticipación.
- **Auditoría:** todo acceso a datos sensibles y toda acción sobre información contable o fiscal debe ser auditable.
- **Trazabilidad:** conforme al principio 10.8 de `MASTER_CONTEXT.md` — usuario, empresa, fecha, acción, resultado, versión de reglas, aprobaciones y fuente.
- **Privacidad:** los datos de una empresa nunca se usan para responder a otra ni para entrenar modelos sin autorización expresa (límites de la sección 15 de `MASTER_CONTEXT.md`).

## 15. Métricas del MVP

Subconjunto priorizado de los indicadores preliminares de `MASTER_CONTEXT.md` (sección 20), enfocado en validar el MVP:

- **Activación:** empresas creadas, primer XML cargado, primera póliza llevada a definitiva.
- **Uso del ciclo de valor:** porcentaje de empresas que llegan a generar una balanza o estado financiero.
- **Calidad de la IA:** porcentaje de respuestas del chat que citan fuente y vigencia; porcentaje de respuestas marcadas para revisión humana; porcentaje de respuestas que declaran fundamento insuficiente (una cifra sana, no un fallo, dado el alcance curado del MVP).
- **Confiabilidad:** número de alertas básicas generadas y resueltas; pólizas rechazadas en revisión vs. aprobadas.
- **Adopción:** usuarios activos, empresas activas, retención semanal/mensual.
- **Costo:** costo de IA por usuario activo.
- **Satisfacción:** satisfacción reportada por contadores y despachos piloto.

## 16. Riesgos

| Riesgo                                                                  | Impacto en el MVP                                                                   | Mitigación                                                                                                                                                                         |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base de conocimiento (`knowledge/`) vacía o insuficiente al lanzar      | El chat contable-fiscal (M9) no podría cumplir el principio de "IA con fundamentos" | Lanzar con un conjunto pequeño y curado de fuentes validadas; declarar explícitamente los límites de cobertura en el producto; no comunicar el chat como cobertura fiscal completa |
| Sobre-alcance de agentes de IA                                          | Retrasa el MVP y multiplica superficie de riesgo                                    | Activar solo 4 de los 11 agentes definidos (sección 10); el resto queda diferido                                                                                                   |
| Responsabilidad fiscal por respuestas o cálculos mal interpretados      | Riesgo legal y de confianza del producto                                            | Revisión humana obligatoria antes de cualquier uso fiscal definitivo; advertencias explícitas en calculadoras y chat; ningún cálculo fiscal completo en el MVP                     |
| Confusión entre roles del sistema y personas de mercado                 | Diseño de permisos inconsistente                                                    | Tabla de mapeo explícita (sección 11), usada como referencia obligatoria en diseño de UX y seguridad                                                                               |
| Inflación de alcance por narrativa de "ecosistema" y "experiencias WOW" | El equipo podría filtrar funcionalidades de etapas posteriores al MVP               | Sección 4 ("Qué NO incluye el MVP") y sección 19 ("Fuera de alcance") como límites explícitos y de referencia obligatoria                                                          |
| Dependencia de la calidad del XML cargado por el usuario                | Datos extraídos incorrectos o incompletos                                           | Todo dato extraído se marca como sujeto a revisión (RF-11); ninguna acción contable usa un dato sin aprobación humana                                                              |
| Baja adopción por parte de contadores independientes                    | Validación de mercado insuficiente                                                  | Métricas de activación y satisfacción (sección 15) como señal temprana; foco en simplicidad (principio 10.7)                                                                       |

## 17. Roadmap

El roadmap de este PRD (MVP → Beta → V1 → V2 → Enterprise) se mapea explícitamente sobre las etapas de `MASTER_CONTEXT.md` (sección 16) para evitar dos hojas de ruta paralelas.

| Fase de este PRD | Etapa de `MASTER_CONTEXT.md` | Contenido                                                                                                                                                |
| ---------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP              | Etapa 2                      | Los doce módulos descritos en la sección 9 de este documento                                                                                             |
| Beta             | Etapa 2 (validación)         | Mismo alcance del MVP, validado con contadores y despachos piloto reales; ajustes basados en uso real antes de automatizar                               |
| V1               | Etapa 3                      | Automatización contable: clasificación asistida, pólizas sugeridas con mayor cobertura, conciliaciones, reglas recurrentes                               |
| V2               | Etapas 4 y 5                 | Integraciones fiscales autorizadas (PAC, descarga masiva oficial) y gestión empresarial ampliada (inventarios, activos, nómina, tesorería, presupuestos) |
| Enterprise       | Etapa 6                      | API pública controlada, aplicación móvil, marketplace de especialistas, integraciones bancarias, ecosistema de terceros                                  |

`Estado: Propuesta pendiente de validación`

**Relación con los cuatro pilares:** de forma indicativa, ContaIA Fiscal se consolida hacia V2 (integraciones fiscales reales), ContaIA Empresarial hacia V2 (gestión empresarial ampliada), ContaIA Intelligence crece de forma transversal en todas las fases conforme se activan más agentes, y ContaIA Academy no tiene una fase asignada todavía — depende de la decisión pendiente sobre el alcance del rol Estudiante (sección 21).

## 18. Experiencias WOW

Cada experiencia está deliberadamente acotada para no comprometer los principios de honestidad y fundamentos verificables:

- **Explicación inteligente de pólizas:** el Agente contable puede explicar en lenguaje claro por qué una póliza ya registrada tiene la estructura que tiene, citando la norma o criterio si existe.
- **Análisis automático de XML:** al cargar un CFDI, el usuario ve de inmediato sus datos estructurados y cualquier inconsistencia, sin captura manual (módulo M4).
- **IA explicando fundamentos:** en lugar de una respuesta seca, el chat muestra fuente, vigencia y limitaciones — o declara honestamente que no tiene fundamento suficiente (módulo M9).
- **Alertas inteligentes básicas:** el sistema avisa de forma proactiva sobre pólizas descuadradas o documentos sin clasificar, sin que el usuario tenga que buscarlas (módulo M11, deliberadamente simple, no predictivo).
- **Preguntas en lenguaje natural:** el usuario puede preguntar sobre sus propios datos y el conocimiento curado disponible sin aprender un lenguaje de consulta técnico (parte de M9).

Estas experiencias están pensadas para sorprender por su claridad y honestidad, no por prometer más de lo que el MVP puede sostener.

## 19. Fuera de alcance

Además de lo detallado en la sección 4, quedan explícitamente fuera de esta versión:

- Nómina, inventarios, activos fijos, tesorería, presupuestos y proyecciones financieras avanzadas.
- Integración real con el SAT, PAC o cualquier autoridad (timbrado, descarga masiva, validaciones oficiales).
- Automatizaciones y reglas recurrentes de conciliación.
- Auditoría formal y opinión de auditor.
- Agentes de nómina, jurídico corporativo, auditoría y educativo en su versión completa.
- Marketplace de especialistas.
- Aplicación móvil nativa.
- API pública.
- Cobertura fiscal normativa completa (el MVP usa un conjunto curado y limitado de fuentes).
- ContaIA Fiscal, ContaIA Empresarial y ContaIA Academy como productos independientes.
- Rol Invitado (acceso externo compartido de solo lectura) — el modelo de roles del MVP se limita a los seis roles definidos en la sección 11 (Administrador, Contador, Auxiliar, Supervisor, Auditor, Estudiante). Decisión del responsable de producto, 2026-07-18.

## 20. Definición de terminado (ampliada)

Además de los criterios generales de `MASTER_CONTEXT.md` (sección 23), para el MVP una funcionalidad se considera terminada solo si, según corresponda a su naturaleza:

**Para funcionalidades con IA:**

- Muestra fundamento (fuente y vigencia) o declara explícitamente su ausencia.
- Pasó por el Agente supervisor de calidad y fuentes.
- Tiene un punto de revisión humana disponible.
- No mezcla datos entre empresas.

**Para funcionalidades de cálculo (balanza, estados financieros, calculadoras):**

- El cálculo es determinístico y reproducible.
- Tiene al menos un caso de prueba documentado.
- Muestra el periodo y la fecha de generación.
- Incluye advertencia de que no sustituye revisión profesional, cuando aplique.

**Para funcionalidades operativas (documentos, pólizas, catálogo):**

- Respeta el aislamiento entre empresas.
- Queda registrada en trazabilidad (módulo M11).
- Tiene manejo de errores para entradas inválidas o incompletas.
- Cuenta con permisos verificados por rol.

**Para toda funcionalidad, además:**

- Requisito documentado en este PRD o en un documento derivado.
- Diseño UX aprobado.
- Pruebas realizadas.
- Aprobación del propietario del producto.

## 21. Preguntas pendientes

Estas decisiones no están aprobadas y requieren validación del responsable del producto:

1. ¿El rol Estudiante debe existir en el MVP (en versión sandbox limitada) o se difiere por completo a una fase posterior asociada a ContaIA Academy?
2. ¿Se ratifica el marco de los cuatro pilares (Fiscal, Empresarial, Intelligence, Academy) como parte de `MASTER_CONTEXT.md`, o se mantiene únicamente como narrativa de este PRD por ahora?
3. ¿Cuáles calculadoras determinísticas específicas formarán parte del conjunto acotado del módulo M10?
4. ¿Qué temas fiscales y contables concretos formarán el conjunto curado inicial de `knowledge/` para el lanzamiento del chat (módulo M9)?
5. ~~¿Se confirma el mapeo de roles de la sección 11, o se requiere un rol adicional...?~~ **Resuelta el 2026-07-18:** se adoptó un modelo de 6 roles (Administrador, Contador, Auxiliar, Supervisor, Auditor, Estudiante), Empresa pasó a ser entidad de dominio, y el rol Invitado quedó fuera del MVP. Ver sección 11.
6. ¿Se confirma el mapeo de roadmap (MVP/Beta/V1/V2/Enterprise) contra las Etapas 0-6 de `MASTER_CONTEXT.md` de la sección 17?

Estas preguntas también deberían trasladarse a `brain/QUESTIONS.md` en un paso posterior autorizado por separado.

## 22. Historial de cambios

| Fecha      | Cambio                                                                                                                                                                                                                                          | Responsable                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-07-18 | Creación de la primera versión completa de `docs/01_PRD.md`, derivada de `MASTER_CONTEXT.md` y `docs/00_PRODUCT_VISION.md`, con alcance de MVP acotado a doce módulos y cuatro agentes de IA activos.                                           | Responsable de producto de ContaIA |
| 2026-07-18 | Actualización del modelo de roles (sección 11) bajo CEW-004: Empresa pasa de rol a entidad de dominio, Auditor se eleva a rol de primera clase, y el rol Invitado queda fuera del MVP (sección 19). Pregunta 5 de la sección 21 queda resuelta. | Responsable de producto de ContaIA |
