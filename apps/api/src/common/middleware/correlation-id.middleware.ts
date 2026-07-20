import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

/**
 * Genera o propaga el identificador de correlacion de cada solicitud
 * (docs/08_API_DESIGN.md seccion 4: "si el cliente no envia X-Correlation-Id,
 * el servidor genera uno y lo devuelve"). Se aplica antes que cualquier
 * filtro o interceptor para que ambos puedan leerlo desde `req.correlationId`.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('X-Correlation-Id');
  const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  next();
}
