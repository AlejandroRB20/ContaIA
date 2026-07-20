# Contexto Maestro del Proyecto — ContaIA

## 1. Título

Contexto Maestro de ContaIA

## 2. Control del documento

| Campo                   | Valor                                                                                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documento               | MASTER_CONTEXT.md                                                                                                                                                                                                                                                                                               |
| Versión                 | 0.1                                                                                                                                                                                                                                                                                                             |
| Estado general          | Borrador — primera versión completa                                                                                                                                                                                                                                                                             |
| Fecha de creación       | 2026-07-18                                                                                                                                                                                                                                                                                                      |
| Última actualización    | 2026-07-18                                                                                                                                                                                                                                                                                                      |
| Propietario             | Responsable de producto de ContaIA                                                                                                                                                                                                                                                                              |
| Documentos relacionados | `docs/01_PRD.md`, `docs/00_PRODUCT_VISION.md`, `docs/04_BUSINESS_RULES.md`, `docs/05_SYSTEM_DOMAIN_MODEL.md`, `docs/07_SOFTWARE_ARCHITECTURE.md`, `docs/10_AI_ARCHITECTURE.md`, `docs/11_SECURITY_ARCHITECTURE.md`, `docs/27_LEGAL_COMPLIANCE.md`, `brain/DECISIONS.md`, `brain/QUESTIONS.md`, `brain/RISKS.md` |

> Nota: Este documento define el contexto y los principios rectores del proyecto. No sustituye al PRD ni a los documentos técnicos específicos, y todavía no debe usarse para programar.

## 3. Resumen ejecutivo

ContaIA es una plataforma SaaS mexicana en etapa de diseño, orientada a contabilidad, fiscalidad, administración empresarial e inteligencia artificial. Su propósito es actuar como copiloto inteligente para contadores, despachos, empresas y estudiantes, ayudando a organizar, analizar, automatizar y explicar procesos contables y fiscales de forma clara, verificable y segura. ContaIA no sustituye el criterio profesional humano: toda operación sensible debe pasar por mecanismos de revisión y aprobación humana. El proyecto se desarrollará por etapas, comenzando por documentación y diseño, y avanzará de forma incremental hacia un MVP funcional y, posteriormente, hacia automatización, integraciones fiscales y gestión empresarial ampliada. Este documento es la fuente de contexto que debe leerse antes de planear, diseñar o programar cualquier función del proyecto.

## 4. Identidad del producto

**Nombre provisional:** ContaIA

**Categoría:** Plataforma SaaS mexicana de contabilidad, fiscalidad, administración empresarial e inteligencia artificial.

**Propuesta central:** ContaIA será un copiloto inteligente para contadores, despachos, empresas y estudiantes. Ayudará a organizar, analizar, automatizar y explicar procesos contables y fiscales de manera clara, verificable y segura.

**Aclaración fundamental:** ContaIA no sustituirá el criterio profesional de un contador, fiscalista, auditor o abogado. Las operaciones sensibles deberán incluir mecanismos de revisión y aprobación humana.

`Estado: Aprobado como principio inicial`

## 5. Visión

Construir una de las plataformas contables y fiscales con inteligencia artificial más completas, confiables y fáciles de usar en México.

La plataforma deberá reducir tareas repetitivas, facilitar el cumplimiento, mejorar la calidad de la información financiera y ayudar a los usuarios a entender sus operaciones.

## 6. Misión

Ofrecer a contadores, despachos, empresas y estudiantes mexicanos una herramienta que combine automatización, inteligencia artificial fundamentada y buenas prácticas contables y fiscales, para que puedan trabajar con mayor rapidez, menor margen de error y mayor comprensión de sus propias operaciones, siempre bajo supervisión profesional humana.

`Estado: Propuesta pendiente de validación`

## 7. Propuesta de valor

ContaIA combina tres elementos que hoy suelen estar fragmentados en herramientas separadas: (1) organización y automatización contable-fiscal, (2) inteligencia artificial que explica y fundamenta en lugar de solo responder, y (3) trazabilidad y control propios de un entorno profesional regulado. El diferenciador central no es "una IA que contesta preguntas fiscales", sino un sistema que muestra fuentes, versiones y vigencias, separa cálculo determinístico de interpretación de IA, y deja siempre un rastro de auditoría revisable por un humano.

## 8. Usuarios principales

1. **Contador independiente.** Gestiona la contabilidad y cumplimiento fiscal de uno o varios clientes por su cuenta; necesita eficiencia, organización documental y respuestas confiables sin perder control profesional.
2. **Despacho contable.** Equipo que atiende múltiples empresas o clientes; necesita administración multiempresa, control de acceso por colaborador y estandarización de procesos.
3. **Empresa o negocio.** Usuario final que genera y consume información contable; necesita visibilidad clara de su situación financiera y fiscal sin depender de conocimientos técnicos profundos.
4. **Director financiero o administrador.** Responsable de la salud financiera de una organización; necesita indicadores, reportes y proyecciones confiables para la toma de decisiones.
5. **Auxiliar contable.** Ejecuta tareas operativas de captura, conciliación y organización; necesita herramientas ágiles que reduzcan trabajo manual repetitivo.
6. **Auditor.** Revisa y valida la información contable y financiera; necesita trazabilidad, evidencia y acceso ordenado a papeles de trabajo.
7. **Asesor fiscal.** Brinda orientación fiscal especializada; necesita fundamentos normativos actualizados y versionados para respaldar sus recomendaciones.
8. **Estudiante de contaduría.** Usuario en formación; necesita explicaciones didácticas, ejemplos prácticos y un entorno seguro de aprendizaje sin acceso a datos reales sensibles.
9. **Administrador interno de ContaIA.** Personal de la plataforma que da soporte, configura reglas, revisa incidencias y administra el sistema a nivel operativo.
10. **Especialista humano que revisa respuestas o casos complejos.** Profesional (interno o externo) que valida respuestas de IA, aprueba operaciones sensibles y actúa como última instancia de criterio profesional.

## 9. Problemas que busca resolver

**Operación y captura**

- Captura manual repetitiva.
- Errores en registros contables.
- Desorganización de documentos.
- Procesos lentos de revisión y cierre.

**Documentos fiscales y conciliación**

- Dificultad para interpretar XML y CFDI.
- Falta de conciliación entre bancos, CFDI y contabilidad.
- Dificultad para generar pólizas y papeles de trabajo.

**Información y conocimiento**

- Información legal y fiscal dispersa.
- Falta de explicaciones comprensibles.
- Riesgo de respuestas de IA sin fundamento.

**Gestión y control**

- Uso de sistemas contables complejos.
- Dificultad para administrar varias empresas.
- Falta de trazabilidad y evidencia.
- Dificultad para elaborar estados financieros.
- Falta de alertas sobre inconsistencias.

## 10. Principios obligatorios

Todos los principios de esta sección tienen `Estado: Aprobado como principio inicial`, salvo que se indique lo contrario.

### 10.1 Confiabilidad

La plataforma debe priorizar exactitud, validación, trazabilidad y evidencia en toda la información y todos los cálculos que produce o presenta.

