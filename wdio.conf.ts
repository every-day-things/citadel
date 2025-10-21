import type { Options } from "@wdio/types";
import { join } from "path";
import { platform } from "os";

/**
 * WebdriverIO configuration for Tauri E2E tests
 *
 * This configuration uses tauri-driver to automate the Citadel desktop app.
 * tauri-driver must be installed separately: cargo install tauri-driver
 */

// Determine the application binary path based on the platform
const APPLICATION_PATH = (() => {
  const appName = "Citadel";
  const targetDir = join(process.cwd(), "src-tauri", "target", "release");

  switch (platform()) {
    case "darwin":
      return join(targetDir, "bundle", "macos", `${appName}.app`);
    case "linux":
      return join(targetDir, appName.toLowerCase());
    case "win32":
      return join(targetDir, `${appName}.exe`);
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
})();

export const config: Options.Testrunner = {
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort.
  runner: "local",

  //
  // Specify test files
  specs: ["./e2e-tests/**/*.test.ts"],

  // Patterns to exclude
  exclude: [],

  //
  // Capabilities define how tauri-driver should start the app
  capabilities: [
    {
      "tauri:options": {
        application: APPLICATION_PATH,
      },
    },
  ],

  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: "info",

  //
  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,

  //
  // Default timeout for all waitFor* commands.
  waitforTimeout: 10000,

  //
  // Default timeout in milliseconds for request
  connectionRetryTimeout: 120000,

  //
  // Default request retries count
  connectionRetryCount: 3,

  //
  // Test framework to use
  framework: "mocha",

  //
  // Test reporter for stdout
  reporters: ["spec"],

  //
  // Options to be passed to Mocha
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  //
  // Hooks
  //
  // Gets executed before test execution begins
  before: async function () {
    // Add any global setup here
    console.log("Starting Citadel E2E tests...");
  },

  //
  // Gets executed after all tests are done
  after: async function () {
    // Add any global teardown here
    console.log("Citadel E2E tests completed.");
  },

  //
  // Gets executed before each test
  beforeTest: async function () {
    // Reset app state if needed
  },

  //
  // Gets executed after each test
  afterTest: async function (test, context, { error, result, duration, passed, retries }) {
    // Take screenshot on failure
    if (error) {
      await browser.saveScreenshot(
        `./e2e-tests/screenshots/failure-${test.title.replace(/\s+/g, "-")}.png`
      );
    }
  },

  //
  // Port where tauri-driver will run
  port: 4445,

  //
  // Path where tauri-driver binary is located
  // If tauri-driver is in your PATH, you can just use "tauri-driver"
  // Otherwise, provide the full path to the binary
  hostname: "localhost",
  path: "/",

  //
  // Auto-compile configuration for TypeScript
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: "./tsconfig.json",
    },
  },
};
