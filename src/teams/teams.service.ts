import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TeamMemberRole } from 'src/generated/prisma/client';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  constructor(private prisma: PrismaService) {}
  private async checkOwner(teamId: number, userId: number) {
    this.logger.log(
      `Checking owner permission. TeamId=${teamId}, UserId=${userId}`,
    );

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      this.logger.warn(`Team ${teamId} not found`);
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      this.logger.warn(
        `Permission denied. User ${userId} is not owner of team ${teamId}`,
      );
      throw new ForbiddenException('Only owner can perform this action');
    }

    return team;
  }
  async create(ownerId: number, dto: CreateTeamDto) {
    this.logger.log(`Creating team "${dto.name}" by user ${ownerId}`);

    const existed = await this.prisma.team.findFirst({
      where: {
        name: dto.name,
        ownerId,
      },
    });

    if (existed) {
      this.logger.warn(`Create failed. Team name "${dto.name}" already exists`);
      throw new BadRequestException('Team name already exists');
    }
    const team = await this.prisma.team.create({
      data: {
        ...dto,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          select: { userId: true, role: true },
        },
      },
    });
    this.logger.log(`Team ${team.id} created successfully`);
    return team;
  }
  async findAll(userId: number) {
    this.logger.log(`Getting all teams of user ${userId}`);

    return this.prisma.team.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
  async findOne(teamId: number, userId: number) {
    this.logger.log(`User ${userId} is viewing team ${teamId}`);

    const member = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!member) {
      this.logger.warn(
        `User ${userId} attempted to access team ${teamId} without permission`,
      );
      throw new ForbiddenException('You are not a member of this team');
    }

    return this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          where: {
            role: {
              not: 'OWNER',
            },
          },
          select: {
            role: true,
            joinAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }
  async update(teamId: number, userId: number, dto: UpdateTeamDto) {
    this.logger.log(`User ${userId} updating team ${teamId}`);
    await this.checkOwner(teamId, userId);

    const team = await this.prisma.team.update({
      where: { id: teamId },
      data: dto,
    });
    this.logger.log(`Team ${teamId} updated successfully`);
    return team;
  }
  async remove(teamId: number, userId: number) {
    this.logger.log(`User ${userId} deleting team ${teamId}`);
    await this.checkOwner(teamId, userId);

    await this.prisma.teamMember.deleteMany({
      where: {
        teamId,
      },
    });

    await this.prisma.task.deleteMany({
      where: { teamId },
    });
    await this.prisma.team.delete({
      where: {
        id: teamId,
      },
    });
    this.logger.log(`Team ${teamId} deleted successfully`);
    return { message: 'Team deleted successfully' };
  }
  async getMembers(teamId: number, userId: number) {
    this.logger.log(`User ${userId} requested members of team ${teamId}`);
    await this.findOne(teamId, userId);

    return this.prisma.teamMember.findMany({
      where: {
        teamId,
      },
      select: {
        id: true,
        role: true,
        joinAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
  async addMember(teamId: number, ownerId: number, dto: AddMemberDto) {
    this.logger.log(
      `Owner ${ownerId} adding user ${dto.userId} to team ${teamId}`,
    );

    await this.checkOwner(teamId, ownerId);
    const existUser = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
      },
    });
    if (!existUser) {
      this.logger.warn(`User ${dto.userId} not found`);
      throw new NotFoundException('Not found user');
    }
    const existed = await this.prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: dto.userId,
      },
    });

    if (existed) {
      this.logger.warn(`User ${dto.userId} already exists in team ${teamId}`);
      throw new ConflictException('User already in team');
    }
    await this.prisma.teamMember.create({
      data: {
        teamId,
        userId: dto.userId,
        role: TeamMemberRole.MEMBER,
      },
    });
    this.logger.log(`User ${dto.userId} added to team ${teamId} successfully`);
    return { message: 'User added to team successfully' };
  }
  async updateMemberRole(
    teamId: number,
    memberId: number,
    ownerId: number,
    role: TeamMemberRole,
  ) {
    this.logger.log(
      `Owner ${ownerId} changing role of member ${memberId} in team ${teamId} to ${role}`,
    );
    await this.checkOwner(teamId, ownerId);

    const member = await this.prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId,
      },
    });

    if (!member) {
      this.logger.warn(`Member ${memberId} not found in team ${teamId}`);
      throw new NotFoundException('Member not found in this team');
    }

    if (member.role === 'OWNER') {
      throw new BadRequestException('Cannot change owner role');
    }
    this.logger.log(`Role of member ${memberId} updated to ${role}`);
    await this.prisma.teamMember.update({
      where: {
        id: memberId,
      },
      data: {
        role,
      },
    });
    return { message: 'Role of member updated' };
  }
  async removeMember(userId: number, teamId: number, ownerId: number) {
    this.logger.log(
      `Owner ${ownerId} removing user ${userId} from team ${teamId}`,
    );

    await this.checkOwner(teamId, ownerId);

    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this team');
    }

    if (member.role === TeamMemberRole.OWNER) {
      throw new BadRequestException('Owner cannot be removed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: {
          teamId,
          assignedTo: userId,
        },
        data: {
          assignedTo: null,
        },
      });

      await tx.teamMember.delete({
        where: {
          id: member.id,
        },
      });
    });

    this.logger.log(`User ${userId} removed from team ${teamId}`);

    return {
      message: 'Removed member successfully',
    };
  }
  async leaveTeam(userId: number, teamId: number) {
    this.logger.log(`User ${userId} is leaving team ${teamId}`);

    const member = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    });

    if (!member) {
      this.logger.warn(`User ${userId} is not a member of team ${teamId}`);
      throw new NotFoundException('You are not a member of this team');
    }

    // Nếu là OWNER thì kiểm tra còn owner khác không
    if (member.role === 'OWNER') {
      const ownerCount = await this.prisma.teamMember.count({
        where: {
          teamId,
          role: 'OWNER',
        },
      });

      if (ownerCount === 1) {
        this.logger.warn(
          `Last owner ${userId} attempted to leave team ${teamId}`,
        );

        throw new BadRequestException(
          'You are the last owner. Transfer ownership or delete the team first.',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Gỡ assign của tất cả task
      await tx.task.updateMany({
        where: {
          teamId,
          assignedTo: userId,
        },
        data: {
          assignedTo: null,
        },
      });

      // Xóa thành viên khỏi team
      await tx.teamMember.delete({
        where: {
          id: member.id,
        },
      });
    });

    this.logger.log(`User ${userId} left team ${teamId}`);

    return {
      message: 'Left team successfully',
    };
  }
}
