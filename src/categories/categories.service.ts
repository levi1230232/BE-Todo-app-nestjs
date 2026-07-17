import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateCategoryDto) {
    this.logger.log(`Creating category "${dto.name}" for user ${userId}`);
    const existed = await this.prisma.category.findFirst({
      where: {
        userId,
        name: dto.name,
      },
    });

    if (existed) {
      this.logger.warn(
        `Category "${dto.name}" already exists for user ${userId}`,
      );
      throw new ConflictException('Category already exists');
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
    this.logger.log(
      `Category created successfully. CategoryId=${category.id}, UserId=${userId}`,
    );
    return category;
  }

  async findAll(userId: number) {
    this.logger.debug(`Fetching categories for user ${userId}`);

    return this.prisma.category.findMany({
      where: {
        userId,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findOne(userId: number, id: number) {
    this.logger.debug(`Fetching category ${id} for user ${userId}`);
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!category) {
      this.logger.warn(`Category ${id} not found for user ${userId}`);
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(userId: number, id: number, dto: UpdateCategoryDto) {
    this.logger.log(`Updating category ${id}, UserId=${userId}`);

    await this.findOne(userId, id);
    if (dto.name) {
      const existed = await this.prisma.category.findFirst({
        where: {
          userId,
          name: dto.name,
          NOT: {
            id,
          },
        },
      });

      if (existed) {
        this.logger.warn(
          `Update failed. Category name "${dto.name}" already exists for user ${userId}`,
        );
        throw new ConflictException('Category name already exists');
      }
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Category ${id} updated successfully`);
    return category;
  }

  async remove(userId: number, id: number) {
    this.logger.log(`Deleting category ${id}, UserId=${userId}`);
    await this.findOne(userId, id);

    await this.prisma.category.delete({
      where: { id },
    });
    this.logger.log(`Category ${id} deleted successfully`);
    return { message: 'Category deleted successfully' };
  }
}
