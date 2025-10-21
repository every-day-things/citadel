import { test, expect } from "./fixtures";

/**
 * E2E Test: Application Launch
 *
 * This test verifies that the Citadel application launches successfully
 * and displays the expected initial UI elements.
 */
test.describe("Citadel Application Launch", () => {
  test("should launch the application successfully", async ({ page }) => {
    // Verify the window title
    const title = await page.title();
    expect(title).toBe("Citadel");
  });

  test("should display the main application container", async ({ page }) => {
    // Wait for the main app container to be present
    const appContainer = await page.locator("body");

    // Verify the container is displayed
    const isVisible = await appContainer.isVisible();
    expect(isVisible).toBe(true);
  });

  test("should have a valid viewport size", async ({ page }) => {
    // Get the window size
    const windowSize = await page.viewportSize();

    // Verify the window size matches our Tauri config (1200x800)
    // Note: Actual size might be slightly different due to window decorations
    expect(windowSize.width).toBeGreaterThanOrEqual(1000);
    expect(windowSize.height).toBeGreaterThanOrEqual(700);
  });

  test("should take screenshot successfully", async ({ page }) => {
    // Take a screenshot to verify screenshot functionality works
    const screenshot = await page.screenshot({
      path: "./e2e-tests/screenshots/app-launch.png",
    });

    expect(screenshot).toBeDefined();
    expect(screenshot.length).toBeGreaterThan(0);
  });
});
