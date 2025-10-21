import { existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

/**
 * Global teardown for Playwright tests
 *
 * This stops the tauri-driver process that was started in global setup.
 */
export default async function globalTeardown() {
  console.log("\n🛑 Stopping tauri-driver...");

  const pidFile = join(__dirname, ".tauri-driver.pid");

  if (!existsSync(pidFile)) {
    console.log("⚠️  No PID file found, tauri-driver may not have started");
    return;
  }

  try {
    const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);

    // Kill the process
    process.kill(pid, "SIGTERM");

    // Clean up PID file
    unlinkSync(pidFile);

    console.log(`✅ tauri-driver stopped (PID: ${pid})\n`);
  } catch (error) {
    console.error("❌ Failed to stop tauri-driver:", error);
  }
}
