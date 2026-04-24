import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListGroupsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface GroupWithPilgrimCount {
  id: string;
  agencyId: string;
  name: string;
  leaderUserId: string | null;
  departureDate: string | null;
  returnDate: string | null;
  maxSize: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  pilgrimCount: number;
}
