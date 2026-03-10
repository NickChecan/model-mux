import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['test/**/*.spec.ts'],
        exclude: ['test/integration/**'],
        env: {
            SUPPRESS_NO_CONFIG_WARNING: 'true',
        },
        globals: true,
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/index.ts'],
            reporter: ['text', 'lcov'],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
})