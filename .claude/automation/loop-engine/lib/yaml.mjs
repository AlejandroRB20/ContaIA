/**
 * Lector de un subconjunto restringido de YAML, sin dependencias.
 *
 * `queue.yaml` es un archivo versionado que escriben y leen personas, y la
 * arquitectura (§17.1) lo exige en YAML. Node no trae parser de YAML y la
 * misión prohíbe añadir dependencias que no sean imprescindibles, así que
 * se implementa **el subconjunto exacto que `queue.yaml` necesita** y nada
 * más.
 *
 * Soportado:
 *   - comentarios `#` de línea completa o al final de un escalar sin comillas
 *   - mapeos `clave: valor` y `clave:` + bloque anidado
 *   - secuencias `- escalar` y `- clave: valor` (mapeo dentro de secuencia)
 *   - escalares: cadenas (con o sin comillas), enteros, `true`/`false`,
 *     `null`/`~`, y las secuencias vacías en línea `[]` / mapeos `{}`
 *
 * NO soportado, y se rechaza con error de línea: anclas (`&`/`*`), etiquetas
 * (`!`), escalares de bloque (`|`, `>`), estilo de flujo con contenido
 * (`[a, b]`), documentos múltiples (`---`), claves complejas.
 *
 * Fallar ruidosamente es deliberado: un parser que "adivina" produciría un
 * contrato de tarjeta silenciosamente distinto del que la persona escribió.
 */

export class YamlParseError extends Error {
  constructor(message, lineNumber, rawLine) {
    super(`queue YAML línea ${lineNumber}: ${message}\n  > ${rawLine}`);
    this.name = 'YamlParseError';
    this.code = 'YAML_PARSE_ERROR';
    this.lineNumber = lineNumber;
  }
}

const UNSUPPORTED = [
  { test: /^\s*---\s*$/, why: 'documentos múltiples no soportados' },
  { test: /^\s*[^#]*:\s*[|>][-+]?\s*$/, why: 'escalares de bloque (| >) no soportados' },
  { test: /^\s*[^#]*:\s*&\S+/, why: 'anclas (&) no soportadas' },
  { test: /^\s*[^#]*:\s*\*\S+/, why: 'alias (*) no soportados' },
  { test: /^\s*[^#]*:\s*!\S+/, why: 'etiquetas (!) no soportadas' },
  { test: /^\s*[^#]*:\s*\[\s*[^\]\s]/, why: 'secuencias en estilo de flujo con contenido no soportadas' },
];

function stripComment(text) {
  // Sólo se quita un `#` que empiece un comentario, no uno dentro de comillas.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(text[i - 1]))) {
      return text.slice(0, i);
    }
  }
  return text;
}

function parseScalar(raw, lineNumber, rawLine) {
  const text = stripComment(raw).trim();
  if (text === '') return '';
  if (text === '[]') return [];
  if (text === '{}') return {};
  if (text === 'null' || text === '~') return null;
  if (text === 'true') return true;
  if (text === 'false') return false;

  const quoted = /^"(.*)"$|^'(.*)'$/s.exec(text);
  if (quoted) return quoted[1] ?? quoted[2] ?? '';

  if (/^-?\d+$/.test(text)) return Number.parseInt(text, 10);
  if (/^-?\d+\.\d+$/.test(text)) return Number.parseFloat(text);

  if (/^[&*!]/.test(text)) {
    throw new YamlParseError('anclas, alias y etiquetas no soportadas', lineNumber, rawLine);
  }
  return text;
}

/** Líneas significativas con su indentación, comentarios y vacías descartadas. */
function tokenize(source) {
  const lines = [];
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    if (/^\s*$/.test(rawLine) || /^\s*#/.test(rawLine)) return;

    for (const rule of UNSUPPORTED) {
      if (rule.test.test(rawLine)) throw new YamlParseError(rule.why, lineNumber, rawLine);
    }
    if (/\t/.test(rawLine.match(/^\s*/)[0])) {
      throw new YamlParseError('tabuladores no permitidos en la indentación', lineNumber, rawLine);
    }

    lines.push({
      indent: rawLine.match(/^ */)[0].length,
      content: rawLine.trim(),
      lineNumber,
      rawLine,
    });
  });
  return lines;
}

function parseBlock(lines, start, indent) {
  if (start >= lines.length) return [null, start];

  if (lines[start].content.startsWith('- ') || lines[start].content === '-') {
    return parseSequence(lines, start, indent);
  }
  return parseMapping(lines, start, indent);
}

function parseSequence(lines, start, indent) {
  const items = [];
  let i = start;

  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i];
    if (!line.content.startsWith('- ') && line.content !== '-') break;

    const inlineText = line.content === '-' ? '' : line.content.slice(2).trim();
    const childIndent = indent + 2;

    if (inlineText === '') {
      const [value, next] = parseBlock(lines, i + 1, childIndent);
      items.push(value);
      i = next;
      continue;
    }

    if (isMappingEntry(inlineText)) {
      // `- clave: valor` — el elemento es un mapeo cuya primera entrada va
      // en esta misma línea. Se reinyecta como línea sintética con la
      // indentación del bloque hijo para no duplicar la lógica de mapeo.
      const synthetic = [
        { indent: childIndent, content: inlineText, lineNumber: line.lineNumber, rawLine: line.rawLine },
        ...lines.slice(i + 1),
      ];
      const [value, consumed] = parseMapping(synthetic, 0, childIndent);
      items.push(value);
      i = i + consumed;
      continue;
    }

    items.push(parseScalar(inlineText, line.lineNumber, line.rawLine));
    i += 1;
  }

  return [items, i];
}

function isMappingEntry(text) {
  const match = /^(?:"[^"]*"|'[^']*'|[^:#]+):(?:\s|$)/.exec(text);
  return match !== null;
}

function parseMapping(lines, start, indent) {
  const map = {};
  let i = start;

  while (i < lines.length && lines[i].indent === indent) {
    const line = lines[i];
    if (line.content.startsWith('- ')) break;

    const separator = findKeySeparator(line.content);
    if (separator === -1) {
      throw new YamlParseError('se esperaba "clave: valor"', line.lineNumber, line.rawLine);
    }

    const rawKey = line.content.slice(0, separator).trim();
    const key = rawKey.replace(/^["'](.*)["']$/s, '$1');
    const rest = line.content.slice(separator + 1);
    const restTrimmed = stripComment(rest).trim();

    if (restTrimmed === '') {
      const childStart = i + 1;
      if (childStart < lines.length && lines[childStart].indent > indent) {
        const [value, next] = parseBlock(lines, childStart, lines[childStart].indent);
        map[key] = value;
        i = next;
      } else {
        map[key] = null;
        i += 1;
      }
      continue;
    }

    map[key] = parseScalar(rest, line.lineNumber, line.rawLine);
    i += 1;
  }

  return [map, i];
}

function findKeySeparator(content) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      const next = content[i + 1];
      if (next === undefined || next === ' ') return i;
    }
  }
  return -1;
}

/** Parsea el subconjunto soportado. Lanza `YamlParseError` con línea exacta. */
export function parseYaml(source) {
  const lines = tokenize(source);
  if (lines.length === 0) return {};
  const baseIndent = lines[0].indent;
  const [value, consumed] = parseBlock(lines, 0, baseIndent);
  if (consumed < lines.length) {
    const line = lines[consumed];
    throw new YamlParseError('indentación inconsistente', line.lineNumber, line.rawLine);
  }
  return value;
}
