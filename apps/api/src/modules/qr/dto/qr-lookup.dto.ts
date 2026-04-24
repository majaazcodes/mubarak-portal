import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

export class QrLookupDto {
  @IsString()
  @Length(43, 43)
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: "token must be 43 base64url chars",
  })
  token!: string;

  @IsString()
  @Length(1, 100)
  deviceId!: string;

  @IsOptional()
  @IsISO8601()
  scannedAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
