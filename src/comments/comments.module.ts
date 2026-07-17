import { Module } from '@nestjs/common';
import { CommentController } from './comments.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentService } from './comments.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CommentController],
  providers: [CommentService, PrismaService],
})
export class CommentsModule {}
