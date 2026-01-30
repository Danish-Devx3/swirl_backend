import { IsInt, IsOptional, Min, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: 'The ID of the item to add' })
  @IsInt()
  @IsPositive()
  itemId: number;

  @ApiProperty({ example: 1, description: 'Quantity of the item', required: false, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}
