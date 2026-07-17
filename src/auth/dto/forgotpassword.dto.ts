import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'example@gmail.com',
    description: 'The email address associated with the account.',
  })
  @IsEmail()
  email: string;
}
