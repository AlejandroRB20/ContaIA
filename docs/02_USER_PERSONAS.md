# User Personas — ContaIA

## Control del documento

| Campo                                                | Valor                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Documento                                            | 02_USER_PERSONAS.md                                                                                        |
| Orden de trabajo                                     | WO-002                                                                                                     |
| Versión                                              | 1.0                                                                                                        |
| **Estado**                                           | **Draft v1.0**                                                                                             |
| Fecha de creación                                    | 2026-07-18                                                                                                 |
| Última actualización                                 | 2026-07-18                                                                                                 |
| Fuentes utilizadas                                   | `MASTER_CONTEXT.md`, `docs/00_PRODUCT_VISION.md`, `docs/01_PRD.md`                                         |
| Fuentes solicitadas pero inexistentes en el proyecto | `docs/00_DOCUMENTATION_INDEX.md`, `docs/00_DOCUMENTATION_GUIDE.md` — ver "Observaciones del Arquitecto"    |
| Documentos que este documento alimenta               | UX/UI, Arquitectura, IA, Reglas de negocio, Permisos, Dashboard, Roadmap funcional (`docs/03` a `docs/11`) |

> Nota: Este documento aún no debe usarse para programar. Es la referencia obligatoria de para quién se construye ContaIA.

---

## 1. Executive Summary

ContaIA sirve a un ecosistema de diez perfiles de usuario que se agrupan en cuatro roles funcionales: quienes **operan** la plataforma día a día (contadores, auxiliares), quienes **consumen** su resultado (empresas, directores financieros), quienes **controlan y revisan** (supervisores, auditores) y quienes la **sostienen desde dentro** (equipo interno de ContaIA) o la usan con fines de **aprendizaje** (estudiantes).

El MVP no está diseñado para todos con la misma profundidad: cuatro personas — Contador independiente, Despacho contable, Auxiliar contable y Empresa o negocio — son el núcleo que valida el ciclo de valor completo (cargar → organizar → contabilizar → consultar → entender). El resto participa con alcance secundario o de solo consulta, y el rol Estudiante permanece con prioridad no decidida (ver `docs/01_PRD.md`, sección 21).

Este documento reemplaza y amplía la primera versión de `docs/02_USER_PERSONAS.md`, incorporando Jobs To Be Done, barreras de adopción, necesidades funcionales/emocionales/técnicas, KPIs por perfil y recomendaciones accionables para UX, IA y Arquitectura.

---

## 2. Segmentación de usuarios

**Por relación con la plataforma:**

| Segmento                       | Personas                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Operadores directos            | Contador independiente, Auxiliar contable, Despacho contable (socio/encargado) |
| Consumidores de información    | Empresa o negocio, Director financiero o administrador                         |
| Control y revisión             | Especialista humano / Supervisor, Auditor                                      |
| Consulta especializada externa | Asesor fiscal                                                                  |
| Interno de plataforma          | Administrador interno de ContaIA                                               |
| Educativo                      | Estudiante de contaduría                                                       |

**Por prioridad de MVP** (heredada de `docs/01_PRD.md`, sección 6):

- **Primaria:** Contador independiente, Despacho contable, Auxiliar contable, Empresa o negocio.
- **Secundaria:** Director financiero, Especialista humano/Supervisor, Administrador interno de ContaIA.
- **Diferida (acceso de consulta):** Asesor fiscal, Auditor.
- **Pendiente de decisión de alcance:** Estudiante de contaduría.

**Por nivel tecnológico:** Alto (Auxiliar, Administrador interno, Estudiante) · Medio-alto (Contador independiente, Despacho, Director financiero) · Medio (Empresa, Supervisor, Asesor fiscal, Auditor).

---

## 3. Nota metodológica

Las personas de este documento son **hipótesis informadas**, construidas a partir de `MASTER_CONTEXT.md` y `docs/01_PRD.md`, no de investigación de campo validada. Herramientas actuales, escenarios y barreras de adopción son supuestos razonables sobre el mercado contable y fiscal mexicano. Deben validarse con entrevistas reales antes de congelar decisiones irreversibles de UX. Ningún dato fiscal, legal o normativo se presenta aquí como hecho verificado; solo como contexto de trabajo del usuario.

---

## 4. Personas principales

### 4.1 Contador independiente — Mariana, 34 años

**Biografía.** Ocho años de ejercicio independiente en una ciudad mediana, entre 15 y 25 clientes, principalmente personas físicas con actividad empresarial y pequeñas empresas.

