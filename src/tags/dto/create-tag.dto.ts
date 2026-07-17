import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({
    example: 'Urgent',
    description: 'Tag name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Required when workspaceStyle is TEAM',
  })
  @IsOptional()
  @IsInt()
  teamId?: number;
  @ApiPropertyOptional({
    example: '#3B82F6',
    description: 'Tag color',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
