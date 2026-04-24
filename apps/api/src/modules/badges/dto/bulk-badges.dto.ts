import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class BulkBadgesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  pilgrimIds!: string[];
}
