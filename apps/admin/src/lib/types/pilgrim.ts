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
