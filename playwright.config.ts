import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4321,
    // Never reuse. This said `!process.env.CI`, and the "convenience" of it
    // locally was silent dishonesty: any leftover `astro preview` (or a dev
    // server) still holding 4321 got reused, the `npm run build` in the
    // command above never ran, and the whole suite scored a stale dist while
    // reporting green. That is not a hypothetical — it happened for an entire
    // evening's work on this branch, passing tests against a build that
    // predated every change under test.
    //
    // The cost is that `npm run test:e2e` now fails outright if something else
    // holds the port, instead of quietly testing the wrong thing. That is the
    // trade this repo wants: a loud failure beats a false green. Stop the dev
    // server before running e2e.
    reuseExistingServer: false,
  },
  use: {
    baseURL: 'http://localhost:4321',
  },
});
