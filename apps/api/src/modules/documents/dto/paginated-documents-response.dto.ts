import { ApiProperty } from '@nestjs/swagger';

import { DocumentDetailResponseDto } from './document-detail-response.dto';

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

/** Respuesta de API-0024. Ver `documents.repository.ts` para el orden fijo (createdAt DESC, id DESC). */
export class PaginatedDocumentsResponseDto {
  @ApiProperty({ type: [DocumentDetailResponseDto] })
  items!: DocumentDetailResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
