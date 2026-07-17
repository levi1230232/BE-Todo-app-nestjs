import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({
    description: 'ID of the task to which the comment belongs',
    example: 12,
  })
  @IsInt()
  taskId: number;
  @ApiProperty({
    description: 'Comment content',
    example: 'Please review the latest implementation.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
