declare const brand: unique symbol;

export type AgencyId = string & { readonly [brand]: 'AgencyId' };
export type UserId = string & { readonly [brand]: 'UserId' };
export type PilgrimId = string & { readonly [brand]: 'PilgrimId' };

export const asAgencyId = (value: string): AgencyId => value as AgencyId;
export const asUserId = (value: string): UserId => value as UserId;
export const asPilgrimId = (value: string): PilgrimId => value as PilgrimId;
