import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['test/**/*.spec.ts'],
        env: {
            SUPPRESS_NO_CONFIG_WARNING: 'true',
        },
        globals: true,
        testTimeout: 30000
    },
})