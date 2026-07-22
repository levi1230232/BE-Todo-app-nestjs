import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { Priority, TaskStatus } from 'src/generated/prisma/enums';
import { TasksService } from './tasks.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('tasks')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TasksService) {}

  @ApiOperation({
    summary: 'Create a new task',
    description: `
    Create a new task.
    
    - Personal workspace: only the owner can access the task.
    - Team workspace: assigned users must be members of the team.
    - Category and tag are optional.
  `,
  })
  @ApiBody({
    type: CreateTaskDto,
    description: 'Task creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or validation failed',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'Assigned user is not a member of this team',
  })
  @ApiNotFoundResponse({
    description: 'Team, category, tag, or assigned user not found',
  })
  @ApiConflictResponse({
    description: 'Task already exists',
  })
  @Post()
  create(@Req() req, @Body() dto: CreateTaskDto) {
    return this.taskService.create(req.user.id, dto);
  }
  // @Get()
  // @UseGuards(RolesGuard)
  // @Roles('ADMIN')
  // @ApiOperation({ summary: 'Get all tasks (only admin)' })
  // @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  // @ApiQuery({ name: 'priority', required: false, enum: Priority })
  // @ApiQuery({ name: 'assignedTo', required: false, type: Number })
  // @ApiQuery({ name: 'teamId', required: false, type: Number })
  // @ApiResponse({ status: 200, description: 'List of tasks.' })
  // findAll(@Query() query: QueryTaskDto) {
  //   return this.taskService.findAll(query);
  // }

  @Get('me')
  @ApiOperation({
    summary: 'Get my tasks',
    description: `Retrieve all tasks assigned to the current authenticated user.
`,
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'User does not have permission to access tasks',
  })
  getMyTasks(@Req() req) {
    return this.taskService.getMyTasks(req.user.id);
  }

  @ApiOperation({
    summary: 'Get tasks of a team',
    description: `
    Retrieve all tasks belonging to a specific team.

    - User must be a member of the team.
    - Returns tasks created within the team workspace.
  `,
  })
  @ApiParam({
    name: 'teamId',
    type: Number,
    example: 1,
    description: 'ID of the team',
  })
  @ApiResponse({
    status: 200,
    description: 'Team tasks retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You are not a member of this team',
  })
  @ApiNotFoundResponse({
    description: 'Team not found',
  })
  @Get('team/:teamId')
  getTeamTasks(
    @Param('teamId', ParseIntPipe)
    teamId: number,
    @Req() req,
  ) {
    return this.taskService.getTeamTasks(teamId, req.user.id);
  }

  @Get('today')
  @ApiOperation({
    summary: 'Get today tasks',
    description: `
    Retrieve all tasks scheduled for today of the authenticated user.

    - Returns personal tasks and team tasks assigned to the user.
    - Tasks are filtered by today's date.
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Today tasks retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  getTodayTasks(@Req() req) {
    return this.taskService.getTodayTasks(req.user.id);
  }

  @Get('upcoming')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get upcoming tasks',
    description: `
    Retrieve upcoming tasks of the authenticated user.

    - Returns tasks with due dates in the future.
    - Includes personal tasks and team tasks assigned to the user.
    - Tasks are sorted by upcoming due date.
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming tasks retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  getUpcomingTasks(@Req() req) {
    return this.taskService.getUpcomingTasks(req.user.id);
  }

  @Get('overdue')
  @ApiOperation({
    summary: 'Get overdue tasks',
    description: `
    Retrieve all overdue tasks of the authenticated user.

    - Returns tasks with due dates earlier than today and not completed.
    - Includes personal tasks and team tasks assigned to the user.
  `,
  })
  @ApiResponse({
    status: 200,
    description: 'Overdue tasks retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  getOverdueTasks(@Req() req) {
    return this.taskService.getOverdueTasks(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get task by id',
    description: `
    Retrieve detailed information of a specific task.

    - User can access the task if they are the owner or a member of the related team.
    - Returns task details including category, tags, comments, and assigned users.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to access this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
    @Req() req,
  ) {
    return this.taskService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update task',
    description: `
    Update an existing task.

    - User must have permission to update the task.
    - Personal tasks can only be updated by the owner.
    - Team tasks can be updated by team members with appropriate permission.
    - Team/workspace cannot be changed after task creation.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    type: UpdateTaskDto,
    description: 'Task update data',
    examples: {
      example1: {
        summary: 'Update task information',
        value: {
          title: 'Learn NestJS Advanced',
          description: 'Finish Module & Guards',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          dueTo: '2026-08-15T18:00:00.000Z',
          reminder: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid update data or unsupported field change',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateTaskDto,
    @Req() req,
  ) {
    return this.taskService.update(id, dto, req.user.id);
  }

  @Patch('softDelete/:id')
  @ApiOperation({
    summary: 'Soft delete task',
    description: `
    Soft delete an existing task.

    - The task will not be permanently removed from the database.
    - The task will be marked as deleted and can be restored if supported.
    - User must have permission to delete the task.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Task deleted successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  softDelete(
    @Param('id', ParseIntPipe)
    id: number,
    @Req() req,
  ) {
    return this.taskService.softDelete(id, req.user.id);
  }
  @Patch('restoreTask/:id')
  @ApiOperation({
    summary: 'Restore task',
    description: `
    Restore a previously soft-deleted task.

    - The task will be recovered and available again.
    - User must have permission to restore the task.
    - Only soft-deleted tasks can be restored.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Task restored successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to restore this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found or task has not been deleted',
  })
  restore(
    @Param('id', ParseIntPipe)
    id: number,
    @Req() req,
  ) {
    return this.taskService.restoreTask(id, req.user.id);
  }
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change task status',
    description: `
    Update the status of an existing task.

    - User must have permission to update the task.
    - Supported status levels:  PENDING, IN_PROGRESS, COMPLETED, CANCELLED, OVERDUE
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'],
          example: 'PENDING',
          description: 'New task ',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid status value',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  changeStatus(
    @Param('id', ParseIntPipe)
    id: number,

    @Body('status', new ParseEnumPipe(TaskStatus))
    status: TaskStatus,
    @Req() req,
  ) {
    return this.taskService.changeStatus(id, status, req.user.id);
  }

  @Patch(':id/priority')
  @ApiOperation({
    summary: 'Change task priority',
    description: `
    Update the priority level of an existing task.

    - User must have permission to update the task.
    - Supported priority levels: LOW, MEDIUM, HIGH.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          example: 'HIGH',
          description: 'New task priority',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task priority updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid priority value',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  changePriority(
    @Param('id', ParseIntPipe)
    id: number,
    @Req() req,
    @Body('priority', new ParseEnumPipe(Priority))
    priority: Priority,
  ) {
    return this.taskService.changePriority(id, priority, req.user.id);
  }

  @Patch(':id/deadline')
  @ApiOperation({
    summary: 'Change task deadline',
    description: `
    Update the deadline of an existing task.

    - User must have permission to update the task.
    - The deadline must be a valid future date.
    - The task deadline will be updated with the provided due date.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        dueTo: {
          type: 'string',
          format: 'date-time',
          example: '2026-08-01T10:00:00.000Z',
          description: 'New task deadline',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task deadline updated successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid deadline format or deadline is not allowed',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  changeDeadline(
    @Param('id', ParseIntPipe)
    id: number,

    @Body('dueTo')
    dueTo: Date,
    @Req() req,
  ) {
    return this.taskService.changeDeadline(id, new Date(dueTo), req.user.id);
  }

  @Patch(':id/assign')
  @ApiOperation({
    summary: 'Assign task to user',
    description: `
    Assign an existing task to a user.

    - User must have permission to update the task.
    - For team tasks, the assigned user must be a member of the team.
    - The assigned user must exist in the system.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        assignedTo: {
          type: 'number',
          example: 5,
          description: 'ID of the user to assign the task to',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid assigned user data',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description:
      'Assigned user is not a member of this team or you do not have permission',
  })
  @ApiNotFoundResponse({
    description: 'Task or assigned user not found',
  })
  assignTask(
    @Param('id', ParseIntPipe)
    id: number,

    @Body('assignedTo')
    assignedTo: number,
  ) {
    return this.taskService.assignTask(id, assignedTo);
  }

  @Post(':id/tags')
  @ApiOperation({
    summary: 'Add tags to task',
    description: `
    Add one or more tags to an existing task.

    - User must have permission to update the task.
    - All provided tags must exist.
    - Existing tags will not be duplicated.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tagIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          example: [1, 2, 3],
          description: 'List of tag IDs to add',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tags added to task successfully.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid tag IDs or empty tag list',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task or tag not found',
  })
  @ApiResponse({ status: 201 })
  addTags(
    @Param('id', ParseIntPipe)
    id: number,

    @Body('tagIds')
    tagIds: number[],
    @Req() req,
  ) {
    return this.taskService.addTags(id, tagIds, req.user.id);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({
    summary: 'Remove tag from task',
    description: `
    Remove a tag from an existing task.

    - User must have permission to update the task.
    - The tag will only be removed from the task, not deleted from the system.
    - Task and tag relation must exist.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiParam({
    name: 'tagId',
    type: Number,
    example: 2,
    description: 'Tag ID to remove from task',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag removed from task successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to update this task',
  })
  @ApiNotFoundResponse({
    description: 'Task or tag relation not found',
  })
  removeTag(
    @Param('id', ParseIntPipe)
    id: number,

    @Param('tagId', ParseIntPipe)
    tagId: number,
  ) {
    return this.taskService.removeTag(id, tagId);
  }
  @Delete(':id/permanent')
  @ApiOperation({
    summary: 'Permanently delete task',
    description: `
    Permanently delete a task from the system.

    - User must have permission to delete the task.
    - Task must be soft deleted before permanent deletion.
    - This action cannot be undone.
    - All task-tag relations will also be removed.
  `,
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
    description: 'Task ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Task permanently deleted successfully.',
    schema: {
      example: {
        message: 'Deleted task successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Task must be soft deleted before permanent deletion',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated or token is invalid',
  })
  @ApiForbiddenResponse({
    description: 'You do not have permission to delete this task',
  })
  @ApiNotFoundResponse({
    description: 'Task not found',
  })
  async removeTask(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.taskService.removeTask(id, req.user.id);
  }
}
