import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { NODE_ENV: 'test' },
    globalSetup: './test/globalSetup.mjs',
    setupFiles: './test/setup.js',
    pool: 'forks',
    fileParallelism: false, // all files share one test database
    hookTimeout: 30000
  }
});