**Jobs To Be Done.**

- Cuando recibo los CFDI de mis clientes cada mes, quiero organizarlos y convertirlos en pólizas rápidamente, para poder dedicar más tiempo a asesorar en vez de capturar.
- Cuando tengo una duda fiscal puntual, quiero una respuesta fundamentada de inmediato, para poder responder a mi cliente sin perder media hora buscando en fuentes oficiales.

**Objetivos.** Cumplir en tiempo y forma; reducir captura manual; mostrar trabajo ordenado y verificable a sus clientes.

**Responsabilidades.** Registro contable, revisión de CFDI, pólizas, estados financieros básicos, resolución de dudas fiscales de sus clientes.

**Motivaciones.** Crecer su cartera sin sacrificar calidad; proyectar una imagen profesional moderna; reducir el estrés de los cierres.

**Barreras de adopción.** Migrar historial de clientes a una plataforma nueva; desconfianza inicial en que la IA cometa un error fiscal; costo mensual adicional frente a sus herramientas actuales.

**Necesidades funcionales.** Carga y lectura rápida de CFDI; captura ágil de pólizas; balanza y estados financieros confiables; respuestas fundamentadas a dudas frecuentes.

**Necesidades emocionales.** Sentir que la herramienta la respalda, no que la reemplaza; confianza de que ningún error pasa desapercibido; sensación de control frente a sus clientes.

**Necesidades técnicas.** Extracción estructurada de XML; cálculo determinístico verificable; historial de cambios por cliente.

**Nivel tecnológico.** Medio — cómoda con hojas de cálculo y software de escritorio; se adapta rápido si el beneficio es claro.

**Frecuencia de uso.** Diaria en periodos de cierre; varias veces por semana el resto del mes.

**Herramientas actuales (hipótesis).** Hojas de cálculo, sistema contable de escritorio o nube, portal del SAT para consultas, WhatsApp con clientes.

**Escenario de trabajo.** Casa u oficina propia, picos intensos en cierres mensuales, alterna entre varios clientes en la misma sesión.

**Pain points.** Captura repetitiva entre clientes; documentos dispersos; dificultad para interpretar XML rápido; falta de fuente rápida y confiable para dudas fiscales; trazabilidad débil frente a sus clientes.

**Oportunidades para ContaIA.** Es la persona de referencia para validar el ciclo de valor completo del MVP; la más sensible a la reducción real de tiempo y a la calidad del chat fundamentado.

**Funciones más utilizadas.** M4 (CFDI/XML), M5 (catálogo), M6 (pólizas), M7 (balanza), M8 (estados financieros), M9 (chat).

**Funciones menos utilizadas.** M12 (no aplica), M10 (uso ocasional).

**KPIs por perfil.** % de tiempo de captura reducido por periodo; % de pólizas aprobadas sin corrección; % de respuestas del chat citadas con fuente y aceptadas sin escalar.

**Prioridad MVP.** Primaria. **Rol del sistema.** Contador.

---

### 4.2 Despacho contable (socio/encargado) — Roberto, 42 años

**Biografía.** Dirige un despacho pequeño con cuatro colaboradores (dos contadores, dos auxiliares) que atienden más de 60 empresas cliente en conjunto.

**Jobs To Be Done.**

- Cuando reviso el avance de mi equipo, quiero ver el estado de todas mis empresas cliente en un solo lugar, para detectar problemas antes de que lleguen al cliente.
- Cuando incorporo un colaborador, quiero asignarle acceso solo a las empresas que le corresponden, para mantener el control sin fricción.

**Objetivos.** Estandarizar el trabajo del equipo; visibilidad sin revisar todo manualmente; escalar sin perder control de calidad.

**Responsabilidades.** Asignación de trabajo, revisión de casos sensibles, relación con clientes clave, control de calidad del despacho.

**Motivaciones.** Crecer el despacho de forma ordenada; reducir el riesgo reputacional de errores; delegar con confianza.

**Barreras de adopción.** Resistencia de colaboradores acostumbrados a su forma actual de trabajar; curva de estandarización de procesos; migración de múltiples clientes a la vez.

**Necesidades funcionales.** Multiempresa con aislamiento estricto; asignación de roles por colaborador y empresa; vista agregada de avance; flujo de aprobación claro.

**Necesidades emocionales.** Confianza de que ningún error de su equipo pasa sin control; sensación de mando sin necesidad de microgestionar.

