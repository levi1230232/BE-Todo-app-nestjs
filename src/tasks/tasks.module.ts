import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskController } from './tasks.controller';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TaskController],
  providers: [TasksService],
})
export class TasksModule {}
