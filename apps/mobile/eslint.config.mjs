import base from '@hajj/shared-config/eslint';

export default [
  ...base,
  {
    ignores: ['.expo/**', 'babel.config.js', 'metro.config.js'],
  },
];