### 10.2 Revisión humana

Toda acción fiscal, contable, legal o financiera relevante deberá poder revisarse antes de aprobarse, contabilizarse, descargarse o enviarse. Ninguna acción sensible se ejecuta de forma automática sin punto de control humano.

### 10.3 IA con fundamentos

Las respuestas especializadas deberán mostrar, cuando corresponda: fuente; documento; artículo, regla o apartado; fecha de publicación; vigencia; ejercicio fiscal; versión consultada; advertencias o limitaciones. Una respuesta sin fundamento disponible debe declararse explícitamente como tal.

### 10.4 Cálculos determinísticos

La IA no será responsable directa de realizar cálculos fiscales o contables críticos. Los cálculos deberán ejecutarse mediante motores de reglas y funciones determinísticas, con: fórmulas verificables; versiones; casos de prueba; redondeos definidos; entradas y salidas registradas; trazabilidad. La IA podrá interpretar datos, explicar resultados y ayudar al usuario, pero no inventar fórmulas.

### 10.5 Versionado normativo

Toda información fiscal, legal, contable y normativa deberá identificarse por periodo y vigencia. La plataforma deberá distinguir entre: legislación vigente; legislación histórica; ejercicio fiscal aplicable; reformas; disposiciones transitorias; documentos no oficiales; criterios orientativos; jurisprudencia; fuentes derogadas o sustituidas.

### 10.6 Seguridad y privacidad

La seguridad debe considerarse desde el inicio, incluyendo: aislamiento entre empresas; roles y permisos; autenticación multifactor; cifrado; registro de auditoría; mínimos privilegios; protección de documentos; gestión segura de secretos; respaldo y recuperación; prevención de acceso no autorizado.

### 10.7 Simplicidad

Aunque la plataforma sea técnicamente avanzada, deberá ser sencilla de utilizar. Debe priorizar: lenguaje claro; procesos guiados; explicaciones paso a paso; ayudas contextuales; diseño limpio; baja saturación visual; accesibilidad; consistencia.

### 10.8 Trazabilidad

Las acciones importantes deberán registrar: usuario; empresa; fecha y hora; acción; información afectada; resultado; versión de reglas utilizada; aprobaciones; fuente de información; cambios realizados.

### 10.9 Modularidad

La plataforma deberá crecer por módulos sin convertirse prematuramente en una arquitectura innecesariamente compleja. El MVP comenzará como un monolito modular bien estructurado. Una migración a servicios separados solo deberá realizarse cuando existan razones operativas, de seguridad, escalabilidad o equipos independientes.

### 10.10 Honestidad de la IA

Cuando la IA no tenga información suficiente, deberá reconocerlo. Nunca deberá: inventar fundamentos; fingir certeza; ocultar contradicciones; presentar estimaciones como hechos; realizar acciones irreversibles sin autorización.

## 11. Alcance general futuro

Los módulos y capacidades descritos en las secciones 12 y 13 representan una **visión de largo plazo**. No todos pertenecerán al MVP: el alcance definitivo del MVP se determinará en `docs/01_PRD.md` conforme a la Etapa 2 de la estrategia de producto (sección 16). Esta sección no debe interpretarse como un compromiso de entrega, sino como un mapa de hacia dónde puede crecer el producto.

`Estado: Propuesta pendiente de validación`

## 12. Módulos

**Núcleo y administración**

- Autenticación y seguridad.
- Usuarios, equipos, roles y permisos.
- Administración multiempresa.
- Expediente fiscal y empresarial.
- Panel administrativo interno.

**Terceros y catálogos**

- Clientes y proveedores.
- Catálogo de cuentas.

**Contabilidad**

- Pólizas contables.
- Auxiliares.
- Balanza de comprobación.
- Estados financieros.
- Papeles de trabajo.

**Documentos fiscales**

- Carga y análisis de XML.
- Repositorio de CFDI.
- Conciliación bancaria.
- Conciliación entre CFDI y contabilidad.

**Finanzas operativas**

- Cuentas por cobrar.
- Cuentas por pagar.
- Bancos y tesorería.
- Inventarios.
- Activos fijos.
- Nómina.
- Presupuestos.
- Flujo de efectivo.

**Análisis y control**

- Indicadores financieros.
- Auditoría.
- Reportes.
- Alertas.
- Automatizaciones.

**Conocimiento e inteligencia artificial**

- Centro de conocimiento.
- Agentes de inteligencia artificial.

**Futuro**

- Marketplace de especialistas, considerado únicamente como fase futura.

`Estado: Propuesta pendiente de validación`

## 13. Agentes de inteligencia artificial

Esta sección define el propósito y los límites iniciales de cada agente. No incluye los prompts internos definitivos, que se desarrollarán en `prompts/` y en `docs/10_AI_ARCHITECTURE.md`. Todos los agentes están sujetos a los principios de la sección 10, en particular 10.2 (revisión humana), 10.3 (IA con fundamentos), 10.4 (cálculos determinísticos) y 10.10 (honestidad de la IA).

### 13.1 Agente contable

- **Propósito:** ayudar a organizar, clasificar y explicar información contable.
- **Tareas permitidas:** sugerir clasificación de cuentas, explicar pólizas existentes, apoyar en la organización de auxiliares y papeles de trabajo.
- **Tareas prohibidas:** contabilizar de forma automática sin aprobación humana; modificar registros ya validados.
- **Fuentes que podrá consultar:** catálogo de cuentas de la empresa, NIF aplicables validadas en `knowledge/NIF`, documentación interna del expediente de la empresa.
- **Resultados esperados:** propuestas de clasificación y explicaciones claras, siempre marcadas como sugerencias.
- **Revisión humana:** obligatoria antes de cualquier registro definitivo.
- **Fundamentos:** debe citar la norma o criterio contable en que se basa una sugerencia, cuando exista.
- **Manejo de incertidumbre:** si no hay criterio contable claro, debe señalarlo y evitar proponer una clasificación como definitiva.

### 13.2 Agente fiscal

- **Propósito:** apoyar en la interpretación y organización de obligaciones fiscales.
- **Tareas permitidas:** explicar disposiciones fiscales con fuente citada, identificar obligaciones aplicables según datos proporcionados, apoyar en la preparación de información para revisión humana.
- **Tareas prohibidas:** presentar declaraciones; garantizar cumplimiento; afirmar vigencia sin verificarla contra una fuente validada.
- **Fuentes que podrá consultar:** documentos clasificados como oficiales o autorizados en `knowledge/SAT`, `knowledge/CFF`, `knowledge/ISR`, `knowledge/IVA`, `knowledge/IEPS`, `knowledge/RMF`.
- **Resultados esperados:** explicaciones fundamentadas con advertencias de vigencia y ejercicio fiscal aplicable.
- **Revisión humana:** obligatoria antes de cualquier presentación, pago o trámite ante autoridad.
- **Fundamentos:** debe citar fuente, apartado y vigencia; si no puede, debe decirlo explícitamente.
- **Manejo de incertidumbre:** ante ambigüedad normativa, debe presentar la duda y remitir a un asesor fiscal humano.

