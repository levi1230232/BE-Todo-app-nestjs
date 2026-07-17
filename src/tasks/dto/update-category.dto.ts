import { IsInt } from 'class-validator';

export class UpdateCategoryDto {
  @IsInt()
  categoryId: number;
}
