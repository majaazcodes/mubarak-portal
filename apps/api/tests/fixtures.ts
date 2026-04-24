import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { ARGON_OPTS } from "../src/modules/auth/argon";

export interface FixtureData {
  agencyId: string;
  adminUserId: string;
  staffUserId: string;
  groupAId: string;
  groupBId: string;
  pilgrimIds: string[];
  qrTokens: string[];
  sql: postgres.Sql;
}

function testUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    "postgresql://hajj:devonly@localhost:5432/hajj_test"
  );
}

export async function resetAndSeed(): Promise<FixtureData> {
  const sql = postgres(testUrl(), {
    max: 2,
    onnotice: () => {
      /* silence */
    },
  });
  const db = drizzle(sql, { schema });

  // Truncate in FK-safe order via CASCADE on tenant root.
  await sql.unsafe(
    `TRUNCATE TABLE audit_logs, scan_logs, qr_codes, pilgrim_groups, pilgrims, groups, users, agencies RESTART IDENTITY CASCADE`,
  );

  const agencyAdminHash = await hash("Mubarak@123", ARGON_OPTS);
  const staffHash = await hash("Staff@123", ARGON_OPTS);

  const [agency] = await db
    .insert(schema.agencies)
    .values({
      name: "Mubarak Travels",
      country: "IN",
      contactEmail: "contact@mubaraktravels.com",
      plan: "standard",
      status: "active",
    })
    .returning({ id: schema.agencies.id });
  if (!agency) throw new Error("agency insert failed");

  const users = await db
    .insert(schema.users)
    .values([
      {
        agencyId: agency.id,
        email: "admin@mubarak.com",
        passwordHash: agencyAdminHash,
        role: "agency_admin",
        fullName: "Majaaz",
        status: "active",
      },
      {
        agencyId: agency.id,
        email: "staff1@mubarak.com",
        passwordHash: staffHash,
        role: "operator",
        fullName: "Staff One",
        status: "active",
      },
    ])
    .returning({ id: schema.users.id, email: schema.users.email });

  const admin = users.find((u) => u.email === "admin@mubarak.com");
  const staff = users.find((u) => u.email === "staff1@mubarak.com");
  if (!admin || !staff) throw new Error("user insert failed");

  const createdGroups = await db
    .insert(schema.groups)
    .values([
      {
        agencyId: agency.id,
        name: "Group A - Delhi",
        departureDate: "2026-05-25",
        returnDate: "2026-06-20",
        maxSize: 250,
        leaderUserId: staff.id,
      },
      {
        agencyId: agency.id,
        name: "Group B - Mumbai",
        departureDate: "2026-05-26",
        returnDate: "2026-06-20",
        maxSize: 250,
        leaderUserId: staff.id,
      },
    ])
    .returning({ id: schema.groups.id });

  const groupA = createdGroups[0];
  const groupB = createdGroups[1];
  if (!groupA || !groupB) throw new Error("group insert failed");

  const pilgrims = await db
    .insert(schema.pilgrims)
    .values([
      {
        agencyId: agency.id,
        passportNo: "A1000001",
        fullName: "Mohammed Test Khan",
        dob: "1970-01-01",
        gender: "male",
        nationality: "IN",
        status: "active",
      },
      {
        agencyId: agency.id,
        passportNo: "A1000002",
        fullName: "Fatima Test Ahmed",
        dob: "1975-03-15",
        gender: "female",
        nationality: "IN",
        status: "active",
      },
      {
        agencyId: agency.id,
        passportNo: "A1000003",
        fullName: "Ibrahim Test Shaikh",
        dob: "1960-07-20",
        gender: "male",
        nationality: "IN",
        status: "active",
      },
      {
        agencyId: agency.id,
        passportNo: "A1000004",
        fullName: "Ayesha Test Patel",
        dob: "1968-12-10",
        gender: "female",
        nationality: "IN",
        status: "active",
      },
      {
        agencyId: agency.id,
        passportNo: "A1000005",
        fullName: "Omar Test Syed",
        dob: "1955-05-05",
        gender: "male",
        nationality: "IN",
        status: "active",
      },
    ])
    .returning({ id: schema.pilgrims.id });

  const pilgrimIds = pilgrims.map((p) => p.id);
  if (pilgrimIds.length === 0) throw new Error("pilgrim insert failed");

  await db.insert(schema.pilgrimGroups).values([
    { pilgrimId: pilgrimIds[0]!, groupId: groupA.id },
    { pilgrimId: pilgrimIds[1]!, groupId: groupA.id },
    { pilgrimId: pilgrimIds[2]!, groupId: groupB.id },
  ]);

  const qrTokens = pilgrimIds.map(() => randomBytes(32).toString("base64url"));
  await db.insert(schema.qrCodes).values(
    pilgrimIds.map((pid, i) => ({
      pilgrimId: pid,
      token: qrTokens[i]!,
      version: 1,
    })),
  );

  return {
    agencyId: agency.id,
    adminUserId: admin.id,
    staffUserId: staff.id,
    groupAId: groupA.id,
    groupBId: groupB.id,
    pilgrimIds,
    qrTokens,
    sql,
  };
}

export async function closeFixtureClient(data: FixtureData): Promise<void> {
  await data.sql.end({ timeout: 5 });
}