### 13.3 Agente NIF

- **Propósito:** apoyar en la interpretación de Normas de Información Financiera.
- **Tareas permitidas:** explicar criterios contables generales con fuente citada, cuando la fuente esté disponible y autorizada.
- **Tareas prohibidas:** reproducir o distribuir contenido protegido por derechos de autor del CINIF sin autorización; inventar contenido normativo.
- **Fuentes que podrá consultar:** materiales clasificados como oficiales o autorizados en `knowledge/NIF`, respetando licencias.
- **Resultados esperados:** explicaciones conceptuales fundamentadas, no transcripción de texto protegido.
- **Revisión humana:** recomendada para la aplicación de criterios contables complejos o casos límite.
- **Fundamentos:** debe indicar la norma referida y su estatus de vigencia.
- **Manejo de incertidumbre:** si la fuente no está disponible en `knowledge/`, debe declararlo en vez de responder de memoria.

### 13.4 Agente de CFDI y XML

- **Propósito:** ayudar a leer, organizar y validar estructuralmente comprobantes fiscales digitales.
- **Tareas permitidas:** extraer y presentar datos estructurados de un XML, identificar inconsistencias evidentes de formato, apoyar en la organización del repositorio de CFDI.
- **Tareas prohibidas:** timbrar comprobantes; afirmar validez fiscal sin una validación técnica real; simular conexión con el SAT cuando no exista.
- **Fuentes que podrá consultar:** el propio archivo XML, esquemas y reglas técnicas documentadas en `knowledge/CFDI`.
- **Resultados esperados:** datos extraídos de forma estructurada y advertencias sobre posibles inconsistencias.
- **Revisión humana:** obligatoria antes de usar los datos extraídos para efectos contables o fiscales definitivos.
- **Fundamentos:** debe indicar de qué campo o sección del XML proviene cada dato presentado.
- **Manejo de incertidumbre:** si un campo es ambiguo o el XML es incompleto, debe señalarlo en vez de inferir un valor.

### 13.5 Agente de auditoría

- **Propósito:** apoyar en la revisión de consistencia, trazabilidad y evidencia de la información registrada.
- **Tareas permitidas:** identificar inconsistencias entre módulos, señalar falta de evidencia o documentación soporte, generar resúmenes de hallazgos para revisión humana.
- **Tareas prohibidas:** emitir una opinión de auditoría formal; certificar cumplimiento.
- **Fuentes que podrá consultar:** registros internos de la empresa, bitácoras de auditoría, papeles de trabajo.
- **Resultados esperados:** listas de hallazgos con referencia a los registros afectados.
- **Revisión humana:** obligatoria; el agente identifica, el auditor humano concluye.
- **Fundamentos:** debe referenciar el registro, documento o módulo exacto que sustenta cada hallazgo.
- **Manejo de incertidumbre:** debe distinguir entre "inconsistencia confirmada" y "posible inconsistencia a revisar".

### 13.6 Agente financiero y empresarial

- **Propósito:** apoyar en la interpretación de indicadores financieros y de negocio.
- **Tareas permitidas:** explicar indicadores calculados por motores determinísticos, ayudar a interpretar tendencias con base en los datos de la empresa.
- **Tareas prohibidas:** emitir recomendaciones de inversión personalizadas; calcular indicadores fuera de los motores determinísticos definidos.
- **Fuentes que podrá consultar:** datos financieros internos de la empresa, definiciones de indicadores documentadas.
- **Resultados esperados:** explicaciones e interpretaciones claras de indicadores ya calculados.
- **Revisión humana:** recomendada para decisiones financieras relevantes.
- **Fundamentos:** debe indicar la fórmula y el periodo de datos utilizados en el indicador que explica.
- **Manejo de incertidumbre:** debe evitar proyecciones categóricas cuando los datos disponibles sean insuficientes.

### 13.7 Agente de nómina

- **Propósito:** apoyar en la organización e interpretación de información de nómina.
- **Tareas permitidas:** explicar conceptos de nómina con fuente citada, apoyar en la organización de datos de empleados para revisión humana.
- **Tareas prohibidas:** calcular percepciones, deducciones o cuotas obrero-patronales de forma directa por IA; timbrar recibos de nómina.
- **Fuentes que podrá consultar:** documentos clasificados como oficiales o autorizados en `knowledge/LFT`, `knowledge/LSS`, `knowledge/INFONAVIT`.
- **Resultados esperados:** explicaciones fundamentadas y organización de datos, no cálculos definitivos.
- **Revisión humana:** obligatoria antes de cualquier pago o entero de obligaciones.
- **Fundamentos:** debe citar la disposición laboral o de seguridad social referida.
- **Manejo de incertidumbre:** ante casos particulares de un trabajador, debe remitir a revisión humana especializada.

### 13.8 Agente jurídico corporativo

- **Propósito:** apoyar en la organización e interpretación general de aspectos societarios y corporativos.
- **Tareas permitidas:** explicar conceptos generales de derecho corporativo con fuente citada, apoyar en la organización del expediente societario.
- **Tareas prohibidas:** redactar documentos legales definitivos sin revisión de abogado; dar asesoría legal personalizada vinculante.
- **Fuentes que podrá consultar:** documentos clasificados como oficiales o autorizados en `knowledge/LGSM` y jurisprudencia relevante en `knowledge/JURISPRUDENCIA`.
- **Resultados esperados:** explicaciones generales con advertencia de que no constituyen asesoría legal formal.
- **Revisión humana:** obligatoria para cualquier acto con efectos legales.
- **Fundamentos:** debe citar la disposición o criterio referido.
- **Manejo de incertidumbre:** debe remitir a un abogado corporativo humano ante cualquier duda sustantiva.

### 13.9 Agente educativo

- **Propósito:** apoyar el aprendizaje de estudiantes de contaduría y usuarios en formación.
- **Tareas permitidas:** explicar conceptos con distintos niveles de profundidad, generar ejemplos prácticos y ejercicios, usar datos simulados o anonimizados.
- **Tareas prohibidas:** usar datos reales de una empresa como material educativo sin autorización; presentar ejercicios como si fueran asesoría profesional real.
- **Fuentes que podrá consultar:** todo el centro de conocimiento clasificado como validado, con prioridad en materiales académicos.
- **Resultados esperados:** explicaciones didácticas, ejemplos y ejercicios claramente marcados como material educativo.
- **Revisión humana:** recomendada por un docente o tutor para validar la calidad pedagógica del contenido.
- **Fundamentos:** debe indicar la fuente del concepto explicado cuando aplique.
- **Manejo de incertidumbre:** debe distinguir entre "regla general" y "caso especial que requiere consulta adicional".

### 13.10 Agente de soporte

