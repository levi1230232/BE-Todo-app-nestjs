import { IsInt } from 'class-validator';

export class AssignTaskDto {
  @IsInt()
  assignedTo: number;
}
