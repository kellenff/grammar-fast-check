import { defineConfig, type UserConfig } from 'vitest/config';

const config: UserConfig = defineConfig({
  test: {
    include: ['examples/**/*.test.ts', 'src/**/*.test.ts'],
  },
});

export default config;
