import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notifications/notifications.service';

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

    const maxReminder = 60;

    const maxDueTime = new Date(now.getTime() + maxReminder * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        isSoftDelete: false,
        assignedTo: {
          not: null,
        },
        status: {
          not: 'COMPLETED',
        },
        dueTo: {
          gte: now,
          lte: maxDueTime,
        },
      },
    });

    if (!tasks.length) return;

    const reminderLogs = await this.prisma.taskReminderLog.findMany({
      where: {
        reminderType: 'DEADLINE',
        taskId: {
          in: tasks.map((t) => t.id),
        },
      },
    });

    const reminded = new Set(
      reminderLogs.map((log) => `${log.taskId}-${log.userId}`),
    );

    const notifications = [];

    for (const task of tasks) {
      const diff = Math.floor((task.dueTo.getTime() - now.getTime()) / 60000);

      if (diff > task.reminder || diff < 0) {
        continue;
      }

      const key = `${task.id}-${task.assignedTo}`;

      if (reminded.has(key)) {
        continue;
      }

      notifications.push(
        (async () => {
          await this.notificationService.notifyDeadline(
            task.assignedTo!,
            task.id,
            task.title,
            false,
          );

          await this.prisma.taskReminderLog.create({
            data: {
              taskId: task.id,
              userId: task.assignedTo!,
              reminderType: 'DEADLINE',
            },
          });
        })(),
      );
    }

    await Promise.all(notifications);
  }
}
