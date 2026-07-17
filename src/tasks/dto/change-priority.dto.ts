import { IsEnum } from 'class-validator';
import { Priority } from 'src/generated/prisma/enums';

export class ChangePriorityDto {
  @IsEnum(Priority)
  priority: Priority;
}
