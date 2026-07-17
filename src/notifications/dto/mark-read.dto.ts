import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class MarkReadDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  notificationIds: number[];
}
