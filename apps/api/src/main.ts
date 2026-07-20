import 'reflect-metadata';

import { loadServerConfig } from '@contaia/config/server';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { csrfProtectionMiddleware } from './common/security/csrf.middleware';

async function bootstrap(): Promise<void> {
  const config = loadServerConfig();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(cookieParser());
  app.use(correlationIdMiddleware);
  app.use(csrfProtectionMiddleware);

  app.enableCors({
    origin: config.CORS_ORIGINS,
    credentials: true,
  });

  app.setGlobalPrefix(config.API_GLOBAL_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ContaIA API')
    .setDescription('API oficial de ContaIA. Contrato completo en docs/08_API_DESIGN.md.')
    .setVersion(config.APP_VERSION)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${config.API_GLOBAL_PREFIX}/docs`, app, swaggerDocument);

  // Apagado controlado: permite que los hooks OnModuleDestroy (por ejemplo,
  // la desconexion de Prisma) se ejecuten antes de que el proceso termine
  // (docs/20_BACKEND_IMPLEMENTATION_PLAN.md seccion 1: "cierre seguro de
  // conexiones").
  app.enableShutdownHooks();

  await app.listen(config.API_PORT);
  logger.log(
    `ContaIA API escuchando en el puerto ${config.API_PORT} (prefijo: /${config.API_GLOBAL_PREFIX}/v1, ambiente: ${config.NODE_ENV})`,
  );
}

void bootstrap();
