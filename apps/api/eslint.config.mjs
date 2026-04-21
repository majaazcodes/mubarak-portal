import base from '@hajj/shared-config/eslint';

export default [
  ...base,
  {
    rules: {
      // NestJS patterns: decorated classes with injected-but-unused constructor params
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/parameter-properties': 'off',
      // NestJS DI relies on value imports of classes used as constructor parameter
      // types (emitDecoratorMetadata). `consistent-type-imports` would auto-fix
      // those to `import type`, which erases the runtime class reference and
      // breaks DI. Keep as value imports throughout the api codebase.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