**Necesidades técnicas.** Permisos granulares por empresa y colaborador; trazabilidad de quién hizo qué y cuándo.

**Nivel tecnológico.** Medio-alto — suele decidir qué software usa todo el equipo.

**Frecuencia de uso.** Varias veces por semana, con revisiones puntuales diarias en cierres.

**Herramientas actuales (hipótesis).** Sistema contable compartido, hojas de cálculo de control interno, carpetas compartidas en la nube.

**Escenario de trabajo.** Oficina con su equipo, reuniones con clientes importantes, picos de carga en cierres simultáneos de múltiples clientes.

**Pain points.** Sin visibilidad centralizada del estado de cada cliente; dificultad para estandarizar entre colaboradores; riesgo de errores no detectados a tiempo.

**Oportunidades para ContaIA.** El módulo de multiempresa (M2) y el flujo de aprobación son directamente su propuesta de valor. Comprador clave para adopción por volumen.

**Funciones más utilizadas.** M2 (multiempresa), M1 (roles), M11 (trazabilidad y alertas), M6 (aprobación), M8 (estados financieros de sus clientes).

**Funciones menos utilizadas.** M4 (delegado a auxiliares), M10 (uso indirecto).

**KPIs por perfil.** Empresas gestionadas por colaborador; tiempo de detección de errores; retención del despacho como cuenta.

**Prioridad MVP.** Primaria. **Rol del sistema.** Administrador (nivel cuenta) + Contador.

---

### 4.3 Auxiliar contable — Daniela, 26 años

**Biografía.** Trabaja para un despacho o directamente para una empresa; su día se concentra en captura, organización documental y apoyo en conciliaciones.

**Jobs To Be Done.**

- Cuando cargo los documentos del mes, quiero que el sistema extraiga los datos automáticamente y avise de inconsistencias, para avanzar rápido sin errores que corregir después.

**Objetivos.** Completar su carga diaria eficientemente; evitar retrabajo; crecer hacia un rol de mayor responsabilidad.

**Responsabilidades.** Carga y organización documental, captura de pólizas en borrador, apoyo en conciliación, seguimiento de pendientes.

**Motivaciones.** Ser reconocida por su trabajo; reducir tareas tediosas; avanzar profesionalmente.

**Barreras de adopción.** Percepción de que la herramienta la reemplace en vez de apoyarla; temor a que el cambio de proceso aumente su carga inicial.

**Necesidades funcionales.** Carga rápida de documentos; extracción automática de datos de CFDI; alertas claras de pendientes.

**Necesidades emocionales.** Sentirse apoyada, no vigilada ni reemplazada; confianza de que su trabajo se valora.

**Necesidades técnicas.** Validación automática de campos incompletos; retroalimentación inmediata de errores.

**Nivel tecnológico.** Medio-alto — suele adoptar atajos digitales primero en su equipo.

**Frecuencia de uso.** Diaria.

**Herramientas actuales (hipótesis).** Sistema contable del despacho/empresa, hojas de cálculo, mensajería para pedir documentos faltantes.

**Escenario de trabajo.** Oficina, jornada estructurada, alto volumen de documentos por periodo.

**Pain points.** Captura repetitiva; dificultad para saber qué falta o está mal clasificado; falta de retroalimentación inmediata antes de la revisión de su superior.

**Oportunidades para ContaIA.** Alertas básicas (M11) y extracción automática (M4) reducen directamente su carga operativa.

**Funciones más utilizadas.** M3 (documental), M4 (CFDI/XML), M6 (captura en borrador), M11 (alertas).

**Funciones menos utilizadas.** M9 avanzado, M12, M10.

**KPIs por perfil.** Tiempo promedio de captura por documento; tasa de alertas resueltas; % de pólizas en borrador aceptadas sin corrección.

**Prioridad MVP.** Primaria. **Rol del sistema.** Auxiliar.

---

### 4.4 Empresa o negocio (dueño/representante) — Fernanda, 39 años

**Biografía.** Dueña de un negocio pequeño-mediano; no es contadora, delega la contabilidad, pero quiere entender su propia situación financiera.

**Jobs To Be Done.**

- Cuando quiero saber cómo va mi negocio, quiero un resumen claro sin tecnicismos, para tomar decisiones sin depender por completo de que mi contador me lo explique.

**Objetivos.** Entender su negocio con claridad; confiar en que su información está en orden; decidir con información, no con incertidumbre.

