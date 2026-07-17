import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ArrayUnique,
  IsArray,
} from 'class-validator';
import {
  Priority,
  TaskStatus,
  WorkspaceStyle,
} from './../../generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    example: 'Deploy Backend',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'Deploy production server',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: TaskStatus,
    example: TaskStatus.PENDING,
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;
  @ApiProperty({
    enum: Priority,
    example: Priority.HIGH,
  })
  @IsEnum(Priority)
  priority: Priority;
  @ApiProperty({
    example: '2026-08-01T10:00:00.000Z',
  })
  @IsDateString()
  dueTo: Date;
  @ApiProperty({
    description: 'Remind how many minutes in advance',
    example: 30,
  })
  @IsInt()
  @Min(0)
  reminder: number;
  @ApiProperty({
    enum: WorkspaceStyle,
    example: WorkspaceStyle.PERSONAL,
  })
  @IsEnum(WorkspaceStyle)
  workspaceStyle: WorkspaceStyle;
  @ApiPropertyOptional({
    example: 2,
  })
  @IsOptional()
  @IsInt()
  teamId?: number;
  @ApiPropertyOptional({
    example: 5,
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    example: 7,
    description: 'ID of the person assigned the task',
  })
  @IsOptional()
  @IsInt()
  assignedTo?: number;
  // @ApiPropertyOptional({
  //   type: [Number],
  //   example: [1, 3, 5],
  // })
  // @IsOptional()
  // @IsArray()
  // @ArrayUnique()
  // @IsInt({ each: true })
  // tagIds?: number[];
}
