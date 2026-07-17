import { Injectable, Logger } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';

import { NotificationService } from 'src/notifications/notifications.service';
import { Task } from 'src/generated/prisma/client';

@Injectable()
export class DeadlineScheduler {
  private readonly logger = new Logger(DeadlineScheduler.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDeadline() {
    this.logger.log('Checking task deadline...');

    const now = new Date();

    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        isSoftDelete: false,

        status: {
          not: 'COMPLETED',
        },

        dueTo: {
          gt: vnNow,
        },
      },
    });

    for (const task of tasks) {
      await this.checkTask(task, vnNow);
    }
  }

  private async checkTask(task: Task, now: Date) {
    const deadline = new Date(task.dueTo);

    const diff = Math.floor((deadline.getTime() - now.getTime()) / 60000);

    if (diff > task.reminder || diff < 0) {
      return;
    }
    const existed = await this.prisma.taskReminderLog.findUnique({
      where: {
        taskId_userId_reminderType: {
          taskId: task.id,
          userId: task.assignedTo,
          reminderType: 'DEADLINE',
        },
      },
    });

    if (existed) {
      return;
    }
    if (!task.assignedTo) {
      return;
    }

    await this.notificationService.notifyDeadline(
      task.assignedTo,
      task.id,
      task.title,
      false,
    );

    await this.prisma.taskReminderLog.create({
      data: {
        taskId: task.id,
        userId: task.assignedTo,
        reminderType: 'DEADLINE',
      },
    });
  }
}
