import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ItemPedidoDto {
  @IsUUID('all', { message: 'Cada item necesita el id de un producto' })
  productoId!: string;

  @IsInt({ message: 'La cantidad tiene que ser un número entero' })
  @Min(1, { message: 'La cantidad tiene que ser al menos 1' })
  cantidad!: number;
}

export class CompradorDto {
  @IsString({ message: 'Falta el nombre del comprador' })
  @IsNotEmpty({ message: 'Falta el nombre del comprador' })
  @MaxLength(120, { message: 'El nombre es demasiado largo' })
  nombre!: string;

  @IsEmail({}, { message: 'El email del comprador no es válido' })
  email!: string;

  @IsOptional()
  @IsString({ message: 'El teléfono no es válido' })
  @MaxLength(40, { message: 'El teléfono es demasiado largo' })
  telefono?: string;
}

export class EnvioDto {
  @IsString({ message: 'Falta la dirección de entrega' })
  @IsNotEmpty({ message: 'Falta la dirección de entrega' })
  @MaxLength(200, { message: 'La dirección es demasiado larga' })
  direccion!: string;

  @IsString({ message: 'Falta la ciudad de entrega' })
  @IsNotEmpty({ message: 'Falta la ciudad de entrega' })
  @MaxLength(100, { message: 'La ciudad es demasiado larga' })
  ciudad!: string;

  @IsString({ message: 'Falta el código postal' })
  @IsNotEmpty({ message: 'Falta el código postal' })
  @MaxLength(20, { message: 'El código postal es demasiado largo' })
  codigoPostal!: string;
}

export class ConfirmarPedidoDto {
  @IsArray({ message: 'El pedido necesita una lista de items' })
  @ArrayMinSize(1, { message: 'El pedido necesita al menos un producto' })
  @ArrayMaxSize(50, { message: 'Un pedido puede tener hasta 50 productos' })
  @ValidateNested({ each: true, message: 'Cada item necesita productoId y cantidad' })
  @Type(() => ItemPedidoDto)
  items!: ItemPedidoDto[];

  @IsDefined({ message: 'Faltan los datos del comprador' })
  @ValidateNested({ message: 'Faltan los datos del comprador' })
  @Type(() => CompradorDto)
  comprador!: CompradorDto;

  @IsDefined({ message: 'Faltan los datos de entrega' })
  @ValidateNested({ message: 'Faltan los datos de entrega' })
  @Type(() => EnvioDto)
  envio!: EnvioDto;
}
