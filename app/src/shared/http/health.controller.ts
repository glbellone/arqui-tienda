import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  estado() {
    return { estado: 'ok', celda: process.env.CELDA ?? 'local' };
  }
}