**Responsabilidades.** Provee documentos e información; aprueba decisiones relevantes; revisa reportes periódicamente.

**Motivaciones.** Sentir control sobre su negocio; evitar sorpresas fiscales; decidir mejor.

**Barreras de adopción.** Desconfianza en compartir información financiera sensible en una plataforma nueva; percepción de que es "para contadores", no para ella.

**Necesidades funcionales.** Reportes claros y accesibles; respuestas simples a preguntas sobre su propio negocio.

**Necesidades emocionales.** Sentirse en control, no abrumada; confianza de que su información está protegida.

**Necesidades técnicas.** Ninguna directa — depende de que la complejidad quede oculta detrás de una interfaz simple.

**Nivel tecnológico.** Variable, típicamente medio — cómoda con apps cotidianas, no con herramientas contables técnicas.

**Frecuencia de uso.** Esporádica — fin de mes o antes de una decisión importante.

**Herramientas actuales (hipótesis).** App bancaria de su negocio, WhatsApp con su contador, hojas de cálculo simples o ninguna.

**Escenario de trabajo.** Revisiones puntuales, frecuentemente desde el celular.

**Pain points.** Lenguaje técnico incomprensible; dependencia total de su contador; falta de visibilidad en tiempo real.

**Oportunidades para ContaIA.** Los niveles de explicación de contenido de `MASTER_CONTEXT.md` (sección 18) son clave; valida directamente el principio de simplicidad (10.7).

**Funciones más utilizadas.** M8 (estados financieros), M9 (chat, nivel simple), M3 (para subir sus propios documentos).

**Funciones menos utilizadas.** M5, M6, M10 — delegadas a su contador.

**KPIs por perfil.** Frecuencia de consulta de reportes; % de preguntas resueltas sin escalar al contador; satisfacción percibida de claridad.

**Prioridad MVP.** Primaria. **Rol del sistema.** Administrador (propietario) — ver actualización de modelo de roles en `docs/01_PRD.md`, sección 11 (2026-07-18): Empresa dejó de ser un rol y pasó a ser la entidad de dominio; el dueño del negocio es un usuario con rol Administrador marcado como propietario.

---

## 5. Personas secundarias

### 5.1 Director financiero o administrador — Luis, 45 años

Dirige el área administrativa de una empresa mediana; consume información, no la captura.

- **JTBD:** Cuando necesito reportar a dirección, quiero indicadores confiables y oportunos, para justificar decisiones con datos sólidos, no con estimaciones.
- **Motivaciones / barreras.** Motivación: decidir con confianza. Barrera: dependencia de que el área contable le entregue reportes a tiempo.
- **Necesidades funcionales / emocionales / técnicas.** Reportes en tiempo real; sentirse respaldado ante dirección; indicadores calculados de forma determinística.
- **Nivel tecnológico / frecuencia.** Medio-alto / semanal-mensual, con picos en cierres.
- **Pain points.** Reportes tardíos; falta de contexto detrás de las cifras.
- **Funciones más usadas:** M7, M8, M9 (interpretación de indicadores). **Menos usadas:** M3-M6.
- **KPIs:** tiempo entre cierre y disponibilidad de reportes.
- **Prioridad MVP.** Secundaria. **Rol:** Administrador (nivel empresa, no propietario).

### 5.2 Especialista humano que revisa (Supervisor) — Alejandro, 50 años

Contador senior o especialista que aprueba o rechaza casos sensibles y respuestas de IA de alto riesgo.

- **JTBD:** Cuando un caso se marca como sensible, quiero ver rápidamente su fundamento y evidencia, para aprobar o rechazar con criterio profesional documentado.
- **Motivaciones / barreras.** Motivación: prevenir errores costosos. Barrera: exceso de casos marcados si el sistema es demasiado conservador.
- **Necesidades funcionales / emocionales / técnicas.** Cola clara de pendientes de revisión; confianza de que nada sensible pasa sin su criterio; evidencia accesible sin reconstrucción manual.
- **Nivel tecnológico / frecuencia.** Medio / bajo demanda, según volumen de casos marcados.
- **Pain points.** Falta de un lugar único para ver pendientes; dificultad para verificar fundamento rápido.
- **Funciones más usadas:** M11, M6 (aprobación), M9 (revisión de respuestas marcadas). **Menos usadas:** M3, M4.
- **KPIs:** tiempo promedio de revisión por caso; % de casos rechazados vs. aprobados.
- **Prioridad MVP.** Secundaria. **Rol:** Supervisor.

