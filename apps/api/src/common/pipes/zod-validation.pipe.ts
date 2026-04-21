import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import type { ZodSchema } from "zod";

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw new BadRequestException({
        error: "BadRequest",
        message: "Validation failed",
        fields: fieldErrors,
      });
    }
    return result.data;
  }
}
