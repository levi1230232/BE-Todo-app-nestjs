import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(private prisma: PrismaService) {}
  private async checkTeamPermission(userId: number, teamId: number) {
    this.logger.log(
      `Checking team permission. UserId=${userId}, TeamId=${teamId}`,
    );
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      include: {
        team: true,
      },
    });

    if (!member) {
      this.logger.warn(
        `Permission denied. User ${userId} is not a member of team ${teamId}`,
      );
      throw new ForbiddenException('You are not a member of this team');
    }
    if (member.team.ownerId === userId) {
      return;
    }
    if (member.role === 'ADMIN') {
      return;
    }
    this.logger.warn(
      `Permission denied. User ${userId} has insufficient permission in team ${teamId}`,
    );
    throw new ForbiddenException('You do not have permission');
  }
  async findOne(id: number, userId: number) {
    this.logger.log(`Finding tag ${id} for user ${userId}`);
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      this.logger.warn(`Tag ${id} not found`);
      throw new NotFoundException('Tag not found');
    }

    if (tag.userId) {
      if (tag.userId !== userId) {
        this.logger.warn(
          `User ${userId} attempted to access personal tag ${id}`,
        );
        throw new ForbiddenException('You do not have permission');
      }

      return tag;
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: tag.teamId,
        },
      },
    });

    if (!member) {
      this.logger.warn(
        `User ${userId} attempted to access team tag ${id} without permission`,
      );
      throw new ForbiddenException('You are not a member of this team');
    }

    return tag;
  }
  async create(userId: number, dto: CreateTagDto) {
    this.logger.log(
      `User ${userId} is creating ${dto.teamId ? 'team' : 'personal'} tag "${dto.name}"`,
    );
    if (dto.teamId) {
      await this.checkTeamPermission(userId, dto.teamId);
    }

    const existed = await this.prisma.tag.findFirst({
      where: dto.teamId
        ? {
            teamId: dto.teamId,
            name: dto.name,
          }
        : {
            userId,
            name: dto.name,
          },
    });

    if (existed) {
      this.logger.warn(
        `Tag "${dto.name}" already exists ${
          dto.teamId ? `in team ${dto.teamId}` : `for user ${userId}`
        }`,
      );
      throw new ConflictException('Tag already exists');
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color,
        teamId: dto.teamId,
        userId: dto.teamId ? null : userId,
      },
    });
    this.logger.log(`Tag ${tag.id} created successfully by user ${userId}`);
    return { message: 'Tag created successfully' };
  }
  async update(id: number, userId: number, dto: UpdateTagDto) {
    this.logger.log(`User ${userId} updating tag ${id}`);
    const tag = await this.findOne(id, userId);

    if (tag.userId) {
      if (tag.userId !== userId) {
        throw new ForbiddenException();
      }
    } else {
      await this.checkTeamPermission(userId, tag.teamId!);
    }

    const targetTeamId = dto.teamId ?? tag.teamId;
    const targetUserId = tag.userId;
    if (targetUserId && targetTeamId) {
      throw new BadRequestException(
        'Tag cannot belong to both a user and a team',
      );
    }
    if (!targetUserId && !targetTeamId) {
      throw new BadRequestException(
        'Tag must belong to either a user or a team',
      );
    }

    if (dto.name && dto.name !== tag.name) {
      const existedTag = await this.prisma.tag.findFirst({
        where: {
          id: {
            not: id,
          },
          name: dto.name,
          ...(tag.userId ? { userId: tag.userId } : { teamId: tag.teamId }),
        },
      });

      if (existedTag) {
        this.logger.warn(
          `Cannot update tag ${id}. Name "${dto.name}" already exists`,
        );
        throw new ConflictException('Tag already exists');
      }
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: {
        ...dto,
        userId: targetUserId ?? null,
        teamId: targetUserId ? null : targetTeamId,
      },
    });
    this.logger.log(`Tag ${id} updated successfully`);

    return { message: 'Tag updated successfully' };
  }
  async findAllPersonal(userId: number) {
    this.logger.log(`Getting all personal tags of user ${userId}`);
    return this.prisma.tag.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
  async findAllTeam(teamId: number, userId: number) {
    this.logger.log(`Getting all tags of team ${teamId} for user ${userId}`);
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!member) {
      this.logger.warn(
        `User ${userId} attempted to view tags of team ${teamId}`,
      );
      throw new ForbiddenException('You are not a member of this team');
    }

    return this.prisma.tag.findMany({
      where: {
        teamId,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
  async remove(id: number, userId: number) {
    this.logger.log(`User ${userId} deleting tag ${id}`);
    const tag = await this.findOne(id, userId);

    if (tag.userId) {
      if (tag.userId !== userId) {
        throw new ForbiddenException();
      }

      await this.prisma.tag.delete({
        where: { id },
      });
      this.logger.log(`Tag ${id} deleted successfully by user ${userId}`);
      return { message: 'Deleted tag successfully' };
    }

    await this.checkTeamPermission(userId, tag.teamId);

    await this.prisma.tag.delete({
      where: { id },
    });
    this.logger.log(`Tag ${id} deleted successfully by user ${userId}`);
    return { message: 'Tag deleted successfully' };
  }
}