### 5.3 Administrador interno de ContaIA — Sofía, 30 años

Equipo interno de soporte y operaciones de la plataforma, no cliente.

- **JTBD:** Cuando un cliente reporta una incidencia, quiero acceder a lo estrictamente necesario con motivo registrado, para resolverla sin comprometer la confianza del cliente.
- **Motivaciones / barreras.** Motivación: dar buen servicio sin comprometer seguridad. Barrera: curva de aprendizaje del panel interno.
- **Necesidades funcionales / emocionales / técnicas.** Panel con visibilidad agregada; sentirse respaldada por un proceso claro de acceso; registro auditado de cada intervención.
- **Nivel tecnológico / frecuencia.** Alto / diaria.
- **Pain points.** Acceso a datos de clientes sin proceso claro de justificación.
- **Funciones más usadas:** M12, M11. **Menos usadas:** todos los módulos operativos del cliente (solo indirectamente).
- **KPIs:** tiempo de resolución de incidencias; % de accesos con motivo registrado (meta: 100%).
- **Prioridad MVP.** Secundaria. **Rol:** Administrador (nivel plataforma).

### 5.4 Asesor fiscal — Patricia, 41 años

Colabora con contadores/despachos en casos de mayor complejidad fiscal, sin llevar la contabilidad operativa.

- **JTBD:** Cuando me consultan un caso fiscal, quiero verificar rápido si existe fundamento vigente y confiable, para dar una recomendación que proteja mi reputación profesional.
- **Motivaciones / barreras.** Motivación: asesoría bien fundamentada. Barrera: percepción de cobertura insuficiente dado el alcance curado del MVP.
- **Necesidades funcionales / emocionales / técnicas.** Chat con fuente y vigencia citadas; confianza en la fuente, no solo en la respuesta.
- **Nivel tecnológico / frecuencia.** Medio / bajo demanda.
- **Pain points.** Dispersión de fuentes normativas; dificultad para verificar vigencia rápido.
- **Funciones más usadas:** M9. **Menos usadas:** el resto de los módulos, fuera de su flujo de consulta en el MVP.
- **KPIs:** % de consultas con fundamento disponible.
- **Prioridad MVP.** Diferida — acceso de consulta. **Rol:** Contador (consulta).

### 5.5 Auditor — Jorge, 47 años

Revisa periódicamente consistencia y evidencia de la información contable.

- **JTBD:** Cuando reviso un ejercicio, quiero acceder a evidencia y trazabilidad sin reconstruirla manualmente, para emitir conclusiones respaldadas más rápido.
- **Motivaciones / barreras.** Motivación: conclusiones respaldadas por evidencia sólida. Barrera: percepción de cobertura insuficiente sin el módulo de auditoría formal (diferido).
- **Necesidades funcionales / emocionales / técnicas.** Historial completo y no alterable; confianza en la integridad del registro.
- **Nivel tecnológico / frecuencia.** Medio / periódica o por evento.
- **Pain points.** Reconstrucción manual de evidencia hoy.
- **Funciones más usadas:** M11, M7, M8 (consulta). **Menos usadas:** el resto.
- **KPIs:** tiempo de acceso a evidencia por caso.
- **Prioridad MVP.** Diferida — acceso de consulta. **Rol:** Auditor (rol de primera clase desde 2026-07-18; antes mapeado como Supervisor en consulta).

### 5.6 Estudiante de contaduría — Emiliano, 21 años

Busca herramientas prácticas complementarias a su formación académica.

- **JTBD:** Cuando estudio un tema contable o fiscal, quiero un ejemplo práctico y seguro para experimentar, para entender cómo se aplica en la realidad, no solo en teoría.
- **Motivaciones / barreras.** Motivación: prepararse mejor profesionalmente. Barrera: alcance de su acceso en el MVP no está decidido.
- **Necesidades funcionales / emocionales / técnicas.** Entorno sandbox con datos simulados; sentirse libre de experimentar sin consecuencias; aislamiento total de datos reales.
- **Nivel tecnológico / frecuencia.** Alto / irregular, según ciclo académico.
- **Pain points.** Brecha entre teoría académica y práctica real.
- **Funciones más usadas (si se incluye):** M9 en modo educativo. **Menos usadas:** todo módulo sobre datos reales, por diseño.
- **KPIs:** uso recurrente del entorno educativo, si se habilita.
- **Prioridad MVP.** Baja / pendiente de decisión (ver sección 10). **Rol:** Estudiante.