- **Propósito:** ayudar a los usuarios a utilizar la plataforma.
- **Tareas permitidas:** explicar funciones de la plataforma, guiar procesos paso a paso, dirigir a los usuarios al módulo o agente correspondiente.
- **Tareas prohibidas:** dar asesoría contable, fiscal o legal sustantiva; modificar configuraciones críticas sin confirmación del usuario.
- **Fuentes que podrá consultar:** documentación de producto y ayuda interna de la plataforma.
- **Resultados esperados:** respuestas operativas claras sobre el uso del sistema.
- **Revisión humana:** no obligatoria para uso general; sí para cambios de configuración sensibles.
- **Fundamentos:** referencia a la documentación de producto correspondiente.
- **Manejo de incertidumbre:** si la duda es sustantiva (contable, fiscal o legal), debe derivar al agente especializado correspondiente.

### 13.11 Agente supervisor de calidad y fuentes

- **Propósito:** vigilar que las respuestas de los demás agentes cumplan con los principios de fundamentación, versionado y honestidad definidos en la sección 10.
- **Tareas permitidas:** revisar que las respuestas citen fuente y vigencia cuando corresponda, señalar respuestas sin fundamento suficiente, marcar contenido para revisión humana.
- **Tareas prohibidas:** generar contenido fiscal, contable o legal sustantivo por sí mismo; aprobar de forma autónoma una respuesta marcada como de alto riesgo.
- **Fuentes que podrá consultar:** los metadatos de la política de conocimiento (sección 14) y los registros de trazabilidad de cada respuesta.
- **Resultados esperados:** señales de calidad (aprobado, requiere revisión, insuficiente) asociadas a cada respuesta generada por otros agentes.
- **Revisión humana:** cualquier respuesta marcada como "insuficiente" o "de alto riesgo" debe bloquearse hasta revisión humana.
- **Fundamentos:** debe reportar qué criterio de la política de fuentes se cumplió o incumplió.
- **Manejo de incertidumbre:** ante duda sobre la calidad de una fuente, debe clasificarla como no verificada en vez de aprobarla por defecto.

## 14. Política de conocimiento

Esta sección define la política inicial para la carpeta `knowledge/`.

### 14.1 Clasificación de fuentes

- Oficiales.
- Autorizadas.
- Internas.
- Académicas.
- Jurisprudenciales.
- Criterios orientativos.
- Casos prácticos.
- No verificadas.

### 14.2 Metadatos mínimos por documento

Título; institución; tipo de documento; fecha de publicación; fecha de consulta; fecha de entrada en vigor; fecha de terminación de vigencia, cuando corresponda; ejercicio fiscal; versión; URL o procedencia; estatus de validación; derechos o restricciones de uso; responsable de revisión; hash o identificador de integridad.

### 14.3 Fuentes prioritarias

Diario Oficial de la Federación; Cámara de Diputados; SAT; PRODECON; SCJN; TFJA; IMSS; INFONAVIT; Secretaría del Trabajo; Secretaría de Economía; CINIF, respetando licencias y derechos de autor; otras instituciones oficiales aplicables.

### 14.4 Aclaración sobre derechos de autor

No se copiarán ni distribuirán documentos protegidos sin autorización. El almacenamiento de referencias, resúmenes o metadatos no sustituye la obligación de respetar licencias y derechos de autor de cada fuente.

`Estado: Aprobado como principio inicial`

## 15. Límites del producto

ContaIA:

- No es una autoridad fiscal.
- No garantiza automáticamente el cumplimiento.
- No sustituye asesoría profesional personalizada.
- No debe enviar declaraciones sin aprobación.
- No debe timbrar CFDI sin una integración autorizada.
- No debe almacenar contraseñas o e.firma de forma insegura.
- No debe simular conexión real con el SAT cuando no exista.
- No debe presentar cálculos no validados como definitivos.
- No debe usar información de una empresa para responder a otra.
- No debe entrenar modelos con datos privados sin autorización expresa.
- No debe realizar acciones destructivas sin confirmación.

`Estado: Aprobado como principio inicial`

## 16. Estrategia inicial del producto

### Etapa 0: documentación y diseño

Visión; PRD; reglas de negocio; arquitectura; UX/UI; base de datos; seguridad; IA; pruebas.

### Etapa 1: prototipo visual

Landing page; inicio de sesión simulado; dashboard; navegación; empresas; asistente IA visual; carga de archivos simulada. Sin integraciones fiscales reales.

### Etapa 2: MVP funcional

1. Usuarios, autenticación, roles y empresas.
2. Carga y lectura de XML CFDI.
3. Organización documental.
4. Catálogo de cuentas y pólizas.
5. Balanza y estados financieros básicos.
6. Chat contable-fiscal con fuentes validadas.
7. Calculadoras determinísticas seleccionadas.
8. Historial, evidencias y auditoría.

El PRD (`docs/01_PRD.md`) decidirá el alcance definitivo de esta etapa.

### Etapa 3: automatización contable

Clasificación; propuestas de cuentas; pólizas sugeridas; conciliaciones; reglas recurrentes; revisión y aprobación.

### Etapa 4: integraciones fiscales

PAC autorizado cuando sea necesario; descarga masiva mediante mecanismos oficiales aplicables; validaciones; cumplimiento; declaraciones asistidas; integraciones autorizadas.

### Etapa 5: gestión empresarial

Inventarios; activos; nómina; tesorería; presupuestos; analítica; proyecciones.

### Etapa 6: expansión

API pública controlada; aplicación móvil; marketplace; integraciones bancarias; ecosistema de terceros.

`Estado: Propuesta pendiente de validación`

## 17. Arquitectura técnica preliminar

Las siguientes son decisiones **provisionales**, sujetas a validación posterior en `docs/07_SOFTWARE_ARCHITECTURE.md`. No constituyen especificaciones definitivas.

- Monorepo.
- Aplicación web con Next.js, React y TypeScript.
- Backend modular.
- PostgreSQL como base de datos principal.
- ORM por definir en el documento técnico.
- Almacenamiento de objetos compatible con S3.
- Sistema de colas para trabajos en segundo plano.
- Base vectorial o extensión vectorial para RAG.
- Contenedores para entornos reproducibles.
- Git y GitHub para control de versiones.
- CI/CD.
- Entornos separados: desarrollo, pruebas, staging y producción.
- Observabilidad, logs, métricas y alertas.
- Uso de proveedores de IA mediante una capa de abstracción.
- Evitar dependencia absoluta de un solo proveedor.

`Estado: Propuesta pendiente de validación`

## 18. Experiencia de usuario (UX/UI)

La interfaz debe ser: moderna; profesional; minimalista; accesible; responsiva; clara; apropiada para usuarios mexicanos; fácil para principiantes; eficiente para profesionales.

**Inspiraciones de experiencia, sin copiar diseños:** Stripe; Notion; Linear; Microsoft Dynamics; Odoo; QuickBooks; plataformas financieras modernas.

**Navegación adaptativa** según el tipo de usuario: contador; despacho; empresa; estudiante; administrador.

**Niveles de explicación de contenido** que la plataforma deberá ofrecer: respuesta rápida; explicación detallada; fundamento; ejemplo práctico; procedimiento paso a paso; mapa conceptual; preguntas frecuentes; ejercicio educativo.

`Estado: Propuesta pendiente de validación`

## 19. Modelo de negocio preliminar

