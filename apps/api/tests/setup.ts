import "reflect-metadata";
import { config } from "dotenv";

config();

// Ensure test-specific env overrides do not leak into dev DB.
if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL =
    "postgresql://hajj:devonly@localhost:5432/hajj_test";
}
