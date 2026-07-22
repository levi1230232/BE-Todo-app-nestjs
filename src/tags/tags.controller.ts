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
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@UseGuards(JwtGuard)
@Controller('tags')
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @ApiOperation({
    summary: 'Create a new tag',
    description: 'Create a personal tag or a team tag.',
  })
  @ApiBody({ type: CreateTagDto })
  @ApiResponse({
    status: 201,
    description: 'Tag created successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @ApiForbiddenResponse({ description: 'You are not a member of this team' })
  @Post()
  create(@Req() req, @Body() dto: CreateTagDto) {
    return this.tagsService.create(req.user.id, dto);
  }

  @ApiOperation({
    summary: 'Get all personal tags',
  })
  @ApiResponse({
    status: 200,
    description: 'List of personal tags.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @Get('personal')
  findPersonal(@Req() req) {
    return this.tagsService.findAllPersonal(req.user.id);
  }
  @ApiOperation({
    summary: 'Get the list of tags for a team',
  })
  @ApiParam({
    name: 'teamId',
    type: Number,
    example: 1,
    description: 'Team ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of team tags.',
  })
  @ApiForbiddenResponse({
    description: 'User is not a member of this team.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @ApiNotFoundResponse({
    description: 'Team not found.',
  })
  @Get('team/:teamId')
  findTeam(@Req() req, @Param('teamId', ParseIntPipe) teamId: number) {
    return this.tagsService.findAllTeam(teamId, req.user.id);
  }
  @ApiOperation({
    summary: 'Get tag detail',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 5,
    description: 'Tag ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag detail.',
  })
  @ApiNotFoundResponse({
    description: 'Tag not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @ApiForbiddenResponse({ description: 'You do not have permission' })
  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.tagsService.findOne(id, req.user.id);
  }
  @ApiOperation({
    summary: 'Update tag',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 5,
    description: 'Tag ID',
  })
  @ApiBody({
    type: UpdateTagDto,
    examples: {
      example1: {
        summary: 'Update category',
        value: {
          name: 'Deployment',
          color: '#F97316',
          teamId: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tag updated successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Tag not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @ApiConflictResponse({ description: 'Tag already exists' })
  @ApiForbiddenResponse({ description: 'You do not have permission' })
  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, req.user.id, dto);
  }
  @ApiOperation({
    summary: 'Delete tag',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 5,
    description: 'Tag ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Tag deleted successfully.',
  })
  @ApiNotFoundResponse({
    description: 'Tag not found.',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized.',
  })
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.tagsService.remove(id, req.user.id);
  }
}
