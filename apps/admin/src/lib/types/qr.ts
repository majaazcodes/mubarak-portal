// Matches QrCode row shape from the backend.
export interface QrCode {
  id: string;
  pilgrimId: string;
  token: string;
  version: number;
  issuedAt: string;
  revokedAt: string | null;
}