Como hipótesis inicial: plan gratuito o demostración limitada; plan para contadores independientes; plan para despachos; plan para empresas; plan empresarial; cobros adicionales por consumo elevado de IA, almacenamiento o integraciones; posible acceso educativo; servicios profesionales opcionales.

Precios y características específicas se definirán después de validar el mercado y calcular costos.

`Estado: Propuesta pendiente de validación`

## 20. Indicadores de éxito preliminares

Tiempo ahorrado por proceso; porcentaje de documentos procesados correctamente; reducción de errores; tasa de aceptación de sugerencias contables; satisfacción de usuarios; retención; usuarios activos; empresas activas; tiempo de respuesta; disponibilidad; errores por módulo; calidad de respuestas con fuentes; porcentaje de respuestas que requieren corrección humana; costo de IA por usuario; conversión de prueba a pago.

`Estado: Propuesta pendiente de validación`

## 21. Riesgos principales

| Riesgo                               | Mitigación preliminar                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Errores fiscales                     | Separar cálculo determinístico de interpretación de IA; revisión humana obligatoria antes de presentar o pagar.                |
| Información desactualizada           | Versionado normativo obligatorio con fechas de vigencia y responsable de revisión.                                             |
| Respuestas inventadas                | Principio de honestidad de la IA; agente supervisor de calidad y fuentes; bloqueo de respuestas sin fundamento suficiente.     |
| Filtración de datos                  | Aislamiento entre empresas, cifrado, mínimos privilegios y registro de auditoría desde el diseño.                              |
| Uso indebido de e.firma              | Prohibición explícita de almacenamiento inseguro de e.firma y contraseñas; ver sección 15.                                     |
| Dependencia de proveedores           | Capa de abstracción de proveedores de IA; evitar dependencia absoluta de uno solo.                                             |
| Costos elevados de IA                | Métricas de costo de IA por usuario; calculadoras determinísticas para reducir uso innecesario de IA generativa.               |
| Complejidad excesiva                 | Principio de modularidad; MVP como monolito modular antes de migrar a servicios separados.                                     |
| Crecimiento prematuro                | Migración a microservicios solo ante razones operativas, de seguridad, escalabilidad o de equipo concretas.                    |
| Incumplimiento de licencias          | Política de conocimiento con clasificación de derechos de uso; prohibición de distribuir contenido protegido sin autorización. |
| Baja adopción                        | Validación de mercado antes de fijar modelo de negocio definitivo; foco en simplicidad (principio 10.7).                       |
| Mala experiencia de usuario          | Principios de UX/UI (sección 18) y pruebas de usabilidad en la estrategia de producto.                                         |
| Falta de validación profesional      | Revisión humana obligatoria (principio 10.2) en toda acción sensible.                                                          |
| Errores de OCR                       | Tratamiento de datos extraídos como propuesta sujeta a revisión, no como dato definitivo automático.                           |
| Integración inestable con terceros   | Entornos separados y observabilidad; integraciones fiscales solo en etapas posteriores del roadmap (Etapa 4).                  |
| Cambios normativos                   | Versionado normativo y distinción entre legislación vigente e histórica (principio 10.5).                                      |
| Mezcla de información entre empresas | Aislamiento estricto entre empresas como requisito de seguridad (principio 10.6 y límite en sección 15).                       |

## 22. Gobierno del proyecto

Las decisiones y el conocimiento del proyecto deben documentarse en los siguientes lugares:

- Decisiones técnicas → `brain/DECISIONS.md`
- Ideas sin aprobar → `brain/IDEAS.md`
- Preguntas pendientes → `brain/QUESTIONS.md`
- Riesgos → `brain/RISKS.md`
- Mejoras futuras → `brain/IMPROVEMENTS.md`
- Análisis competitivo → `brain/COMPETITORS.md`
- Cambios relevantes → `CHANGELOG.md`

Toda decisión importante registrada en `brain/DECISIONS.md` deberá incluir: fecha; contexto; alternativas; decisión; motivo; consecuencias; responsable; estatus.

`Estado: Aprobado como principio inicial`

## 23. Definición de terminado

Una funcionalidad no se considerará terminada solo porque su interfaz aparezca. Debe cumplir, según corresponda:

Requisito documentado; diseño aprobado; código revisado; pruebas; validación de seguridad; manejo de errores; permisos; auditoría; documentación; accesibilidad; rendimiento; observabilidad; revisión contable o fiscal; aprobación del propietario del producto.

`Estado: Aprobado como principio inicial`

## 24. Glosario inicial

Este glosario cubre únicamente lenguaje usado en este documento para facilitar su lectura. No constituye una fuente fiscal, contable o legal; para definiciones sustantivas remitirse a `docs/28_GLOSSARY.md` y a `knowledge/`.

- **SaaS:** software como servicio, entregado y operado en la nube.
- **MVP:** producto mínimo viable, primera versión funcional con el menor alcance útil posible.
- **CFDI:** comprobante fiscal digital por internet.
- **XML:** formato de archivo estructurado en el que se emiten los CFDI.
- **PAC:** proveedor autorizado de certificación, mencionado aquí solo como concepto general a integrar en etapas futuras.
- **RAG:** técnica de recuperación aumentada por generación, usada para fundamentar respuestas de IA en documentos fuente.
- **NIF:** Normas de Información Financiera.
- **Monorepo:** repositorio único que contiene múltiples aplicaciones o paquetes del proyecto.
- **Motor determinístico:** componente de software que produce siempre el mismo resultado ante las mismas entradas, usado para cálculos fiscales y contables críticos.

## 25. Preguntas pendientes

Las siguientes decisiones aún no están aprobadas y requieren validación del responsable del producto. También se registran en `brain/QUESTIONS.md`.

1. ¿Se confirma la misión redactada en la sección 6, o se ajusta su redacción?
2. ¿Cuál será el alcance definitivo del MVP dentro de los ocho puntos listados en la Etapa 2 (sección 16)?
3. ¿Se confirma el stack técnico preliminar de la sección 17, o se evaluarán alternativas antes de fijarlo en `docs/07_SOFTWARE_ARCHITECTURE.md`?
4. ¿Qué ORM se utilizará sobre PostgreSQL?
5. ¿Qué proveedor(es) de IA se evaluarán para la capa de abstracción mencionada en la arquitectura preliminar?
6. ¿Cuáles serán los planes y precios definitivos del modelo de negocio (sección 19)?
7. ¿En qué momento se considerará justificada la migración de un monolito modular a servicios separados (principio 10.9)?
8. ¿Qué institución o responsable validará inicialmente el contenido cargado en `knowledge/`?
9. ¿Cuándo y con qué PAC se abordará la integración fiscal de la Etapa 4?

