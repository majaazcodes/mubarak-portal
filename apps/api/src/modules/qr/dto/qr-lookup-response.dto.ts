export interface QrLookupResponse {
  pilgrimId: string;
  fullName: string;
  passportNo: string;
  nationality: string | null;
  gender: "male" | "female";
  status: "pending" | "active" | "completed" | "issue";
  photoUrl: string | null;
  groupName: string | null;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  } | null;
  scannedAt: string;
  cached: boolean;
}
