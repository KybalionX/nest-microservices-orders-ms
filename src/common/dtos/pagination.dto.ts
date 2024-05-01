import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 10;
}