## 26. Historial de cambios

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Responsable                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2026-07-18 | Creación de la primera versión completa de `MASTER_CONTEXT.md` a partir de la identidad, visión, principios, agentes, política de conocimiento, límites, estrategia y gobierno definidos por el responsable de producto.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Responsable de producto de ContaIA                                                          |
| 2026-07-18 | Se agrega la sección 27, "Historial de reorganización documental", bajo un Maintenance Work Order de reorganización de numeración (ver sección 27 para el detalle completo).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Responsable de producto de ContaIA                                                          |
| 2026-07-18 | Se agrega la subsección 27.4: adopción de la Política oficial de gestión de colisiones de numeración, y registro de la reorganización masiva del bloque `docs/20`-`docs/24` ejecutada bajo esa política.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Responsable de producto de ContaIA                                                          |
| 2026-07-19 | EWO-002 (Authentication & Authorization) implementado: módulos NestJS Authentication/Users/Roles & Permissions/Audit; entidades Prisma User/Company/Role/Permission/RolePermission/Membership/Session/PasswordReset/EmailVerification/Invitation/MfaRecoveryCode/AuditLog; JWT de acceso + refresh token rotable, Argon2id, TOTP completo (BR-AUTH-002), CSRF de doble cookie, guards Authentication/Company/Role/Permission/Ownership; frontend `/acceso/*` (login, MFA, recuperación/reset de contraseña, verificación de correo, logout) y páginas de estado (no autorizado, prohibido, sesión expirada). Tres decisiones de arquitectura confirmadas explícitamente con el responsable de producto (multi-tenancy vía Membership, sesión JWT+refresh sin Better Auth como mecanismo principal, MFA obligatorio ahora) y una decisión de alcance (Companies/correo real/enrolamiento MFA forzoso quedan fuera) — ver `brain/DECISIONS.md` D-002 a D-005 y `docs/engineering/EWO-002_AUTH_REPORT.md` para el detalle completo.                                                                                                                                                                                                                                                                                                             | Responsable de producto de ContaIA (decisiones confirmadas) / Claude Code (implementación)  |
| 2026-07-19 | Cierre completo de EWO-002 (de `COMPLETE_WITH_NON_BLOCKING_WARNINGS` a `DONE`), mismo día: página de Registro, flujo de invitación (`/acceso/invitacion/{token}`, WF-0004) y selección inicial de Empresa (`/seleccionar-empresa`, WF-0005); enrolamiento forzoso de MFA por Rol (BR-AUTH-002, `brain/DECISIONS.md` D-006); corrección de dos bugs preexistentes de auditoría (`MFA_ENABLED`/`MFA_DISABLED` nunca se emitían; `deviceInfo` llegaba `NULL` en todo `AuditLog` de eventos `auth.*` por un desajuste de nombre de campo). Companies completo y correo real quedan fuera, confirmados como alcance de una Work Order futura (D-005). Detalle completo en `docs/engineering/EWO-002_AUTH_REPORT.md` sección 12.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Responsable de producto de ContaIA (orden de cierre) / Claude Code (implementación)         |
| 2026-07-19 | Corrección de raíz del runner `pnpm run test:integration` de `apps/api`, mismo día — el responsable de producto no aceptó cerrar EWO-002 mientras no ejecutara. Causa real: un `jest.mock('@contaia/database', ...)` desactualizado desde EWO-001 (objeto literal fijo, nunca actualizado cuando EWO-002 agregó `prisma`/los enums de Prisma al módulo real), no el problema de resolución de módulos de Jest/pnpm que un diagnóstico previo, incompleto, había concluido erróneamente. Corregido con `jest.requireActual`, lo que a su vez expuso y permitió corregir un bug real de inyección de dependencias (`EMAIL_SENDER` no resoluble en `RolesPermissionsModule` — se movió a `CommonModule` global) que también habría roto el arranque real del backend en producción, y una prueba a la que le faltaba `correlationIdMiddleware`. `pnpm run check` ahora incluye `test:integration`. La suite de `packages/database` que sí requiere PostgreSQL real ahora se omite automáticamente (no falla) cuando Docker no está disponible, en vez de reportar un error. Detalle completo en `docs/engineering/EWO-002_AUTH_REPORT.md` sección 12.8.                                                                                                                                                                                         | Responsable de producto de ContaIA (orden de corrección) / Claude Code (implementación)     |
| 2026-07-19 | EWO-003 (Organization & Company Management) implementado: entidad `Organization` (BR-ORG-001/002) en alcance mínimo, `Company` completada con `businessActivity` (giro, BR-EMP-003) y `version` (bloqueo optimista); módulo `Companies` completo (crear, consultar, listar, actualizar — BR-EMP-001, BR-CFG-001/002) que EWO-002 había dejado explícitamente diferido (D-005); frontend `/crear-empresa`, `/empresas`, `/empresas/{companyId}` y extensión de `/seleccionar-empresa`. Dos conflictos entre la Work Order y la documentación aprobada se resolvieron con el responsable de producto antes de implementar (alcance mínimo de Organización; activación/baja de Empresa omitida por falta de regla de negocio aprobada) — ver `docs/engineering/EWO-003_COMPANY_REPORT.md` para el detalle completo. Migración real y verificación con Docker en vivo quedan pendientes por la misma ausencia de Docker ya documentada desde EWO-001.                                                                                                                                                                                                                                                                                                                                                                                            | Responsable de producto de ContaIA (decisiones confirmadas) / Claude Code (implementación)  |
| 2026-07-19 | Corrección de trazabilidad documental (mismo día, previa a EWO-004): `BR-EMP-004`, citada desde al menos seis documentos (`docs/04_BUSINESS_RULES.md` como dependencia de BR-USR-002, `docs/05_SYSTEM_DOMAIN_MODEL.md`, `docs/06_SYSTEM_WORKFLOWS.md`, `docs/08_API_DESIGN.md`, `docs/09_DATABASE_DESIGN.md`, `docs/11_SECURITY_ARCHITECTURE.md`, `docs/14_INFORMATION_ARCHITECTURE.md`, más `brain/DECISIONS.md` D-002/D-006), nunca estaba definida en `docs/04_BUSINESS_RULES.md` sección 4.3. Se definió formalmente como "Membresía única por par usuario-empresa, con Rol propio de esa relación", consistente con el comportamiento ya implementado desde EWO-002 (`@@unique([userId, companyId])` en `Membership`, RBAC evaluado siempre por `(Usuario, companyId, Rol)`) y con la redacción ya existente en los documentos que la citaban. Sin cambio de comportamiento del sistema ni nueva decisión arquitectónica — corrección de trazabilidad documental, per pedido explícito del responsable de producto. Detalle en la adenda de `docs/engineering/EWO-003_COMPANY_REPORT.md`.                                                                                                                                                                                                                                               | Responsable de producto de ContaIA (orden de corrección) / Claude Code (implementación)     |
| 2026-07-19 | Ampliación de EWO-003 (mismo día, segunda Work Order): perfil fiscal (`CompanyFiscalProfile.taxRegime`, texto libre sin catálogo SAT), domicilio fiscal (`CompanyAddress`), configuración regional (`CompanySettings`: zona horaria, moneda, idioma, país) y nombre comercial (`Company.tradeName`) — los tres sub-recursos nuevos comparten el bloqueo optimista de `Company.version` como aggregate root. Nuevos endpoints `PATCH /companies/{id}/fiscal-profile`, `/address`, `/settings`; nuevos permisos `company.fiscal.update`/`company.settings.update`; perfil de Empresa reestructurado en 4 secciones (General/Fiscal/Domicilio/Configuración); indicador visual de empresa activa agregado a `/seleccionar-empresa`. La Work Order volvió a pedir "estado de empresa" (activar/desactivar) — se reconfirmó con el responsable de producto mantener la exclusión ya decidida (documentación aprobada sin patrón de confirmación, evento de dominio ni regla de negocio para ese comportamiento). Detalle completo en `docs/engineering/EWO-003_COMPANY_REPORT.md` sección 13.                                                                                                                                                                                                                                                     | Responsable de producto de ContaIA (decisiones confirmadas) / Claude Code (implementación)  |
| 2026-07-19 | Cierre técnico de EWO-003 (mismo día, tercera revisión, rol Tech Lead): se agregó `GET /companies/{companyId}/memberships` (API-0016, documentada desde EWO-002 pero nunca implementada); protección contra revocar al último Administrador propietario activo de una Empresa (`LastOwnerException`, invariante permanente de BR-EMP-001, no una decisión nueva); se eliminó `AUTH_EVENTS.PERMISSION_CHANGED`, código muerto desde EWO-002 (sin emisor, sin consumidor, sin endpoint que lo justificara). `prisma format`/`prisma validate`/`prisma generate` ejecutados en verde; `prisma migrate dev` sigue bloqueado por ausencia de Docker, con comando exacto documentado para cuando esté disponible. `pnpm run check` completo (lint, typecheck, test, test:integration, build) en verde en los 9 paquetes del monorepo. Se confirmó que el repositorio no tiene ningún commit de Git todavía (ni de EWO-001, ni de EWO-002, ni de EWO-003) — commit recomendado dejado listo, sin ejecutar, a la espera de confirmación explícita. **Estado final: `IN PROGRESS`**, no `DONE`, por los dos pendientes de infraestructura/versionado reales (migración, commit inicial) — ninguna validación de código falló. Detalle completo en `docs/engineering/EWO-003_COMPANY_REPORT.md` sección 14.                                            | Responsable de producto de ContaIA (orden de cierre) / Claude Code (implementación)         |
| 2026-07-19 | Primer commit del repositorio (mismo día, cuarta sesión), tras autorización explícita del responsable de producto y reconfirmación previa (`git status`, `pnpm run check` verde, `prisma validate`/`generate`, revisión de secretos: `.env`/`.env.local` correctamente ignorados, solo `.env.example` con placeholders). Se descubrió y corrigió de raíz un defecto pre-existente que impedía cualquier commit: el hook `pre-commit` (Husky + lint-staged) nunca había funcionado porque invocaba `eslint` desde la raíz del monorepo, donde no se resuelve (sin `eslint.config.*` de raíz y sin `eslint` como dependencia de raíz) — se agregó `scripts/lint-staged-eslint.mjs` (ESLint por-workspace) y se reconfiguró `lint-staged`. Commit **`756358d`** (`feat: establish ContaIA foundation and company management`, 322 archivos), con hooks `pre-commit` y `commit-msg` activos y en verde (sin `--no-verify`). Sin push, sin PR, sin reescritura de historia. `pnpm run check` re-ejecutado sobre el estado comiteado (reformateado por Prettier): verde. **Estado formal de EWO-003: `BLOCKED`** — único criterio pendiente: la migración inicial real de Prisma, que requiere Docker/PostgreSQL no disponible en este entorno. EWO-004 no se inició. Detalle completo en `docs/engineering/EWO-003_COMPANY_REPORT.md` sección 15. | Responsable de producto de ContaIA (autorización del commit) / Claude Code (implementación) |

