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
