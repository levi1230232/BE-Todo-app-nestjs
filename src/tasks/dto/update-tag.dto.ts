import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class UpdateTagsDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  tagIds: number[];
}
