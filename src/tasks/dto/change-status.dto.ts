import { IsEnum } from 'class-validator';
import { TaskStatus } from './../../generated/prisma/enums';

export class ChangeStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