## 27. Historial de reorganización documental

> Esta sección registra los eventos de renumeración y reubicación de archivos en `docs/` que afectan la organización documental del proyecto, sin alterar el contenido técnico, las decisiones arquitectónicas ni las reglas de negocio de ningún documento. Es el registro central recomendado desde `docs/02_USER_PERSONAS.md` en ausencia de `docs/00_DOCUMENTATION_INDEX.md`.

### 27.1 Contexto general

A lo largo del Architecture Workflow (AWO-001 a AWO-014), la numeración de `docs/` se ajustó repetidamente conforme cada nuevo documento técnico ocupaba una posición ya asignada a un marcador de estructura vacío del esqueleto inicial del proyecto (por ejemplo, `docs/13_SECURITY.md`, `docs/17_UI_UX_DESIGN.md`, `docs/18_TESTING_STRATEGY.md`, `docs/23_RAG_ARCHITECTURE.md`, entre otros). Cada uno de esos eventos está documentado con su propio detalle (motivo, alternativas descartadas, referencias corregidas) en la nota de numeración y la sección "Observaciones del Arquitecto" del documento que provocó el ajuste — este historial no los repite en detalle; remite a la fuente original de cada uno para no arriesgar imprecisión al resumir eventos ya registrados en otro lugar.

### 27.2 Evento registrado: reubicación de `docs/19_DEVOPS.md`

| Campo             | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fecha             | 2026-07-18                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Motivo            | La fase de implementación del Architecture Workflow requiere la secuencia `docs/19` a `docs/24` para seis documentos de planeación de implementación (sección 27.3). `docs/19_DEVOPS.md` — un marcador de estructura vacío, sin contenido técnico — ocupaba la posición `docs/19`, en conflicto con `docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`.                                                                                                                                                                                                                                 |
| Documento origen  | `docs/19_DEVOPS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Documento destino | `docs/25_DEVOPS.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Impacto           | Ninguno sobre contenido técnico, arquitectura o reglas de negocio — el archivo reubicado seguía siendo un marcador vacío (12 líneas, sin desarrollo). Se actualizaron las referencias cruzadas existentes en `docs/07_SOFTWARE_ARCHITECTURE.md`, `docs/09_DATABASE_DESIGN.md` y `docs/11_SECURITY_ARCHITECTURE.md` (siete referencias en total) para apuntar a la nueva ruta. Ningún documento de las categorías protegidas (Design System, Information Architecture, UX Flows, Wireframes, Prototype Specification, UI Specification, PRD, Reglas de Negocio) fue modificado. |
| Realizado bajo    | Maintenance Work Order — Reorganización de numeración de documentos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### 27.3 Nueva numeración oficial (`docs/19` a `docs/25`)

| Posición  | Documento                               | Estado                                                              |
| --------- | --------------------------------------- | ------------------------------------------------------------------- |
| `docs/19` | `FRONTEND_IMPLEMENTATION_PLAN.md`       | Reservado — a crear en una fase posterior del Architecture Workflow |
| `docs/20` | `BACKEND_IMPLEMENTATION_PLAN.md`        | Reservado — a crear en una fase posterior                           |
| `docs/21` | `DATABASE_MIGRATION_PLAN.md`            | Reservado — a crear en una fase posterior                           |
| `docs/22` | `INFRASTRUCTURE_IMPLEMENTATION_PLAN.md` | Reservado — a crear en una fase posterior                           |
| `docs/23` | `TESTING_AND_QA_PLAN.md`                | Reservado — a crear en una fase posterior                           |
| `docs/24` | `RELEASE_PLAN.md`                       | Reservado — a crear en una fase posterior                           |
| `docs/25` | `DEVOPS.md`                             | Existente — marcador de estructura vacío, reubicado en este evento  |

