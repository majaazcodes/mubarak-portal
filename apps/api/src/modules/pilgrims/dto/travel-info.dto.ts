import {
  IsDateString,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class TravelInfoDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/i, {
    message: "flightNo must be a valid airline code",
  })
  flightNo?: string;

  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  hotelName?: string;
}
