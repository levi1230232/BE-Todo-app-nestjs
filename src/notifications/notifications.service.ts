import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationType } from 'src/generated/prisma/enums';
import { WebsocketService } from 'src/websocket/websocket.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketService: WebsocketService,
  ) {}

  async create(dto: CreateNotificationDto) {
    this.logger.log(`Creating ${dto.type} notification for user ${dto.userId}`);

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        content: dto.content,
        type: dto.type,
        taskId: dto.taskId,
      },
    });

    this.websocketService.sendToUser(dto.userId, 'notification', notification);
    this.logger.debug(
      `Notification ${notification.id} sent to user ${dto.userId} via WebSocket`,
    );
    return notification;
  }

  async findAll(userId: number, query: NotificationQueryDto) {
    const page = Number(query.page ?? 1);

    const limit = Number(query.limit ?? 10);

    const where: any = {
      userId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead === 'true';
    }
    this.logger.log(
      `Fetching notifications for user ${userId} (page=${page}, limit=${limit})`,
    );
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,

        orderBy: {
          createdAt: 'desc',
        },

        skip: (page - 1) * limit,

        take: limit,
      }),

      this.prisma.notification.count({
        where,
      }),
    ]);
    this.logger.debug(
      `Found ${data.length} notifications (total=${total}) for user ${userId}`,
    );
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number, userId: number) {
    this.logger.log(`Fetching notification ${id} for user ${userId}`);
    const notification = await this.prisma.notification.findUnique({
      where: {
        id,
      },
    });

    if (!notification) {
      this.logger.warn(`Notification ${id} not found`);
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      this.logger.warn(`User ${userId} attempted to access notification ${id}`);
      throw new ForbiddenException();
    }

    return notification;
  }
  async markAsRead(id: number, userId: number) {
    this.logger.log(`User ${userId} marked notification ${id} as read`);
    await this.findOne(id, userId);

    return this.prisma.notification.update({
      where: {
        id,
      },

      data: {
        isRead: true,
      },
    });
  }

  async markAllRead(userId: number) {
    this.logger.log(`Marking all notifications as read for user ${userId}`);

    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },

      data: {
        isRead: true,
      },
    });
    this.logger.debug(`${result.count} notifications marked as read`);

    return result;
  }

  async unreadCount(userId: number) {
    this.logger.debug(`Getting unread notification count for user ${userId}`);
    const count = await this.prisma.notification.count({
      where: {
        userId,

        isRead: false,
      },
    });

    return {
      unread: count,
    };
  }

  async remove(id: number, userId: number) {
    this.logger.log(`User ${userId} deleted notification ${id}`);
    await this.findOne(id, userId);

    await this.prisma.notification.delete({
      where: {
        id,
      },
    });
    return { message: 'Notification deleted successfully' };
  }

  async removeAll(userId: number) {
    this.logger.log(`Deleting all notifications for user ${userId}`);

    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
      },
    });
    this.logger.debug(`${result.count} notifications deleted`);

    return result;
  }

  async notifyAssignedTask(
    userId: number,
    taskTitle: string,
    teamName: string,
    taskId: number,
  ) {
    this.logger.log(
      `Sending ASSIGNED notification to user ${userId} for task "${taskTitle}"`,
    );
    return this.create({
      userId,
      title: 'New Task Assigned',
      content: `You have been assigned task "${taskTitle}" in ${teamName}`,
      type: NotificationType.ASSIGNED,
      taskId,
    });
  }

  async notifyComment(
    userId: number,
    taskTitle: string,
    commenter: string,
    teamName: string,
    taskId: number,
  ) {
    this.logger.log(
      `Sending COMMENT notification to user ${userId} for task "${taskTitle}"`,
    );
    return this.create({
      userId,
      title: 'New Comment',
      content: `${commenter} commented on "${taskTitle}" in ${teamName}`,
      type: NotificationType.COMMENT,
      taskId,
    });
  }

  async notifyDeadline(
    userId: number,
    taskId: number,
    taskTitle: string,
    isUpdate: boolean,
  ) {
    this.logger.log(
      `Processing deadline notification for task ${taskId}, user ${userId}, isUpdate=${isUpdate}`,
    );
    if (isUpdate) {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { team: { select: { name: true } } },
      });
      this.logger.debug(
        `Deadline updated for task ${taskId}, sending notification`,
      );
      return this.create({
        userId,
        taskId,
        title: 'Deadline Reminder',
        content: task.team
          ? `Deadline for task "${taskTitle}" in team "${task.team.name}" has been updated.`
          : `Deadline for task "${taskTitle}" has been updated.`,
        type: NotificationType.DEADLINE,
      });
    } else {
      this.logger.log(`Creating new deadline notification for task ${taskId}`);
      return this.create({
        userId,
        taskId,
        title: 'Deadline Reminder',
        content: `Task "${taskTitle}" is approaching deadline`,
        type: NotificationType.DEADLINE,
      });
    }
  }
  async notifyChangeStatus(
    actorId: number,
    taskId: number,
    oldStatus: string,
    newStatus: string,
  ) {
    this.logger.log(
      `Processing status change notification for task ${taskId}, actor ${actorId}`,
    );

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!task) {
      this.logger.warn(`Task ${taskId} not found`);
      return;
    }

    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId: task.team.id,
        userId: {
          not: actorId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!members.length) {
      this.logger.debug(`No members to notify for task ${taskId}`);
      return;
    }

    this.logger.debug(
      `Sending status change notification to ${members.length} members`,
    );

    await Promise.all(
      members.map((member) =>
        this.create({
          userId: member.userId,
          taskId,
          title: 'Task Status Updated',
          content: task.team
            ? `Task "${task.title}" in team "${task.team.name}" changed status from "${oldStatus}" to "${newStatus}".`
            : `Task "${task.title}" changed status from "${oldStatus}" to "${newStatus}".`,
          type: NotificationType.STATUS_CHANGED,
        }),
      ),
    );
  }
}
