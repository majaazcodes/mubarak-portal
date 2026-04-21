import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts", "tests/**/*.spec.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks",
    forks: { singleFork: true },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/modules/auth/auth.service.ts",
        "src/modules/auth/token.service.ts",
        "src/common/guards/roles.guard.ts",
        "src/common/guards/tenant.guard.ts",
      ],
      exclude: ["**/*.spec.ts"],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
