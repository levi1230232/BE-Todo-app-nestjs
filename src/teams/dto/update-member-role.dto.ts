import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { TeamMemberRole } from 'src/generated/prisma/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: TeamMemberRole,
    example: TeamMemberRole.ADMIN,
  })
  @IsEnum(TeamMemberRole)
  role: TeamMemberRole;
}
