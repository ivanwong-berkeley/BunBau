import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: 'docs/test-reports/v2.0/junit.xml' },
  },
});
