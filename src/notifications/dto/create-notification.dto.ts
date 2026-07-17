import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { NotificationType } from './../../generated/prisma/enums';

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;

  @IsEnum(NotificationType)
  type: NotificationType;
  @IsInt()
  taskId?: number;
}
