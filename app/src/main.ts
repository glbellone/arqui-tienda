import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './shared/http/problem-details.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const celda = process.env.CELDA ?? 'local';

  // Para la demo: cada respuesta dice qué celda la atendió.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Celda', celda);
    next();
  });

  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}

bootstrap();
