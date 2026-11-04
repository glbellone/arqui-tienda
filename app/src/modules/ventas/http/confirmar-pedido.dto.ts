import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class ItemPedidoDto {
  @IsUUID()
  productoId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class ConfirmarPedidoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  items!: ItemPedidoDto[];
}