import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";

export class PilgrimNotFoundException extends NotFoundException {
  constructor() {
    super({ error: "PILGRIM_NOT_FOUND", message: "Pilgrim not found" });
  }
}

export class PassportDuplicateException extends ConflictException {
  constructor(passportNo: string) {
    super({
      error: "PASSPORT_DUPLICATE",
      message: `Passport ${passportNo} already exists in your agency`,
    });
  }
}

export class QrNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: "QR_NOT_FOUND",
      message: "QR code not found or revoked",
    });
  }
}

export class QrRevokedException extends HttpException {
  constructor() {
    super(
      { error: "QR_REVOKED", message: "QR code was revoked" },
      HttpStatus.GONE,
    );
  }
}

export class CrossAgencyScanException extends ForbiddenException {
  constructor() {
    super({
      error: "CROSS_AGENCY_SCAN",
      message: "QR code does not belong to your agency",
    });
  }
}

export class InvalidTokenFormatException extends BadRequestException {
  constructor() {
    super({
      error: "INVALID_TOKEN_FORMAT",
      message: "Invalid QR token format",
    });
  }
}

export class GroupHasPilgrimsException extends ConflictException {
  constructor(count: number) {
    super({
      error: "GROUP_HAS_PILGRIMS",
      message: `Cannot delete group with ${count} assigned pilgrim${count === 1 ? "" : "s"}`,
      count,
    });
  }
}

export class GroupNotFoundException extends NotFoundException {
  constructor() {
    super({ error: "GROUP_NOT_FOUND", message: "Group not found" });
  }
}

export class BulkLimitExceededException extends BadRequestException {
  constructor(limit: number) {
    super({
      error: "BULK_LIMIT_EXCEEDED",
      message: `Maximum ${limit} items per request`,
      limit,
    });
  }
}
