import { IsString, Length, Matches } from "class-validator";

export class EmergencyContactDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: "phone must be 7-15 digits, optional leading +",
  })
  phone!: string;

  @IsString()
  @Length(2, 50)
  relation!: string;
}
