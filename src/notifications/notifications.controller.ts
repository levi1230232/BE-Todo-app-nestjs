import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { NotificationQueryDto } from './dto/notification-query.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { NotificationService } from './notifications.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('notifications')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all notifications',
    description: 'Get notifications of current user with pagination/filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Return list of notifications',
  })
  findAll(@Req() req, @Query() query: NotificationQueryDto) {
    return this.notificationService.findAll(req.user.id, query);
  }
  @Get('unread/count')
  @ApiOperation({
    summary: 'Get unread notification count',
  })
  @ApiResponse({
    status: 200,
    description: 'Return unread notifications count',
    schema: {
      example: {
        count: 5,
      },
    },
  })
  unreadCount(@Req() req) {
    return this.notificationService.unreadCount(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get notification detail',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Notification ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Return notification detail',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.notificationService.findOne(id, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Notification ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  markAll(@Req() req) {
    return this.notificationService.markAllRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a notification',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Notification ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.notificationService.remove(id, req.user.id);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete all notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted successfully',
  })
  removeAll(@Req() req) {
    return this.notificationService.removeAll(req.user.id);
  }
}
