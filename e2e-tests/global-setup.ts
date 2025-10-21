import { execSync, spawn, ChildProcess } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Global setup for Playwright tests
 *
 * This starts tauri-driver before running tests and saves the process ID
 * so we can kill it in global teardown.
 */
export default async function globalSetup() {
  console.log("\n🚀 Starting tauri-driver...");

  // Check if tauri-driver is installed
  try {
    execSync("tauri-driver --version", { stdio: "pipe" });
  } catch (error) {
    console.error("\n❌ tauri-driver is not installed!");
    console.error("Please install it with: cargo install tauri-driver\n");
    process.exit(1);
  }

  // Start tauri-driver in the background
  const tauriDriver: ChildProcess = spawn("tauri-driver", ["--port", "4445"], {
    detached: true,
    stdio: "ignore",
  });

  // Save the PID for cleanup
  const pidFile = join(__dirname, ".tauri-driver.pid");
  writeFileSync(pidFile, tauriDriver.pid!.toString());

  // Wait a bit for tauri-driver to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log(`✅ tauri-driver started on port 4445 (PID: ${tauriDriver.pid})\n`);

  // Don't wait for the process to exit
  tauriDriver.unref();
}