---

## 6. Customer Journey (ciclo de vida comercial)

Descubrimiento → Evaluación (comparación con su método actual) → Decisión y alta de cuenta → Onboarding (primera empresa, primer catálogo) → Adopción activa (primer ciclo completo: carga → pólizas → estados financieros) → Retención (uso recurrente periodo tras periodo) → Expansión (más empresas, más colaboradores invitados) → Referencia (recomendación a otros contadores o despachos).

Este ciclo aplica de forma más completa a los operadores directos (Contador, Despacho); para Empresa y Director financiero, el ciclo comienza típicamente en la etapa de Onboarding, ya que llegan invitados por su contador.

## 7. User Journey (flujo dentro del producto)

Heredado y confirmado de `docs/01_PRD.md` (sección 8): Registro y activación → Configuración inicial (catálogo, invitación de colaboradores) → Operación diaria (carga, extracción, captura, aprobación) → Consulta y comprensión (balanza, estados financieros, chat, alertas) → Uso recurrente. Ninguna acción sensible ocurre sin revisión humana explícita (principio 10.2).

## 8. Casos de uso

1. Un contador independiente carga los XML de CFDI del mes y el sistema extrae y organiza los datos de cada comprobante.
2. Un contador revisa datos extraídos, los vincula a pólizas propuestas y las aprueba.
3. Un director financiero consulta balanza y estados financieros en tiempo real.
4. Un contador pregunta al chat el fundamento de un concepto y recibe fuente y vigencia, o una declaración honesta de límite de conocimiento.
5. Un despacho administra varias empresas con aislamiento total de datos entre ellas.
6. Un supervisor revisa una póliza sensible antes de que se contabilice.
7. Un auxiliar recibe una alerta de póliza descuadrada antes de continuar.
8. Un administrador interno da soporte con su acceso registrado y justificado.
9. Una empresa consulta su situación financiera en lenguaje simple desde el celular.
10. Un estudiante explora ejemplos prácticos en un entorno sandbox, sin acceso a datos reales.

## 9. Escenarios reales

**Lunes de cierre — Mariana.** Son las 9 a.m. y Mariana tiene que cerrar la contabilidad de tres clientes antes del viernes. Carga los CFDI acumulados de la semana; el sistema los organiza y le muestra dos con campos incompletos. Revisa esos dos, aprueba el resto como pólizas, y en veinte minutos tiene la balanza actualizada de un cliente — trabajo que antes le tomaba toda la mañana.

**Onboarding de un despacho — Roberto.** Roberto decide probar ContaIA con cinco de sus clientes más activos. Da de alta las cinco empresas, invita a sus dos contadores y les asigna acceso solo a las empresas que les corresponden. Al final de la semana, revisa desde un solo lugar el avance de cada empresa sin haber preguntado a nadie directamente.

**Fernanda revisa su negocio desde el celular.** Antes de decidir si contratar a un empleado más, Fernanda abre ContaIA desde su teléfono, consulta el estado de resultados del último trimestre en lenguaje simple, y le pregunta al chat qué significa una variación que no entiende. Recibe una explicación clara y, para el detalle técnico, una nota de que debe confirmarlo con su contador.

**Daniela resuelve alertas antes de la reunión de las 10 a.m.** Daniela llega a su turno y ve dos alertas: una póliza descuadrada y un documento sin clasificar. Las resuelve en diez minutos, antes de que su superior las revise en la reunión matutina de seguimiento.

## 10. Matriz comparativa

