import { Injectable } from '@nestjs/common';
import type { Model, ModelStatic, Sequelize } from 'sequelize';

/** Define un modelo sobre la conexión que se le pasa (la de la app o la de administración). */
export type DefinirModelo = (sequelize: Sequelize) => ModelStatic<Model>;

/**
 * Registro de los modelos con aislamiento por tienda. Cada módulo registra los suyos al
 * arrancar; el núcleo compartido no conoce a ningún módulo de negocio.
 */
@Injectable()
export class ModelosPorTienda {
  private readonly definidores = new Set<DefinirModelo>();

  registrar(definir: DefinirModelo): void {
    this.definidores.add(definir);
  }

  todos(): DefinirModelo[] {
    return [...this.definidores];
  }
}
