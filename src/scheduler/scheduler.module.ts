import { Module } from '@nestjs/common';

import { ScheduleModule } from '@nestjs/schedule';

import { DeadlineScheduler } from './deadline.scheduler';

import { PrismaModule } from '../prisma/prisma.module';

import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, NotificationsModule],

  providers: [DeadlineScheduler],
})
export class SchedulerModule {}
