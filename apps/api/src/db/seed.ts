import "dotenv/config";
import { randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker/locale/en_IN";
import { Algorithm, hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { closeDb, db } from "./client";
import {
  agencies,
  auditLogs,
  groups,
  pilgrimGroups,
  pilgrims,
  qrCodes,
  users,
} from "./schema";
import type {
  EmergencyContact,
  Gender,
  NewGroup,
  NewPilgrim,
  NewQrCode,
  PilgrimTravel,
} from "./types";

const MALE_FIRST_NAMES = [
  "Mohammed",
  "Ahmed",
  "Ali",
  "Hassan",
  "Hussain",
  "Omar",
  "Abdullah",
  "Yusuf",
  "Ibrahim",
  "Ismail",
  "Bilal",
  "Zaid",
  "Imran",
  "Farhan",
  "Salman",
  "Faisal",
  "Tariq",
  "Rashid",
  "Khalid",
  "Nasir",
  "Saeed",
  "Mustafa",
  "Anwar",
  "Arif",
  "Javed",
  "Kamal",
  "Naeem",
  "Rafi",
  "Shahid",
  "Waseem",
  "Azhar",
  "Irfan",
  "Junaid",
  "Majid",
  "Qasim",
];

const FEMALE_FIRST_NAMES = [
  "Fatima",
  "Ayesha",
  "Khadija",
  "Maryam",
  "Zainab",
  "Hafsa",
  "Ruqayyah",
  "Safiya",
  "Aminah",
  "Sumayyah",
  "Asiyah",
  "Nusaybah",
  "Habibah",
  "Razia",
  "Shabnam",
  "Yasmin",
  "Nasreen",
  "Farah",
  "Saira",
  "Rukhsana",
  "Rehana",
  "Shabana",
  "Tahira",
  "Zubaida",
  "Parveen",
  "Nazia",
  "Ruksana",
  "Naseem",
  "Bushra",
  "Mehjabeen",
  "Afshan",
  "Shaheen",
];

const SURNAMES = [
  "Khan",
  "Ahmed",
  "Shaikh",
  "Sayyed",
  "Ansari",
  "Qureshi",
  "Siddiqui",
  "Patel",
  "Mansuri",
  "Memon",
  "Pathan",
  "Shah",
  "Mirza",
  "Rizvi",
  "Naqvi",
  "Hashmi",
  "Farooqui",
  "Usmani",
  "Nadvi",
  "Rahmani",
  "Chishti",
  "Tyagi",
  "Sheikh",
  "Syed",
  "Baig",
  "Khatri",
];

const RELATIONS = ["son", "daughter", "spouse", "brother"];
const HOTELS = ["Dar Al Tawhid", "Hilton Makkah", "Conrad", "Swissotel"];
const FLIGHT_CARRIERS = ["AI", "SV", "6E", "EK", "QR"];

const PILGRIM_COUNT = 1000;
const BATCH_SIZE = 100;
const PILGRIMS_PER_GROUP = 200;

function pick<T>(arr: readonly T[]): T {
  const i = faker.number.int({ min: 0, max: arr.length - 1 });
  return arr[i] as T;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function hashPassword(plain: string): Promise<string> {
  return hash(plain, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

function generatePassportNo(used: Set<string>): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (;;) {
    const letter = letters[
      faker.number.int({ min: 0, max: letters.length - 1 })
    ] as string;
    const digits = faker.string.numeric(7);
    const candidate = `${letter}${digits}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

function generateFlightNo(): string {
  const carrier = pick(FLIGHT_CARRIERS);
  return `${carrier}${faker.string.numeric({ length: 3, allowLeadingZeros: false })}`;
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  faker.seed(42);

  const overallStart = Date.now();

  const existing = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.name, "Mubarak Travels"))
    .limit(1);

  if (existing.length > 0) {
    console.log("[seed] Already seeded. Run db:reset to clean.");
    await closeDb();
    process.exit(0);
  }

  await db.transaction(async (tx) => {
    // Step 1: super admin
    let t = Date.now();
    process.stdout.write("Seeding super admin... ");
    const superAdminHash = await hashPassword("Admin@123");
    await tx.insert(users).values({
      agencyId: null,
      email: "admin@hajj-platform.com",
      passwordHash: superAdminHash,
      role: "super_admin",
      fullName: "Platform Admin",
      status: "active",
    });
    console.log(`✓ (${Date.now() - t}ms)`);

    // Step 2: agency
    t = Date.now();
    process.stdout.write("Seeding Mubarak Travels agency... ");
    const [agency] = await tx
      .insert(agencies)
      .values({
        name: "Mubarak Travels",
        country: "IN",
        contactEmail: "contact@mubaraktravels.com",
        contactPhone: "+919000000000",
        plan: "standard",
        status: "active",
      })
      .returning({ id: agencies.id });
    if (!agency) throw new Error("failed to insert agency");
    console.log(`✓ (${Date.now() - t}ms)`);

    // Step 3+4: agency admin + 3 operators
    t = Date.now();
    process.stdout.write("Seeding 4 agency users... ");
    const agencyAdminHash = await hashPassword("Mubarak@123");
    const staffHash = await hashPassword("Staff@123");
    const agencyUsers = await tx
      .insert(users)
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
          fullName: `${pick(MALE_FIRST_NAMES)} ${pick(SURNAMES)}`,
          status: "active",
        },
        {
          agencyId: agency.id,
          email: "staff2@mubarak.com",
          passwordHash: staffHash,
          role: "operator",
          fullName: `${pick(FEMALE_FIRST_NAMES)} ${pick(SURNAMES)}`,
          status: "active",
        },
        {
          agencyId: agency.id,
          email: "staff3@mubarak.com",
          passwordHash: staffHash,
          role: "operator",
          fullName: `${pick(MALE_FIRST_NAMES)} ${pick(SURNAMES)}`,
          status: "active",
        },
      ])
      .returning({ id: users.id, email: users.email });

    const staff1 = agencyUsers.find((u) => u.email === "staff1@mubarak.com");
    const staff2 = agencyUsers.find((u) => u.email === "staff2@mubarak.com");
    const staff3 = agencyUsers.find((u) => u.email === "staff3@mubarak.com");
    if (!staff1 || !staff2 || !staff3) throw new Error("missing staff user");
    console.log(`✓ (${Date.now() - t}ms)`);

    // Step 5: 5 groups
    t = Date.now();
    process.stdout.write("Seeding 5 groups... ");
    const groupDefs: NewGroup[] = [
      {
        agencyId: agency.id,
        name: "Group A - Delhi",
        leaderUserId: staff1.id,
        departureDate: "2026-05-25",
        returnDate: "2026-06-20",
        maxSize: 250,
      },
      {
        agencyId: agency.id,
        name: "Group B - Mumbai",
        leaderUserId: staff1.id,
        departureDate: "2026-05-26",
        returnDate: "2026-06-20",
        maxSize: 250,
      },
      {
        agencyId: agency.id,
        name: "Group C - Hyderabad",
        leaderUserId: staff2.id,
        departureDate: "2026-05-27",
        returnDate: "2026-06-20",
        maxSize: 250,
      },
      {
        agencyId: agency.id,
        name: "Group D - Lucknow",
        leaderUserId: staff2.id,
        departureDate: "2026-05-28",
        returnDate: "2026-06-20",
        maxSize: 250,
      },
      {
        agencyId: agency.id,
        name: "Group E - Bhopal",
        leaderUserId: staff3.id,
        departureDate: "2026-05-29",
        returnDate: "2026-06-20",
        maxSize: 250,
      },
    ];
    const insertedGroups = await tx.insert(groups).values(groupDefs).returning({
      id: groups.id,
      name: groups.name,
      departureDate: groups.departureDate,
    });
    console.log(`✓ (${Date.now() - t}ms)`);

    // Step 6: 1000 pilgrims
    t = Date.now();
    process.stdout.write(
      `Seeding ${PILGRIM_COUNT} pilgrims (batches of ${BATCH_SIZE})... `,
    );
    const passportSet = new Set<string>();
    const pilgrimRows: NewPilgrim[] = [];

    for (let i = 0; i < PILGRIM_COUNT; i++) {
      const groupIdx = Math.floor(i / PILGRIMS_PER_GROUP);
      const group = insertedGroups[groupIdx];
      if (!group) throw new Error(`no group for index ${groupIdx}`);

      const genderVal: Gender = i % 2 === 0 ? "male" : "female";
      const firstName =
        genderVal === "male"
          ? pick(MALE_FIRST_NAMES)
          : pick(FEMALE_FIRST_NAMES);
      const surname = pick(SURNAMES);
      const fullName = `${firstName} ${surname}`;

      const dobDate = faker.date.between({
        from: "1950-01-01T00:00:00Z",
        to: "1985-12-31T23:59:59Z",
      });
      const dob = dobDate.toISOString().slice(0, 10);

      const emergencyContact: EmergencyContact = {
        name: `${pick(genderVal === "male" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES)} ${surname}`,
        phone: `+91${faker.string.numeric(10)}`,
        relation: pick(RELATIONS),
      };

      const arrivalDate = group.departureDate
        ? addDays(group.departureDate, 1)
        : "2026-05-30";

      const travel: PilgrimTravel = {
        flightNo: generateFlightNo(),
        arrivalDate,
        hotelName: pick(HOTELS),
      };

      pilgrimRows.push({
        agencyId: agency.id,
        passportNo: generatePassportNo(passportSet),
        nationalId: faker.string.numeric(12),
        fullName,
        dob,
        gender: genderVal,
        nationality: "IN",
        emergencyContact,
        travel,
        status: "active",
      });
    }

    const insertedPilgrimIds: string[] = [];
    for (const batch of chunk(pilgrimRows, BATCH_SIZE)) {
      const rows = await tx
        .insert(pilgrims)
        .values(batch)
        .returning({ id: pilgrims.id });
      for (const r of rows) insertedPilgrimIds.push(r.id);
    }
    console.log(`✓ (${((Date.now() - t) / 1000).toFixed(2)}s)`);

    // Step 7: assign to groups
    t = Date.now();
    process.stdout.write("Assigning pilgrims to groups... ");
    const assignments = insertedPilgrimIds.map((pilgrimId, idx) => {
      const groupIdx = Math.floor(idx / PILGRIMS_PER_GROUP);
      const group = insertedGroups[groupIdx];
      if (!group) throw new Error(`no group for assignment ${idx}`);
      return { pilgrimId, groupId: group.id };
    });
    for (const batch of chunk(assignments, BATCH_SIZE)) {
      await tx.insert(pilgrimGroups).values(batch);
    }
    console.log(`✓ (${Date.now() - t}ms)`);

    // Step 8: QR codes
    t = Date.now();
    process.stdout.write(`Generating ${PILGRIM_COUNT} QR codes... `);
    const tokenSet = new Set<string>();
    const qrRows: NewQrCode[] = insertedPilgrimIds.map((pilgrimId) => {
      let token = generateToken();
      while (tokenSet.has(token)) token = generateToken();
      tokenSet.add(token);
      return { pilgrimId, token, version: 1 };
    });

    for (const batch of chunk(qrRows, BATCH_SIZE)) {
      let attempt = 0;
      for (;;) {
        try {
          await tx.insert(qrCodes).values(batch);
          break;
        } catch (err) {
          attempt++;
          if (attempt > 3) throw err;
          for (const row of batch) {
            let t2 = generateToken();
            while (tokenSet.has(t2)) t2 = generateToken();
            tokenSet.add(t2);
            row.token = t2;
          }
        }
      }
    }
    console.log(`✓ (${Date.now() - t}ms)`);

    // touch audit_logs to ensure table is reachable from seed context (no-op insert for system init)
    await tx.insert(auditLogs).values({
      agencyId: agency.id,
      userId: null,
      action: "create",
      entityType: "seed",
      entityId: null,
      after: { note: "initial seed" },
      ip: "127.0.0.1",
      userAgent: "seed-script",
    });
  });

  const totalSec = ((Date.now() - overallStart) / 1000).toFixed(2);
  console.log(
    `\n✓ Seeded 1 agency, 5 users, 5 groups, ${PILGRIM_COUNT} pilgrims, ${PILGRIM_COUNT} QR codes, ${PILGRIM_COUNT} group assignments in ${totalSec}s`,
  );

  await closeDb();
}

main().catch((err: unknown) => {
  console.error("\n[seed] failed:", err);
  process.exit(1);
});
