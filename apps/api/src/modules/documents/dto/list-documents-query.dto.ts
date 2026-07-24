import { DocumentFileType, DocumentStatus } from '@contaia/database';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Ningun otro modulo del repositorio implementa paginacion todavia
 * (verificado: cero endpoints paginados existentes) — estos valores son
 * una decision nueva de este bloque, no una convencion copiada. Nombres de
 * parametro (`page`/`pageSize`) si son la convencion ya documentada
 * (docs/08_API_DESIGN.md seccion 12: "basada en pagina (?page=1&pageSize=20)"),
 * igual que el default de `pageSize=20` (mismo ejemplo). El maximo de
 * `pageSize` esta explicitamente "pendiente de validacion" en esa misma
 * seccion, que remite a docs/11_SECURITY_ARCHITECTURE.md — ese documento
 * no contiene ninguna mencion a "pageSize" ni "paginacion" (verificado,
 * cero coincidencias). No existe ninguna cifra maxima aprobada en ninguna
 * fuente normativa del repositorio. NO se inventa un limite: unicamente se
 * validan entero y minimo positivo. Limite maximo de pageSize pendiente de
 * definicion normativa — debe corregirse en una sesion futura junto con
 * documentacion y producto, no aqui.
 */
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

/**
 * Query de API-0024 (docs/08_API_DESIGN.md seccion 9.5). Filtros limitados
 * a `status`/`fileType` (unicos respaldados por el modelo `Document` para
 * este bloque). Sin campo de ordenamiento libre: el orden es fijo
 * (`createdAt DESC, id DESC`, ver `documents.repository.ts`) — el cliente
 * no puede elegirlo. `ValidationPipe` global (`forbidNonWhitelisted: true`)
 * rechaza cualquier query param no declarado aqui.
 */
export class ListDocumentsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    minimum: 1,
    default: DEFAULT_PAGE_SIZE,
    description:
      'Sin limite maximo aprobado todavia (docs/08_API_DESIGN.md seccion 12: pendiente de validacion normativa).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: DocumentStatus })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: DocumentFileType })
  @IsOptional()
  @IsEnum(DocumentFileType)
  fileType?: DocumentFileType;
}
