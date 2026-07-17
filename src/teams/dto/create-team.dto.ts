import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    example: 'Backend Team',
    description: 'Team name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Develop REST APIs with NestJS',
    required: false,
    description: 'Team description',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
