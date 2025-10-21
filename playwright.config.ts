import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Citadel E2E tests
 *
 * This is an experimental setup that uses Playwright's test runner
 * with tauri-driver for automating the Tauri desktop application.
 *
 * Note: tauri-driver must be installed separately and running:
 *   cargo install tauri-driver
 *   tauri-driver --port 4445
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e-tests",

  // Test file pattern
  testMatch: "**/*.spec.ts",

  // Maximum time one test can run
  timeout: 60000,

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: 1,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "e2e-tests/test-results/html" }],
    ["list"],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for the app (not used for Tauri, but required by Playwright)
    baseURL: "tauri://localhost",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",
  },

  // Configure projects for different scenarios
  projects: [
    {
      name: "tauri-app",
      use: {
        ...devices["Desktop Chrome"],
        // Custom fixture will handle tauri-driver connection
      },
    },
  ],

  // Global setup/teardown
  globalSetup: require.resolve("./e2e-tests/global-setup.ts"),
  globalTeardown: require.resolve("./e2e-tests/global-teardown.ts"),
});
