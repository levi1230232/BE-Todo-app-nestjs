import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Priority,
  TaskStatus,
  WorkspaceStyle,
} from './../../generated/prisma/enums';

export class QueryTaskDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assignedTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  createBy?: number;

  @IsOptional()
  @IsEnum(WorkspaceStyle)
  workspaceStyle?: WorkspaceStyle;
}
