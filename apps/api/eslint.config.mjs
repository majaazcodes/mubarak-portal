import base from '@hajj/shared-config/eslint';

export default [
  ...base,
  {
    rules: {
      // NestJS patterns: decorated classes with injected-but-unused constructor params
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/parameter-properties': 'off',
    },
  },
];
