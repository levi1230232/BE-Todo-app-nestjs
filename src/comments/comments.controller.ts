import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CommentService } from './comments.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('comments')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}
  @ApiOperation({
    summary: 'Create a new comment',
    description: 'Creates a comment for a specific task.',
  })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to comment on this task',
  })
  @Post()
  create(@Req() req, @Body() dto: CreateCommentDto) {
    return this.commentService.create(req.user.id, dto);
  }
  @ApiOperation({
    summary: 'Get comments by task',
    description: 'Returns all comments associated with a task.',
  })
  @ApiParam({
    name: 'taskId',
    type: Number,
    description: 'Task ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found.',
  })
  @Get('task/:taskId')
  findByTask(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.commentService.findByTask(taskId);
  }
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Updates the content of an existing comment.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Comment ID',
    example: 5,
  })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not allowed to update this comment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
  @Patch('task/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, req.user.id, dto);
  }
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Deletes a comment owned by the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Comment ID',
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'You are not allowed to delete this comment.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.commentService.remove(id, req.user.id);
  }
}
