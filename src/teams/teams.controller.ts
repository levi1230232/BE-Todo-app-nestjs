import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('teams')
@ApiBearerAuth()
@UseGuards(JwtGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  @ApiBody({ type: CreateTeamDto })
  @ApiResponse({
    status: 201,
    description: 'Team created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Team name already exists',
  })
  create(@Req() req, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all teams of current user' })
  @ApiResponse({
    status: 200,
    description: 'List of teams',
  })
  findAll(@Req() req) {
    return this.teamsService.findAll(req.user.id);
  }
  @ApiOperation({ summary: 'Get team detail' })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Team ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Team detail',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this team',
  })
  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.teamsService.findOne(+id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update team information' })
  @ApiParam({
    name: 'id',
    example: 1,
  })
  @ApiBody({
    type: UpdateTeamDto,
    examples: {
      example1: {
        summary: 'Update team',
        value: {
          name: 'Todo Backend Team',
          description: 'NestJS Project',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Team updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. OWNER access required.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(+id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({
    name: 'id',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Team deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can perform this action',
  })
  remove(@Req() req, @Param('id') id: string) {
    return this.teamsService.remove(+id, req.user.id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  @ApiParam({
    name: 'id',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'List of team members',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not a member of this team',
  })
  getMembers(@Req() req, @Param('id') id: string) {
    return this.teamsService.getMembers(+id, req.user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to team' })
  @ApiParam({
    name: 'id',
    example: 1,
  })
  @ApiBody({
    type: AddMemberDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  @ApiResponse({
    status: 409,
    description: 'User already in team',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can perform this action',
  })
  addMember(@Req() req, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.teamsService.addMember(+id, req.user.id, dto);
  }

  @Patch(':teamId/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({
    name: 'teamId',
    example: 1,
  })
  @ApiParam({
    name: 'memberId',
    example: 5,
  })
  @ApiBody({
    type: UpdateMemberRoleDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found or member not found in this team',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can perform this action',
  })
  updateRole(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsService.updateMemberRole(
      +teamId,
      +memberId,
      req.user.id,
      dto.role,
    );
  }

  @Delete(':teamId/members/:memberId')
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiParam({
    name: 'teamId',
    example: 1,
  })
  @ApiParam({
    name: 'memberId',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found or member not found in this team',
  })
  @ApiResponse({
    status: 403,
    description: 'Only owner can perform this action',
  })
  @ApiResponse({
    status: 400,
    description: 'Owner cannot be removed',
  })
  removeMember(
    @Req() req,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.removeMember(+memberId, +teamId, req.user.id);
  }
  @ApiOperation({ summary: 'Leave team' })
  @ApiParam({
    name: 'teamId',
    example: 1,
    description: 'ID of the team to leave',
  })
  @ApiResponse({
    status: 200,
    description: 'Left team successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found or you are not a member of this team',
  })
  @ApiResponse({
    status: 400,
    description:
      'Owner cannot leave the team. Transfer ownership or delete the team first',
  })
  @Delete(':teamId/leave')
  leaveTeam(@Param('teamId', ParseIntPipe) teamId: number, @Req() req) {
    return this.teamsService.leaveTeam(req.user.id, teamId);
  }
}
