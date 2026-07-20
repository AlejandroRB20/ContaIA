# Visión del Producto — ContaIA

## Control del documento

| Campo                | Valor                                                  |
| -------------------- | ------------------------------------------------------ |
| Documento            | 00_PRODUCT_VISION.md                                   |
| Versión              | 0.1                                                    |
| Estado               | Borrador                                               |
| Fecha de creación    | 2026-07-18                                             |
| Última actualización | 2026-07-18                                             |
| Documento fuente     | `MASTER_CONTEXT.md` (secciones 4, 5, 8, 9, 10, 15, 20) |

> Nota: Este documento aún no debe usarse para programar. Desarrolla, con mayor detalle, la visión ya definida en `MASTER_CONTEXT.md`. Ante cualquier contradicción, `MASTER_CONTEXT.md` prevalece.

## Propósito de este documento

Explicar, en un solo lugar y con enfoque de producto, hacia dónde debe dirigirse ContaIA a largo plazo: qué problema resuelve, a quién sirve, qué la distingue y qué límites tiene. Este documento no define alcance de versión ni requisitos funcionales; eso corresponde a `docs/01_PRD.md` y `docs/03_ROADMAP.md`.

## Declaración de visión

Construir una de las plataformas contables y fiscales con inteligencia artificial más completas, confiables y fáciles de usar en México.

La plataforma deberá reducir tareas repetitivas, facilitar el cumplimiento, mejorar la calidad de la información financiera y ayudar a los usuarios a entender sus operaciones.

## Horizonte de la visión

Esta visión describe un destino de largo plazo, no el alcance de una primera versión. La forma en que el producto avanzará hacia esta visión está descrita por etapas en `MASTER_CONTEXT.md` (sección 16: Estrategia inicial del producto) y se detallará en `docs/03_ROADMAP.md`. No todo lo descrito en este documento estará disponible en el MVP.

`Estado: Propuesta pendiente de validación`

## Identidad del producto

**Nombre provisional:** ContaIA

**Categoría:** Plataforma SaaS mexicana de contabilidad, fiscalidad, administración empresarial e inteligencia artificial.

**Propuesta central:** ContaIA será un copiloto inteligente para contadores, despachos, empresas y estudiantes. Ayudará a organizar, analizar, automatizar y explicar procesos contables y fiscales de manera clara, verificable y segura.

**Aclaración fundamental:** ContaIA no sustituye el criterio profesional de un contador, fiscalista, auditor o abogado. Las operaciones sensibles deben incluir mecanismos de revisión y aprobación humana.

## A quién sirve

ContaIA está pensado para diez tipos de usuario, descritos con detalle en `MASTER_CONTEXT.md` (sección 8):

1. Contador independiente.
2. Despacho contable.
3. Empresa o negocio.
4. Director financiero o administrador.
5. Auxiliar contable.
6. Auditor.
7. Asesor fiscal.
8. Estudiante de contaduría.
9. Administrador interno de ContaIA.
10. Especialista humano que revisa respuestas o casos complejos.

## Problema central que resuelve

Hoy, el trabajo contable y fiscal en México suele estar fragmentado entre captura manual, documentos dispersos, sistemas complejos y fuentes de información normativa difíciles de interpretar. Esto genera errores, procesos lentos y falta de confianza en la información financiera. ContaIA busca unificar organización, automatización y explicación inteligente en un solo lugar, sin perder el control profesional humano sobre las decisiones sensibles.

El detalle completo de los quince problemas identificados está en `MASTER_CONTEXT.md` (sección 9).

## Propuesta de valor y diferenciadores

ContaIA combina tres elementos que hoy suelen estar fragmentados en herramientas separadas:

1. **Organización y automatización contable-fiscal**, para reducir captura manual y desorden documental.
2. **Inteligencia artificial que explica y fundamenta**, en lugar de solo responder: cuando corresponde, muestra fuente, artículo o regla, vigencia y ejercicio fiscal aplicable.
3. **Trazabilidad y control propios de un entorno profesional regulado**, con separación clara entre cálculo determinístico verificable e interpretación asistida por IA.

El diferenciador central no es "una IA que contesta preguntas fiscales", sino un sistema que deja siempre un rastro de auditoría revisable por un humano.

## Lo que ContaIA no es

Para evitar expectativas equivocadas desde la etapa de diseño, ContaIA:

- No es una autoridad fiscal.
- No garantiza automáticamente el cumplimiento.
- No sustituye asesoría profesional personalizada.
- No debe enviar declaraciones sin aprobación humana.
- No debe timbrar CFDI sin una integración autorizada.
- No debe simular una conexión real con el SAT cuando no exista.
- No debe presentar cálculos no validados como definitivos.

La lista completa de límites del producto está en `MASTER_CONTEXT.md` (sección 15).

## Principios que guían esta visión

Esta visión se apoya en los diez principios obligatorios definidos en `MASTER_CONTEXT.md` (sección 10): confiabilidad, revisión humana, IA con fundamentos, cálculos determinísticos, versionado normativo, seguridad y privacidad, simplicidad, trazabilidad, modularidad y honestidad de la IA. Ninguna decisión de producto derivada de este documento debe contradecir dichos principios.

## Cómo se sabrá que la visión se está cumpliendo

A nivel de visión, el avance se observará en tendencias generales como: tiempo ahorrado por proceso, reducción de errores, calidad de las respuestas con fuentes, satisfacción y retención de usuarios, y adopción por parte de despachos y empresas. El conjunto completo de indicadores preliminares, con su definición operativa, está en `MASTER_CONTEXT.md` (sección 20) y se desarrollará con mayor precisión en documentos posteriores.

`Estado: Propuesta pendiente de validación`

## Relación con otros documentos

- `MASTER_CONTEXT.md`: fuente de verdad de la que se deriva este documento; prevalece ante cualquier contradicción.
- `docs/01_PRD.md`: traducirá esta visión en requisitos concretos y alcance de versión.
- `docs/03_ROADMAP.md`: traducirá esta visión y las etapas de estrategia en un calendario de entregables.
- `docs/04_BUSINESS_RULES.md`: detallará las reglas de negocio necesarias para cumplir esta visión sin contradecir los límites del producto.

## Preguntas abiertas relacionadas con la visión

Estas preguntas ya están registradas en `MASTER_CONTEXT.md` (sección 25) y se listan aquí por su relevancia directa para este documento:

1. ¿Cuál será el alcance definitivo del MVP dentro de los ocho puntos listados en la Etapa 2 de la estrategia de producto?
2. ¿Qué indicadores de éxito, de los listados como preliminares, se adoptarán como métricas oficiales de seguimiento de esta visión?

## Historial de cambios

| Fecha      | Cambio                                                                                     | Responsable                        |
| ---------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| 2026-07-18 | Creación de la primera versión de `00_PRODUCT_VISION.md`, derivada de `MASTER_CONTEXT.md`. | Responsable de producto de ContaIA |
