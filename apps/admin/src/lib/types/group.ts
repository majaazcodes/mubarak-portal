export interface GroupWithPilgrimCount {
  id: string;
  agencyId: string;
  name: string;
  leaderUserId: string | null;
  departureDate: string | null;
  returnDate: string | null;
  maxSize: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  pilgrimCount: number;
}

export interface GroupListResponse {
  items: GroupWithPilgrimCount[];
}

// Mirrors apps/api/src/modules/groups/dto/create-group.dto.ts
export interface CreateGroupInput {
  name: string;
  leaderUserId?: string;
  departureDate?: string;
  returnDate?: string;
  maxSize?: number;
  notes?: string;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;
