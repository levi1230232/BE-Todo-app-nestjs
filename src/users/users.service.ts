import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  async findAll() {
    this.logger.log('Fetching all users');
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    this.logger.log(`Found ${users.length} users`);
    return users;
  }

  async findOne(id: number) {
    this.logger.log(`Fetching user. UserId=${id}`);
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found. UserId=${id}`);
      throw new NotFoundException('User not found');
    }
    this.logger.log(`User found. UserId=${id}`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    this.logger.log(`Updating user. UserId=${id}`);
    await this.findOne(id);

    await this.prisma.user.update({
      where: {
        id,
      },
      data: dto,
    });
    this.logger.log(`User updated successfully. UserId=${id}`);
    return { message: 'User updated successfully' };
  }
  async remove(id: number) {
    this.logger.log(`Deleting user. UserId=${id}`);
    const user = await this.findOne(id);
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('You cannot delete admin account');
    }
    await this.prisma.user.update({
      where: {
        id,
      },
      data: { isDelete: true },
    });
    this.logger.log(`User deleted successfully. UserId=${id}`);

    return {
      message: 'User deleted successfully',
    };
  }

  async findByEmail(email: string) {
    this.logger.debug(`Searching user by email: ${email}`);
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
