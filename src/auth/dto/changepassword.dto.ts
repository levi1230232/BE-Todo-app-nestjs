import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Password reset token received via email.',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewPassword123@',
    description: 'The new password.',
    minLength: 6,
  })
  @MinLength(6)
  password: string;
}
