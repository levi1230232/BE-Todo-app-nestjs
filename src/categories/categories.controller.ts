import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CategoryService } from './categories.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('categories')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  create(@Req() req, @Body() dto: CreateCategoryDto) {
    return this.categoryService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories of current user' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll(@Req() req) {
    return this.categoryService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Category found',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(req.user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({
    name: 'id',
    example: 1,
  })
  @ApiBody({
    type: UpdateCategoryDto,
    examples: {
      example1: {
        summary: 'Update category',
        value: {
          name: 'Study',
          description: 'Study related tasks',
          color: '#22C55E',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({
    name: 'id',
    example: 1,
    description: 'Category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(req.user.id, id);
  }
}
