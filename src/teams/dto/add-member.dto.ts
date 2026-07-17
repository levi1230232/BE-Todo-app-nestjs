import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt } from 'class-validator';
import { TeamMemberRole } from 'src/generated/prisma/enums';

export class AddMemberDto {
  @ApiProperty({
    example: '1',
    description: 'Id of the user to add',
  })
  @IsInt()
  userId: number;

  // @IsEnum(TeamMemberRole)
  // role: TeamMemberRole;
}