**Advertencia de consistencia registrada:** al momento de este evento, las posiciones `docs/20` a `docs/24` ya están ocupadas por otros marcadores de estructura vacíos preexistentes (`docs/20_LOCAL_DEVELOPMENT.md`, `docs/21_LEGAL_COMPLIANCE.md`, `docs/22_GLOSSARY.md`, `docs/23_RAG_ARCHITECTURE.md`, `docs/24_TESTING_STRATEGY.md`). Este Maintenance Work Order **no** las reubicó, por estar fuera del alcance explícito de sus tareas (limitadas a `docs/19_DEVOPS.md`). Cada una deberá reubicarse siguiendo el mismo criterio, en el momento en que el Architecture Workflow solicite la posición correspondiente — patrón ya aplicado de forma consistente en AWO-007, AWO-012, AWO-013 y AWO-014.

### 27.4 Política oficial de gestión de colisiones de numeración

> Adoptada el 2026-07-18, por instrucción directa del responsable de producto. Sustituye, hacia adelante, la práctica anterior de resolver cada colisión caso por caso dentro de la propia Work Order que la detectaba.

**Objetivo:** garantizar la continuidad del Architecture Workflow sin interrumpir el desarrollo por colisiones de numeración.

**Reglas:**

1. Los documentos pertenecientes al Architecture Workflow (la serie numerada que constituye la única fuente de verdad técnica) tienen prioridad sobre documentos auxiliares (marcadores de estructura del esqueleto inicial del proyecto, sin contenido técnico desarrollado).
2. Un documento auxiliar que ocupe una posición requerida por el Architecture Workflow se reubica al siguiente bloque libre destinado a documentación complementaria.
3. Al reubicar, Claude debe: renombrar el documento; actualizar todas las referencias internas que apunten a él; actualizar índices (si existen); actualizar el roadmap (si contiene referencias de numeración); actualizar dependencias declaradas en otros documentos; registrar el cambio en este historial (sección 27).
4. No es necesaria una Maintenance Work Order independiente para cada colisión individual, salvo que el cambio afecte una decisión arquitectónica (lo cual no ocurre en una simple reubicación de numeración, por definición — si ocurriera, dejaría de ser una colisión de numeración y pasaría a ser una decisión de alcance).
5. Toda Work Order futura del Architecture Workflow asume automáticamente la numeración oficial vigente después de cada reorganización, sin necesidad de que el responsable de producto la confirme de nuevo cada vez.

**Bloque reservado para el Architecture Workflow** (`docs/19` a `docs/24`):

| Posición  | Documento reservado                     | Estado a esta fecha                   |
| --------- | --------------------------------------- | ------------------------------------- |
| `docs/19` | `FRONTEND_IMPLEMENTATION_PLAN.md`       | **Ocupado** — completado bajo AWO-015 |
| `docs/20` | `BACKEND_IMPLEMENTATION_PLAN.md`        | Libre — reservado                     |
| `docs/21` | `DATABASE_MIGRATION_PLAN.md`            | Libre — reservado                     |
| `docs/22` | `INFRASTRUCTURE_IMPLEMENTATION_PLAN.md` | Libre — reservado                     |
| `docs/23` | `TESTING_AND_QA_PLAN.md`                | Libre — reservado                     |
| `docs/24` | `RELEASE_PLAN.md`                       | Libre — reservado                     |

**Evento: reorganización masiva del bloque reservado (2026-07-18)**

En aplicación inmediata de esta política, los cinco marcadores auxiliares que ocupaban el bloque reservado (detectados en la advertencia de la sección 27.3) se reubicaron en un solo evento, liberando `docs/20` a `docs/24` por completo:

| Documento original             | Nueva ubicación                | Motivo                                                                                 | Referencias actualizadas                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/20_LOCAL_DEVELOPMENT.md` | `docs/26_LOCAL_DEVELOPMENT.md` | Ocupaba una posición del bloque reservado para `BACKEND_IMPLEMENTATION_PLAN.md`        | Ninguna referencia cruzada viva encontrada fuera de su propio nombre de archivo                                                                                                                                                        |
| `docs/21_LEGAL_COMPLIANCE.md`  | `docs/27_LEGAL_COMPLIANCE.md`  | Ocupaba una posición del bloque reservado para `DATABASE_MIGRATION_PLAN.md`            | `MASTER_CONTEXT.md` (control del documento, sección 2), `docs/11_SECURITY_ARCHITECTURE.md` (control del documento)                                                                                                                     |
| `docs/22_GLOSSARY.md`          | `docs/28_GLOSSARY.md`          | Ocupaba una posición del bloque reservado para `INFRASTRUCTURE_IMPLEMENTATION_PLAN.md` | `MASTER_CONTEXT.md` (sección 24, Glosario inicial)                                                                                                                                                                                     |
| `docs/23_RAG_ARCHITECTURE.md`  | `docs/29_RAG_ARCHITECTURE.md`  | Ocupaba una posición del bloque reservado para `TESTING_AND_QA_PLAN.md`                | `docs/10_AI_ARCHITECTURE.md` (control del documento y tres menciones en el cuerpo y Observaciones)                                                                                                                                     |
| `docs/24_TESTING_STRATEGY.md`  | `docs/30_TESTING_STRATEGY.md`  | Ocupaba una posición del bloque reservado para `RELEASE_PLAN.md`                       | Ninguna referencia cruzada viva encontrada fuera de las notas históricas ya registradas en `docs/16`, `docs/18` y esta misma sección (preservadas sin cambio, por ser registro histórico de eventos ya ocurridos, no punteros activos) |

**Impacto:** ninguno sobre contenido técnico, arquitectura o reglas de negocio — los cinco archivos reubicados seguían siendo marcadores de estructura vacíos. Ningún documento de las categorías protegidas (Design System, Information Architecture, UX Flows, Wireframes, Prototype Specification, UI Specification, PRD, Reglas de Negocio) fue modificado. Realizado directamente al adoptar esta política (Regla 4 — no requiere Maintenance Work Order separada).

**Nota de alcance:** las referencias históricas a `docs/17_UI_UX_DESIGN.md` y `docs/18_TESTING_STRATEGY.md` (sus posiciones antes de AWO-013/014) que persisten en `docs/01_PRD.md`, `docs/02_USER_PERSONAS.md`, `docs/06_SYSTEM_WORKFLOWS.md`, `docs/08_API_DESIGN.md`, `docs/12_FRONTEND_ARCHITECTURE.md` y `docs/13_DESIGN_SYSTEM.md` **no** se corrigieron en este evento, por no formar parte del bloque reservado de esta política ni de la colisión que la originó. Quedan registradas como hallazgo pendiente para una limpieza de referencias dedicada.
