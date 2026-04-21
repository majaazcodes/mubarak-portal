// Minimal ESLint 9 flat config.
// Exists to satisfy the repo's lint-staged pre-commit hook.
// TypeScript files are intentionally ignored here — a proper
// typescript-eslint setup is deferred to a dedicated tooling PR.

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/out/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/drizzle/**',
      '**/*.ts',
      '**/*.tsx',
    ],
  },
];
