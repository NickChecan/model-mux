import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['test/**/*.spec.ts'],
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