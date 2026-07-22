import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Priority,
  TaskStatus,
  WorkspaceStyle,
} from 'src/generated/prisma/enums';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryTaskDto } from './dto/query-task.dto';
import { Prisma, Task } from 'src/generated/prisma/client';
import { TeamMemberRole } from './../generated/prisma/enums';
import { NotificationService } from 'src/notifications/notifications.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}
  private async getTaskOrThrow(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async checkTaskPermission(task: Task, userId: number) {
    let teamName: string = '';
    if (task.workspaceStyle === WorkspaceStyle.PERSONAL) {
      if (task.createBy !== userId) {
        throw new ForbiddenException(
          'You can only modify your own personal task',
        );
      }

      return;
    }

    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: task.teamId!,
        },
      },
    });

    if (
      !member ||
      (member.role !== TeamMemberRole.OWNER &&
        member.role !== TeamMemberRole.ADMIN)
    ) {
      throw new ForbiddenException('Only OWNER or ADMIN can modify this task');
    }
  }
  async create(userId: number, dto: CreateTaskDto) {
    this.logger.log(
      `User ${userId} is creating a ${dto.workspaceStyle} task: ${dto.title}`,
    );
    let teamName: string | null = null;
    if (dto.workspaceStyle === WorkspaceStyle.PERSONAL) {
      dto.assignedTo = userId;
      dto.teamId = null;
      const existedTask = await this.prisma.task.findFirst({
        where: {
          title: dto.title,
        },
      });

      if (existedTask) {
        throw new ConflictException('Tasks already existed');
      }
      if (!dto.categoryId) {
        throw new ForbiddenException('Category is required');
      }
    }

    if (dto.workspaceStyle === WorkspaceStyle.TEAM) {
      if (!dto.teamId) {
        throw new ForbiddenException('Team is required');
      }
      const team = await this.prisma.team.findUnique({
        where: { id: dto.teamId },
      });
      if (!dto.assignedTo) {
        throw new BadRequestException(
          'Assigned user is required for team workspace',
        );
      }
      const creatorMember = await this.prisma.teamMember.findFirst({
        where: {
          userId: userId,
          teamId: dto.teamId,
        },
      });

      if (!creatorMember) {
        throw new ForbiddenException('You are not a member of this team');
      }

      if (creatorMember.role === TeamMemberRole.MEMBER) {
        throw new ForbiddenException(
          'You do not have permission to create tasks',
        );
      }
      const existedTask = await this.prisma.task.findFirst({
        where: {
          title: dto.title,
          teamId: dto.teamId,
        },
      });

      if (existedTask) {
        throw new ConflictException('Tasks already existed');
      }

      const assigneeMember = await this.prisma.teamMember.findFirst({
        where: {
          userId: dto.assignedTo,
          teamId: dto.teamId,
        },
      });

      if (!assigneeMember) {
        throw new ForbiddenException(
          'Assigned user is not a member of this team',
        );
      }
      dto.categoryId = null;
      teamName = team?.name ?? null;
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        dueTo: dto.dueTo,
        reminder: dto.reminder,
        workspaceStyle: dto.workspaceStyle,
        teamId: dto.teamId,
        categoryId: dto.categoryId,
        createBy: userId,
        assignedTo: dto.assignedTo,
      },
    });

    if (
      dto.workspaceStyle === WorkspaceStyle.TEAM &&
      dto.assignedTo &&
      dto.assignedTo !== userId
    ) {
      await this.notificationService.notifyAssignedTask(
        dto.assignedTo,
        task.title,
        teamName!,
        task.id,
      );
    }
    this.logger.log(`Task ${task.id} created successfully by user ${userId}`);
    return { message: 'Task created successfully' };
  }

  async findAll(query: QueryTaskDto) {
    const {
      search,
      status,
      priority,
      workspaceStyle,
      categoryId,
      teamId,
      assignedTo,
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.TaskWhereInput = {
      isSoftDelete: false,
    };

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (workspaceStyle) {
      where.workspaceStyle = workspaceStyle;
    }

    if (categoryId) {
      where.categoryId = Number(categoryId);
    }

    if (teamId) {
      where.teamId = Number(teamId);
    }

    if (assignedTo) {
      where.assignedTo = Number(assignedTo);
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          creator: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          team: true,
        },
      }),

      this.prisma.task.count({
        where,
      }),
    ]);

    return {
      data: tasks,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async findOne(id: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        taskTags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        team: {
          include: {
            members: {
              where: {
                userId,
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!task || task.isSoftDelete) {
      throw new NotFoundException('Task not found');
    }

    // Task thuộc team
    if (task.teamId) {
      const isMember = task.team?.members.length > 0;

      if (!isMember) {
        throw new ForbiddenException(
          'You do not have permission to view this task',
        );
      }
    } else {
      // Task cá nhân
      if (task.assignedTo !== userId) {
        throw new ForbiddenException(
          'You do not have permission to view this task',
        );
      }
    }

    // bỏ members trước khi trả về
    const { team, ...rest } = task;

    return {
      ...rest,
      team: team
        ? {
            id: team.id,
            name: team.name,
            description: team.description,
            ownerId: team.ownerId,
            createdAt: team.createdAt,
            updatedAt: team.updatedAt,
          }
        : null,
    };
  }

  async update(id: number, dto: UpdateTaskDto, userId: number) {
    this.logger.log(`User ${userId} updating task ${id}`);

    const task = await this.findOne(id, userId);

    await this.checkTaskPermission(task, userId);

    if (dto.teamId !== undefined) {
      throw new BadRequestException('Changing workspace is not allowed');
    }

    if (task.workspaceStyle === WorkspaceStyle.PERSONAL) {
      if (dto.categoryId) {
        const category = await this.prisma.category.findFirst({
          where: {
            id: dto.categoryId,
            userId,
          },
        });

        if (!category) {
          throw new NotFoundException(
            'Category not found or does not belong to this user',
          );
        }
      }
    } else {
      if (dto.categoryId !== undefined) {
        throw new BadRequestException(
          'Category is only available for personal tasks',
        );
      }
    }

    if (dto.title !== undefined) {
      const existedTask = await this.prisma.task.findFirst({
        where: {
          id: {
            not: id,
          },
          title: dto.title,
          workspaceStyle: task.workspaceStyle,
          ...(task.workspaceStyle === WorkspaceStyle.PERSONAL
            ? {
                teamId: null,
              }
            : {
                teamId: task.teamId,
              }),
        },
      });

      if (existedTask) {
        throw new BadRequestException('Task name already exists');
      }
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Task ${id} updated successfully`);
    return { message: 'Task updated successfully' };
  }

  async softDelete(id: number, userId: number) {
    this.logger.warn(`User ${userId} soft deleted task ${id}`);
    const task = await this.getTaskOrThrow(id);

    await this.checkTaskPermission(task, userId);

    await this.prisma.task.update({
      where: { id },
      data: {
        isSoftDelete: true,
      },
    });
    return { message: 'soft deleted task successfully' };
  }
  async restoreTask(id: number, userId: number) {
    const task = await this.prisma.task.findFirst({
      where: { AND: [{ id }, { isSoftDelete: true }] },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.checkTaskPermission(task, userId);
    await this.prisma.task.update({
      where: { id },
      data: { isSoftDelete: false },
    });
    return { message: 'Task restored successfully' };
  }
  async changeStatus(id: number, status: TaskStatus, userId: number) {
    this.logger.log(`User ${userId} changed task ${id} status to ${status}`);
    const task = await this.getTaskOrThrow(id);

    if (task.workspaceStyle === WorkspaceStyle.PERSONAL) {
      if (task.createBy !== userId) {
        throw new ForbiddenException();
      }
    } else {
      if (task.assignedTo !== userId) {
        const member = await this.prisma.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId,
              teamId: task.teamId!,
            },
          },
        });

        if (
          !member ||
          (member.role !== TeamMemberRole.OWNER &&
            member.role !== TeamMemberRole.ADMIN)
        ) {
          throw new ForbiddenException(
            'You do not have permission to change task status',
          );
        }
      }
    }
    this.notificationService.notifyChangeStatus(
      userId,
      id,
      task.status,
      status,
    );

    await this.prisma.task.update({
      where: { id },
      data: { status },
    });
    return { message: 'Task status changed successfully' };
  }

  async changePriority(id: number, priority: Priority, userId: number) {
    const task = await this.getTaskOrThrow(id);

    await this.checkTaskPermission(task, userId);

    await this.prisma.task.update({
      where: { id },
      data: {
        priority,
      },
    });
    return { message: 'Task priority changed successfully' };
  }
  async changeDeadline(id: number, dueTo: Date, userId: number) {
    const task = await this.getTaskOrThrow(id);

    await this.checkTaskPermission(task, userId);
    const now = new Date();
    if (dueTo < now) {
      throw new BadRequestException(
        'Due date cannot be earlier than the current time',
      );
    }
    const updatedTask = await this.prisma.task.update({
      where: {
        id,
      },

      data: {
        dueTo,
      },
    });
    await this.prisma.taskReminderLog.deleteMany({
      where: { taskId: task.id, reminderType: 'DEADLINE' },
    });
    if (task.assignedTo && task.assignedTo !== userId) {
      await this.notificationService.notifyDeadline(
        task.assignedTo,
        task.id,
        task.title,
        true,
      );
    }

    return { message: 'Task deadline changed successfully' };
  }

  async assignTask(id: number, assignedTo: number) {
    const task = await this.findOne(id, assignedTo);

    if (task.workspaceStyle === WorkspaceStyle.TEAM) {
      const member = await this.prisma.teamMember.findFirst({
        where: {
          teamId: task.teamId!,
          userId: assignedTo,
        },
      });

      if (!member) {
        throw new ForbiddenException('User is not in this team');
      }
    }
    const updatedTask = await this.prisma.task.update({
      where: {
        id,
      },

      data: {
        assignedTo,
      },
    });

    if (assignedTo !== task.createBy) {
      await this.notificationService.notifyAssignedTask(
        assignedTo,
        task.title,
        task.team.name,
        task.id,
      );
    }

    return { message: 'The assigned task has been updated' };
  }

  async getMyTasks(userId: number) {
    return this.prisma.task.findMany({
      where: {
        assignedTo: userId,
        isSoftDelete: false,
      },
      include: {
        taskTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
      orderBy: {
        dueTo: 'asc',
      },
    });
  }

  async getTeamTasks(teamId: number, userId: number) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: teamId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not member of this team');
    }
    return this.prisma.task.findMany({
      where: {
        teamId,
        isSoftDelete: false,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
        taskTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });
  }

  async getTodayTasks(userId: number) {
    const today = new Date();

    const start = new Date(today);
    start.setHours(0, 0, 0, 0);

    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        assignedTo: userId,
        dueTo: {
          gte: start,
          lte: end,
        },
        isSoftDelete: false,
      },
      include: {
        taskTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });
  }

  async getUpcomingTasks(userId: number) {
    return this.prisma.task.findMany({
      where: {
        assignedTo: userId,
        dueTo: {
          gt: new Date(),
        },
        isSoftDelete: false,
      },
      orderBy: {
        dueTo: 'asc',
      },
      include: {
        taskTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });
  }

  async getOverdueTasks(userId: number) {
    return this.prisma.task.findMany({
      where: {
        assignedTo: userId,
        dueTo: {
          lt: new Date(),
        },
        status: {
          not: TaskStatus.COMPLETED,
        },
        isSoftDelete: false,
      },
      orderBy: {
        dueTo: 'asc',
      },
      include: {
        taskTags: {
          select: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });
  }
  async addTags(taskId: number, tagIds: number[], userId: number) {
    const task = await this.prisma.task.findUnique({
      where: {
        id: taskId,
      },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const isTeamTask = task.teamId !== null;

    const validTags = await this.prisma.tag.findMany({
      where: {
        id: {
          in: tagIds,
        },
        ...(isTeamTask
          ? {
              teamId: task.teamId,
              userId: null,
            }
          : {
              userId,
              teamId: null,
            }),
      },
      select: {
        id: true,
      },
    });

    const validTagIds = validTags.map((tag) => tag.id);

    if (validTagIds.length !== tagIds.length) {
      throw new BadRequestException(
        'One or more tags do not belong to this task.',
      );
    }

    const existingTaskTags = await this.prisma.taskTag.findMany({
      where: {
        taskId,
        tagId: {
          in: validTagIds,
        },
      },
      select: {
        tagId: true,
      },
    });

    const existingTagIds = new Set(existingTaskTags.map((item) => item.tagId));

    const newTaskTags = validTagIds
      .filter((tagId) => !existingTagIds.has(tagId))
      .map((tagId) => ({
        taskId,
        tagId,
      }));

    if (newTaskTags.length > 0) {
      await this.prisma.taskTag.createMany({
        data: newTaskTags,
        skipDuplicates: true,
      });
    }

    return {
      message: 'Tags attached successfully',
      added: newTaskTags.length,
      skipped: existingTagIds.size,
    };
  }
  async removeTag(taskId: number, tagId: number) {
    const taskTag = await this.prisma.taskTag.findUnique({
      where: { taskId_tagId: { taskId, tagId } },
    });
    if (!taskTag) {
      throw new NotFoundException('Tag not found in this task');
    }
    await this.prisma.taskTag.delete({
      where: {
        taskId_tagId: {
          taskId,
          tagId,
        },
      },
    });

    return { message: 'Tag removed from task successfully' };
  }
  async removeTask(id: number, userId: number) {
    this.logger.warn(`User ${userId} permanently deleted task ${id}`);

    const task = await this.getTaskOrThrow(id);

    await this.checkTaskPermission(task, userId);

    if (!task.isSoftDelete) {
      throw new BadRequestException(
        'Task must be soft deleted before permanent deletion',
      );
    }
    await this.prisma.$transaction([
      this.prisma.taskTag.deleteMany({
        where: { taskId: id },
      }),
      this.prisma.comment.deleteMany({
        where: { taskId: id },
      }),
      this.prisma.notification.deleteMany({
        where: { taskId: id },
      }),
      this.prisma.taskReminderLog.deleteMany({
        where: { taskId: id },
      }),
      this.prisma.task.delete({
        where: { id },
      }),
    ]);
    return { message: 'Deleted task successfully' };
  }
}
