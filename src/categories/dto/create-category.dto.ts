import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Work', description: 'Category Name', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
  @ApiPropertyOptional({
    example: 'Tasks related to work',
    description: 'Category description',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
  @ApiProperty({
    example: '#3B82F6',
    description: 'Category color in HEX format',
  })
  @IsHexColor()
  color: string;
}
