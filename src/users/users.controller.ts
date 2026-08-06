import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile information of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  getProfile(@Req() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtGuard)
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates the authenticated user profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  updateProfile(@Req() req, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.id, dto);
  }
  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns a list of all registered users. Admin access only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Admin access required.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  findAll() {
    return this.usersService.findAll();
  }
  @Delete(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Deletes a user by ID. Admin access only.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'User ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Admin access required.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
  @Get('/find-by-email')
  getByEmail(@Query('email') email: string) {
    return this.usersService.findByEmail(email);
  }
}
