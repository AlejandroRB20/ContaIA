import { loadServerConfig, type ServerConfig } from '@contaia/config/server';
import { Global, Module } from '@nestjs/common';

export const SERVER_CONFIG = Symbol('SERVER_CONFIG');

/**
 * Expone la configuracion ya validada de @contaia/config/server como un
 * provider inyectable — ningun otro modulo de apps/api lee `process.env`
 * directamente (docs/20_BACKEND_IMPLEMENTATION_PLAN.md, "Application
 * Services": punto unico de lectura de configuracion).
 */
@Global()
@Module({
  providers: [
    {
      provide: SERVER_CONFIG,
      useFactory: (): ServerConfig => loadServerConfig(),
    },
  ],
  exports: [SERVER_CONFIG],
})
export class ConfigModule {}
