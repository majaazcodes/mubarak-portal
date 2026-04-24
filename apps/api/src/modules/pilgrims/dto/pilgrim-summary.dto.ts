import type {
  EmergencyContact,
  Pilgrim,
  PilgrimTravel,
} from "../../../db/types";

export interface PilgrimListItem {
  id: string;
  fullName: string;
  passportNo: string;
  nationality: string | null;
  dob: string | null;
  gender: "male" | "female";
  status: "pending" | "active" | "completed" | "issue";
  createdAt: Date;
}

export interface PilgrimListResponse {
  items: PilgrimListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PilgrimWithGroups extends Pilgrim {
  groups: { id: string; name: string }[];
  emergencyContact: EmergencyContact | null;
  travel: PilgrimTravel | null;
}
