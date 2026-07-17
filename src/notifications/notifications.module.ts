import { Module } from '@nestjs/common';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
