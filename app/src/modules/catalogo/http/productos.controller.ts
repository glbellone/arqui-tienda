import { Body, Controller, ForbiddenException, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../../../shared/auth/auth.guard';
import { Roles } from '../../../shared/auth/roles.decorator';
import { UsuarioActual, type Usuario } from '../../../shared/auth/usuario';
import { ConsultarProductos } from '../application/consultar-productos';
import { CrearProducto } from '../application/crear-producto';
import type { Producto } from '../domain/producto';

interface CrearProductoBody {
  sku: string;
  nombre: string;
  precio: number;
  moneda?: string;
}

const aDto = (p: Producto) => ({
  id: p.id,
  tiendaId: p.tiendaId.valor,
  sku: p.sku.valor,
  nombre: p.nombre,
  precio: { monto: p.precio.monto, moneda: p.precio.moneda },
});

@Controller('v1/tiendas/:tiendaId/productos')
export class ProductosController {
  constructor(
    private readonly crearProducto: CrearProducto,
    private readonly consultarProductos: ConsultarProductos,
  ) {}

  /** Público: cualquier comprador puede ver el catálogo de una tienda. */
  @Get()
  async listar(@Param('tiendaId') tiendaId: string) {
    const productos = await this.consultarProductos.listar(tiendaId);
    return productos.map(aDto);
  }

  @Get(':productoId')
  async obtener(@Param('tiendaId') tiendaId: string, @Param('productoId') productoId: string) {
    return aDto(await this.consultarProductos.obtener(tiendaId, productoId));
  }

  /** Solo el dueño de esa tienda puede cargar productos en ella (regla de aislamiento). */
  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  @Roles('duenio')
  async crear(
    @Param('tiendaId') tiendaId: string,
    @Body() body: CrearProductoBody,
    @UsuarioActual() usuario: Usuario,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (usuario.tiendaId !== tiendaId) {
      throw new ForbiddenException('Solo podés cargar productos en tu propia tienda');
    }
    const producto = await this.crearProducto.ejecutar({ tiendaId, ...(body ?? {}) });
    res.location(`/v1/tiendas/${tiendaId}/productos/${producto.id}`);
    return aDto(producto);
  }
}
