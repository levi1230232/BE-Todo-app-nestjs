import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { WorkspaceStyle } from 'src/generated/prisma/enums';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationService } from 'src/notifications/notifications.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(userId: number, dto: CreateCommentDto) {
    this.logger.log(
      `User ${userId} is creating comment for task ${dto.taskId}`,
    );

    const task = await this.prisma.task.findUnique({
      where: {
        id: dto.taskId,
        isSoftDelete: false,
      },
      include: {
        team: { select: { name: true } },
      },
    });

    if (!task) {
      this.logger.warn(`Task ${dto.taskId} not found`);
      throw new NotFoundException('Task not found');
    }

    if (task.workspaceStyle === WorkspaceStyle.PERSONAL) {
      if (task.createBy !== userId && task.assignedTo !== userId) {
        throw new ForbiddenException(
          'You do not have permission to comment on this task',
        );
      }
    }

    if (task.workspaceStyle === WorkspaceStyle.TEAM) {
      const member = await this.prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: task.teamId!,
          },
        },
      });
      if (!member) {
        throw new ForbiddenException('You are not a member of this team');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        taskId: dto.taskId,
        userId,
        content: dto.content,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    this.logger.log(
      `Comment ${comment.id} created by user ${userId} on task ${task.id}`,
    );
    const receivers = new Set<number>();

    if (task.createBy !== userId) {
      receivers.add(task.createBy);
    }

    if (task.assignedTo && task.assignedTo !== userId) {
      receivers.add(task.assignedTo);
    }
    this.logger.log(`Sending comment notifications to ${receivers.size} users`);
    for (const receiverId of receivers) {
      this.logger.debug(
        `Notify user ${receiverId} about comment ${comment.id}`,
      );

      await this.notificationService.notifyComment(
        receiverId,
        task.title,
        comment.user.name,
        task.team?.name,
        task.id,
      );
    }

    return { message: 'Comment created successfully' };
  }
  async findByTask(taskId: number) {
    this.logger.log(`Fetching comments for task ${taskId}`);
    return this.prisma.comment.findMany({
      where: {
        taskId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(id: number, userId: number, dto: UpdateCommentDto) {
    this.logger.log(`User ${userId} updating comment ${id}`);

    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      this.logger.warn(`Comment ${id} not found`);
      throw new NotFoundException();
    }

    if (comment.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to update comment ${id} owned by user ${comment.userId}`,
      );
      throw new ForbiddenException();
    }

    await this.prisma.comment.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Comment ${id} updated successfully`);

    return { message: 'Comment updated successfully' };
  }

  async remove(id: number, userId: number) {
    this.logger.log(`User ${userId} deleting comment ${id}`);

    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      this.logger.warn(`Comment ${id} not found`);
      throw new NotFoundException();
    }

    if (comment.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to delete comment ${id} owned by user ${comment.userId}`,
      );
      throw new ForbiddenException();
    }

    await this.prisma.comment.delete({
      where: { id },
    });
    this.logger.log(`Comment ${id} deleted successfully`);
    return { message: 'Deleted comment successfully' };
  }
}
