import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetDeletedTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
