import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnaliticaProcesadorService } from './analitica-procesador.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ANALYTICS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'analytics_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService,AnaliticaProcesadorService],
  exports: [AnalyticsService,AnaliticaProcesadorService], // Exportado por si VentasModule o CatalogoModule necesitan inyectarlo para emitir eventos
})
export class AnaliticaModule {}