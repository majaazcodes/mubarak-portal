import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateGroupDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsOptional()
  @IsUUID("4")
  leaderUserId?: string;

  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
