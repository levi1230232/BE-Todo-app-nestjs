import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateCommentDto {
  @ApiPropertyOptional({
    description: 'Updated comment content',
    example: 'The issue has been resolved.',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
