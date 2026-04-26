import nextCoreWebVitalsConfig from 'eslint-config-next/core-web-vitals';
import nextTypescriptConfig from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier/flat';

const config = [
  {
    ignores: ['drizzle/**'],
  },
  ...nextCoreWebVitalsConfig,
  ...nextTypescriptConfig,
  prettierConfig,
];

export default config;
