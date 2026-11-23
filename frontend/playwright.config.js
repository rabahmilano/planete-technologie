const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

// E2E local uniquement (voir interview playwright-e2e-builder) : dashboard sur
// 3000, boutique sur 3012 (3002 est occupé par une instance du propriétaire),
// backend 3001 simulé par page.route dans les specs (aucun appel Yalidine
// réel, aucun quota consommé). Timeouts généreux : compilation dev au premier
// accès.
module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 180000,
      cwd: __dirname,
    },
    {
      command: 'npx next dev -p 3012',
      url: 'http://localhost:3012',
      reuseExistingServer: true,
      timeout: 180000,
      cwd: process.env.BOUTIQUE_E2E_CWD || path.resolve(__dirname, '..', '..', 'planete-technologie-e-commerce'),
    },
  ],
})
