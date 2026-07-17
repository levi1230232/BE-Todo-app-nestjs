import { IsBooleanString, IsNumberString, IsOptional } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional()
  @IsBooleanString()
  isRead?: string;

  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';
}