| Persona                | Objetivo principal                 | Dolor principal                   | Barrera de adopción                | Prioridad MVP | Rol del sistema                | Revisión humana    | Agente(s) de IA                                   | Frecuencia          |
| ---------------------- | ---------------------------------- | --------------------------------- | ---------------------------------- | ------------- | ------------------------------ | ------------------ | ------------------------------------------------- | ------------------- |
| Contador independiente | Reducir captura sin perder control | Tiempo perdido en captura         | Desconfianza inicial en la IA      | Primaria      | Contador                       | Alta               | Contable, Fiscal, CFDI/XML, Supervisor de calidad | Diaria en cierres   |
| Despacho contable      | Estandarizar y controlar           | Falta de visibilidad centralizada | Resistencia del equipo al cambio   | Primaria      | Administrador + Contador       | Alta               | Contable, Supervisor de calidad                   | Varias veces/semana |
| Auxiliar contable      | Captura eficiente                  | Captura repetitiva                | Temor a ser reemplazada            | Primaria      | Auxiliar                       | Indirecta          | CFDI/XML, Contable                                | Diaria              |
| Empresa o negocio      | Entender su negocio                | Lenguaje técnico                  | Desconfianza en compartir datos    | Primaria      | Administrador (propietario)    | Baja               | Contable, Fiscal (simple)                         | Esporádica          |
| Director financiero    | Decisiones con datos               | Reportes tardíos                  | Dependencia del área contable      | Secundaria    | Administrador (no propietario) | Baja               | Contable                                          | Semanal-mensual     |
| Supervisor             | Prevenir errores sensibles         | Revisión sin rastro               | Exceso de casos marcados           | Secundaria    | Supervisor                     | Es quien la ejerce | Supervisor de calidad                             | Bajo demanda        |
| Administrador interno  | Soporte seguro                     | Acceso sin proceso claro          | Curva de aprendizaje del panel     | Secundaria    | Administrador (plataforma)     | Alta               | Ninguno directo                                   | Diaria              |
| Asesor fiscal          | Asesoría fundamentada              | Fuentes dispersas                 | Cobertura curada limitada          | Diferida      | Contador (consulta)            | Media              | Fiscal, Supervisor de calidad                     | Bajo demanda        |
| Auditor                | Verificar evidencia                | Reconstrucción manual             | Sin módulo de auditoría formal aún | Diferida      | Auditor                        | Media              | Ninguno directo                                   | Periódica           |
| Estudiante             | Aprender aplicando                 | Brecha teoría-práctica            | Alcance MVP no decidido            | Pendiente     | Estudiante                     | Ninguna            | Contable, Fiscal (educativo)                      | Irregular           |

### Necesidades compartidas

Confiabilidad y exactitud (10.1); seguridad y aislamiento entre empresas (10.6); simplicidad y lenguaje claro (10.7); trazabilidad (10.8); honestidad de la IA (10.10).

### Necesidades exclusivas

Ver sección de "Necesidades funcionales/emocionales/técnicas" de cada persona (secciones 4 y 5); las más distintivas son: reducción de fricción operativa (Contador, Auxiliar), visibilidad centralizada (Despacho), lenguaje no técnico (Empresa, Director financiero), cola de revisión con fundamento (Supervisor), acceso auditado (Administrador interno), cobertura fundamentada aunque limitada (Asesor fiscal, Auditor), aislamiento educativo total (Estudiante).

## 11. Recomendaciones

**Para UX.** Diseñar navegación adaptativa por rol (ya prevista en `MASTER_CONTEXT.md`, sección 18); minimizar clics en captura para Auxiliar y Contador; ofrecer un "modo simple" de lectura de reportes para Empresa y Director financiero; construir una vista dedicada de cola de revisión para Supervisor; diferenciar el onboarding entre operador, consumidor y perfil interno.

**Para IA.** Mantener el mismo motor de fundamentos pero variar el nivel de explicación según persona (técnico para Contador/Asesor fiscal, simple para Empresa, educativo para Estudiante); priorizar la calidad del Agente de CFDI/XML y el Agente contable — mayor impacto inmediato en Auxiliar y Contador — antes de expandir la profundidad del Agente fiscal.

**Para Arquitectura.** Diseñar el modelo de permisos desde el inicio alrededor de rol + empresa, dado que casi todas las personas dependen del aislamiento estricto; tratar la trazabilidad (M11) como capa transversal desde el primer sprint, no como funcionalidad añadida después; construir el panel administrativo interno (M12) con registro obligatorio de motivo desde el día uno.

## 12. Preguntas pendientes

1. ¿El rol Estudiante entra al MVP en versión sandbox limitada, o se difiere por completo? (Heredada de `docs/01_PRD.md`, sección 21, pregunta 1 — no resuelta aquí por afectar el alcance del MVP.)
2. ¿Se justifica dividir "Despacho contable" en sub-personas (socio/encargado vs. colaborador interno) en una futura versión?
3. ¿Se confirma el nivel de acceso de consulta propuesto para Asesor fiscal y Auditor en el MVP?

## 13. Historial de cambios

