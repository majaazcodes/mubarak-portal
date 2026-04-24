import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { EmergencyContactDto } from "./emergency-contact.dto";
import { TravelInfoDto } from "./travel-info.dto";

export class UpdatePilgrimDto {
  @IsOptional()
  @IsString()
  @Length(5, 20)
  @Matches(/^[A-Z][0-9]{7,8}$/i)
  passportNo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsEnum(["male", "female"] as const)
  gender?: "male" | "female";

  @IsOptional()
  @IsString()
  @Length(2, 2)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @IsOptional()
  @IsEnum(["pending", "active", "completed", "issue"] as const)
  status?: "pending" | "active" | "completed" | "issue";

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TravelInfoDto)
  travel?: TravelInfoDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID("4", { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
