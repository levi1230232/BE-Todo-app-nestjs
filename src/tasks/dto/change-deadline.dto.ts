import { IsDateString } from 'class-validator';

export class ChangeDeadlineDto {
  @IsDateString()
  dueTo: Date;
}
