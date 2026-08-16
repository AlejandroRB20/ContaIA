# E5-S3-T05 — Auditoría final independiente

## Metadatos

| Campo              | Valor                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fecha              | 2026-08-01                                                                                                                                                                                                                                                                                                                                 |
| Auditor            | Codex                                                                                                                                                                                                                                                                                                                                      |
| Modelo             | No especificado en la evidencia proporcionada                                                                                                                                                                                                                                                                                              |
| Tipo               | Reauditoría final independiente `READ ONLY`                                                                                                                                                                                                                                                                                                |
| HEAD auditado      | `598aebe35f8eb0162158b1e59f6bc560b618019e`                                                                                                                                                                                                                                                                                                 |
| Alcance            | `E5-S3-T05` — Detección de CFDI 4.0 (`detectCfdiVersion`), Sprint 3 de Bloque E, EWO-005                                                                                                                                                                                                                                                   |
| Archivos revisados | `apps/api/src/modules/xml-processing/cfdi-40-extractor.ts`; `apps/api/src/modules/xml-processing/cfdi-extraction.errors.ts`; `apps/api/src/modules/xml-processing/cfdi-40-extractor.spec.ts`; `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §5.3ter; `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`; `AI_CONTEXT.md` |

## Veredicto

**PASSED**

## Alcance de la auditoría

La revisión evaluó el alcance declarado de `E5-S3-T05` sobre el HEAD indicado arriba: la implementación de `detectCfdiVersion(parsedXml)` como función pura que, sobre el árbol `preserveOrder` ya validado por `E5-S3-T04`, identifica la raíz `Comprobante`, resuelve su namespace efectivo por URI (nunca por prefijo textual), confirma la familia CFDI reconocida y compara `Version` exactamente contra `"4.0"` — sin extraer ningún dato fiscal (`UUID`, RFC, montos, conceptos, impuestos, TFD), responsabilidad de `E5-S3-T06`–`T09`.

Esta es una **reauditoría**: una auditoría previa sobre este mismo HEAD había resultado `FAILED` con un hallazgo `MEDIO` sobre la resolución de namespaces mediante propiedades heredadas.

## Evidencia utilizada

Veredicto literal emitido por la auditoría independiente `READ ONLY` de Codex sobre el HEAD auditado:

> **PASSED**
>
> `E5-S3-T05` cumple los criterios de detección estructural de CFDI 4.0 mediante namespace URI efectivo, resolución segura de ámbitos y propiedades propias, rechazo de prefijos no declarados, comparación exacta de `Version`, errores sanitizados y cobertura individual superior al 90 %. El hallazgo `MEDIO` previo queda `RESOLVED`. Puede crearse `E5-S3-T05_FINAL_AUDIT.md` y marcar `E5-S3-T05` como `PASSED`.

## Hallazgo sobre propiedades heredadas en `NamespaceScope`

La auditoría inicial sobre este HEAD había resultado `FAILED` con un hallazgo `MEDIO`: `resolveNamespacePrefix` consultaba `prefix in actual.bindings`, operador que también encuentra propiedades **heredadas** de `Object.prototype`. Una contaminación global de `Object.prototype.cfdi` con el URI oficial de CFDI 4.0 habría hecho que `<cfdi:Comprobante Version="4.0"/>` **sin** `xmlns:cfdi` declarado resolviera igual que un binding real, incumpliendo el rechazo obligatorio de prefijos no declarados.

### Corrección aplicada

- **`bindings` sin prototipo** — `extendNamespaceScope` construye el objeto de bindings con `Object.create(null)`, eliminando la cadena de prototipos desde su origen.
- **Comprobación de propiedad propia** — `resolveNamespacePrefix` consulta exclusivamente `Object.hasOwn(actual.bindings, prefix)`, nunca el operador `in`.
- **Rechazo confirmado con `Object.prototype` contaminado** — prueba dedicada de extremo a extremo (contamina `Object.prototype.cfdi` con el URI oficial, construye el árbol real `E5-S3-T04`→`E5-S3-T05` de un `Comprobante` sin `xmlns:cfdi`, invoca `detectCfdiVersion`, espera `CfdiExtractionError` con `code: 'CFDI_STRUCTURE_INVALID'`, restauración garantizada en `afterEach`), más pruebas unitarias adicionales contrastando propiedad heredada (nunca cuenta) contra propiedad propia (sí cuenta).

## Confirmación de los criterios auditados

- **Identidad por namespace URI efectivo** — el prefijo textual del elemento (`cfdi:`, alternativo, o namespace por defecto) nunca es criterio de identidad; solo el URI resuelto contra el ámbito real del documento determina si la raíz pertenece a la familia CFDI.
- **Rechazo de prefijos no declarados** — un prefijo nunca declarado en ningún ámbito ascendente, o contaminado únicamente por herencia de `Object.prototype`, se rechaza con `CFDI_STRUCTURE_INVALID`.
- **Comparación exacta de `Version`** — únicamente el string `"4.0"` se acepta; ninguna variante de formato (`"4"`, `"4.00"`, `"4 .0"`, `"v4.0"`) se normaliza.
- **Errores sanitizados** — clase única `CfdiExtractionError` con `code` discriminante (`CFDI_STRUCTURE_INVALID` | `UNSUPPORTED_CFDI_VERSION`); los mensajes no propagan namespace, versión, tag ni datos fiscales recibidos.
- **Cobertura individual superior al 90 %** — `cfdi-40-extractor.ts`: 97.56 % statements / 93.93 % branches / 100 % functions / 97.53 % lines; `cfdi-extraction.errors.ts`: 100 % en las cuatro dimensiones.
- **Alcance estrecho de `E5-S3-T05`** — el resultado (`CfdiRootElement`) no expone ningún dato fiscal extraído (`UUID`, RFC, montos, conceptos, impuestos, TFD); esos campos siguen siendo responsabilidad exclusiva de `E5-S3-T06`–`T09`.
- **`E5-S3-T06` no iniciada** — no existe ningún archivo propio de `E5-S3-T06` en el repositorio.

## Hallazgos

Un hallazgo de la auditoría previa sobre este mismo HEAD, **`RESOLVED`** tras la corrección:

| ID         | Severidad | Descripción                                                                                                                                                                                                                                                                                              | Estado     |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `H-T05-01` | `MEDIO`   | `resolveNamespacePrefix` usaba `prefix in bindings`, que también encuentra propiedades heredadas de `Object.prototype`. Una contaminación global de `Object.prototype.cfdi` con el URI oficial de CFDI 4.0 habría permitido resolver un prefijo `cfdi` nunca declarado en el XML como si fuera legítimo. | `RESOLVED` |

Corrección verificada en el commit `598aebe`: `bindings` construido con `Object.create(null)` y resolución vía `Object.hasOwn`, con pruebas de contaminación y de propiedad heredada/propia agregadas. No se detectaron hallazgos nuevos de ninguna severidad.

## Resultado

- **`E5-S3-T05` cumple su alcance declarado.** Identidad por namespace URI, comparación exacta de `Version`, sin extraer ningún dato fiscal fuera de alcance.
- **El hallazgo `MEDIO` previo queda `RESOLVED`**, sin hallazgos nuevos.
- **Cobertura individual verificada por archivo**, superando el 90 % exigido en las cuatro dimensiones.
- **Sin providers ni logging.** Función pura sin `@Injectable`, sin `Logger`, sin `console`.

## Conclusión

`E5-S3-T05` cumple el alcance de detección de CFDI 4.0 declarado y resuelve el hallazgo `MEDIO` de la auditoría previa sobre este mismo HEAD. Puede marcarse `E5-S3-T05` como `PASSED`. `E5-S3-T06` queda habilitada, no iniciada. Sprint 3 permanece `IN_PROGRESS`.

## Confirmación de independencia

- La conclusión se basa en inspección directa de los archivos indicados en el HEAD auditado.
- No se modificó código, pruebas, `schema.prisma`, migraciones ni arquitectura técnica durante esta auditoría.
- No se ejecutaron migraciones, SQL, `git add`, commits ni operaciones remotas.
