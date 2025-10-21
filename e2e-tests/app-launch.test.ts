import { expect } from "@wdio/globals";

/**
 * E2E Test: Application Launch
 *
 * This test verifies that the Citadel application launches successfully
 * and displays the expected initial UI elements.
 */
describe("Citadel Application Launch", () => {
  it("should launch the application successfully", async () => {
    // Wait for the application window to be ready
    await browser.waitUntil(
      async () => {
        const title = await browser.getTitle();
        return title === "Citadel";
      },
      {
        timeout: 10000,
        timeoutMsg: "Application window did not load within 10 seconds",
      }
    );

    // Verify the window title
    const title = await browser.getTitle();
    expect(title).toBe("Citadel");
  });

  it("should display the main application container", async () => {
    // Wait for the main app container to be present
    const appContainer = await $("body");
    await appContainer.waitForExist({ timeout: 5000 });

    // Verify the container is displayed
    const isDisplayed = await appContainer.isDisplayed();
    expect(isDisplayed).toBe(true);
  });

  it("should have a valid viewport size", async () => {
    // Get the window size
    const windowSize = await browser.getWindowSize();

    // Verify the window size matches our Tauri config (1200x800)
    // Note: Actual size might be slightly different due to window decorations
    expect(windowSize.width).toBeGreaterThanOrEqual(1000);
    expect(windowSize.height).toBeGreaterThanOrEqual(700);
  });
});
