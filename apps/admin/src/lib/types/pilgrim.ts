export type PilgrimStatus = "pending" | "active" | "completed" | "issue";
export type PilgrimGender = "male" | "female";

// Matches apps/api/src/modules/pilgrims/dto/pilgrim-summary.dto.ts
// Single source of truth lives in the backend DTO; this mirror stays in sync
// because @hajj/shared-types doesn't currently re-export it (Phase 2 cleanup).
export interface PilgrimListItem {
  id: string;
  fullName: string;
  passportNo: string;
  nationality: string | null;
  dob: string | null;
  gender: PilgrimGender;
  status: PilgrimStatus;
  createdAt: string;
}

export interface PilgrimListResponse {
  items: PilgrimListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PilgrimListFilters {
  page?: number;
  limit?: number;
  search?: string;
  groupId?: string;
  status?: PilgrimStatus;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface TravelInfo {
  flightNo?: string;
  arrivalDate?: string;
  hotelName?: string;
}

// Mirrors PilgrimWithGroups (apps/api/.../pilgrim-summary.dto.ts#26) — the
// full detail response from GET /pilgrims/:id.
export interface PilgrimDetail {
  id: string;
  agencyId: string;
  passportNo: string;
  nationalId: string | null;
  fullName: string;
  dob: string | null;
  gender: PilgrimGender;
  nationality: string | null;
  photoUrl: string | null;
  emergencyContact: EmergencyContact | null;
  travel: TravelInfo | null;
  status: PilgrimStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  groups: { id: string; name: string }[];
}

export interface CreatePilgrimInput {
  passportNo: string;
  fullName: string;
  dob: string;
  gender: PilgrimGender;
  nationality?: string;
  nationalId?: string;
  emergencyContact?: EmergencyContact;
  travel?: TravelInfo;
  groupIds?: string[];
  notes?: string;
  status?: PilgrimStatus;
}

export type UpdatePilgrimInput = Partial<CreatePilgrimInput>;

export interface CreatePilgrimResponse {
  pilgrim: PilgrimDetail;
  qrToken: string;
}

// Error envelope matches HttpExceptionFilter in the NestJS backend. `error` is
// a stable machine-readable code (e.g. PASSPORT_DUPLICATE); `message` is
// human-readable.
export interface ApiErrorEnvelope {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}