| Fecha      | Cambio                                                                                                                                                                                                                                                                                                                                    | Responsable                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 2026-07-18 | Primera versión (borrador simple, 10 personas).                                                                                                                                                                                                                                                                                           | Responsable de producto de ContaIA |
| 2026-07-18 | Reescritura completa bajo WO-002: se añaden Executive Summary, segmentación, JTBD, barreras de adopción, necesidades funcionales/emocionales/técnicas, KPIs por perfil, customer journey, user journey, escenarios reales y recomendaciones para UX/IA/Arquitectura. Estado marcado como Draft v1.0.                                      | Responsable de producto de ContaIA |
| 2026-07-18 | Actualización de referencias de rol bajo CEW-004: Fernanda (Empresa o negocio) pasa de rol "Empresa" a "Administrador (propietario)"; Luis (Director financiero) pasa a "Administrador (no propietario)"; Jorge (Auditor) pasa de "Supervisor (consulta)" a rol de primera clase "Auditor". Consistente con `docs/01_PRD.md`, sección 11. | Responsable de producto de ContaIA |

---

## Observaciones del Arquitecto

**Decisiones tomadas:**

- WO-002 designaba `docs/00_DOCUMENTATION_INDEX.md` y `docs/00_DOCUMENTATION_GUIDE.md` como fuente única de verdad, pero ninguno de los dos existe en el proyecto (verificado con búsqueda completa). Esto no cambia la visión ni el alcance del MVP, así que — conforme al flujo de trabajo autónomo vigente — se resolvió usando `MASTER_CONTEXT.md`, `docs/00_PRODUCT_VISION.md` y `docs/01_PRD.md` como fuente de verdad real, sin detenerme a pedir autorización.
- Se reescribió por completo `docs/02_USER_PERSONAS.md` en lugar de crear un archivo nuevo, porque WO-002 pide explícitamente ese mismo nombre de archivo con una estructura más completa; se trató como una actualización formal del borrador anterior (aún no aprobado), no como modificación de un documento ya aprobado.
- Se organizaron las diez personas en 4 principales + 6 secundarias, siguiendo la priorización ya establecida en `docs/01_PRD.md` (sección 6), para no inventar una nueva jerarquía de negocio.
- Se separaron explícitamente Customer Journey (ciclo comercial) y User Journey (flujo de producto) como pide WO-002, evitando que se confundieran en una sola sección como en la versión anterior.

**Riesgos detectados:**

- La ausencia de `DOCUMENTATION_INDEX` y `DOCUMENTATION_GUIDE` sugiere que el proyecto espera, en algún momento, un índice y una guía de navegación de toda la documentación — su ausencia podría volverse un problema real conforme crezca `docs/` más allá de sus 17 documentos actuales.
- Los KPIs por perfil son propuestas razonables, no compromisos validados; usarlos como métricas de éxito definitivas sin contrastarlos con datos reales de uso podría llevar a decisiones de producto mal calibradas.
- El rol Estudiante sigue sin resolución de alcance; cualquier trabajo de UX/IA que avance sobre esta persona antes de esa decisión corre el riesgo de tener que rehacerse.

**Mejoras recomendadas para el futuro (fuera del alcance de la fase actual):**

- Crear `docs/00_DOCUMENTATION_INDEX.md` (mapa de todos los documentos y su propósito) y `docs/00_DOCUMENTATION_GUIDE.md` (cómo navegar y mantener la documentación), ya que varios work orders ya asumen su existencia. Se registra como mejora futura por decisión explícita del responsable de producto (2026-07-18): no se crean en esta fase.
- Validar las personas principales (Mariana, Roberto, Daniela, Fernanda) con entrevistas reales antes de que `docs/17_UI_UX_DESIGN.md` tome decisiones de interfaz irreversibles.
- Resolver la pregunta del alcance de Estudiante con el responsable de producto antes de iniciar cualquier diseño de UX relacionado con modo educativo.

**Documentos que podrían necesitar actualización:**

- `docs/01_PRD.md`: si se decide el alcance de Estudiante, cerrar su pregunta 1 (sección 21) y reflejarlo aquí también.
- `brain/QUESTIONS.md`: las preguntas de la sección 12 de este documento son candidatas a trasladarse ahí en una tarea futura.
- (Diferido) `docs/00_DOCUMENTATION_INDEX.md` y `docs/00_DOCUMENTATION_GUIDE.md` — creación pendiente, fuera de alcance por ahora (ver mejoras recomendadas arriba).
