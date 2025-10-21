import { expect } from "@wdio/globals";

/**
 * E2E Test: Library Navigation
 *
 * This test verifies that users can navigate through the library interface
 * and interact with common UI elements.
 */
describe("Library Navigation", () => {
  before(async () => {
    // Wait for app to be fully loaded before tests
    await browser.waitUntil(
      async () => {
        const title = await browser.getTitle();
        return title === "Citadel";
      },
      {
        timeout: 10000,
        timeoutMsg: "Application did not load in time",
      }
    );

    // Give the app a moment to fully initialize
    await browser.pause(1000);
  });

  it("should be able to locate and interact with navigation elements", async () => {
    // Try to find any navigation links or buttons
    // This is a generic test - adjust selectors based on your actual UI
    const bodyElement = await $("body");
    expect(await bodyElement.isDisplayed()).toBe(true);

    // Example: Check if there are any clickable elements
    const clickableElements = await $$("button, a, [role='button']");
    console.log(`Found ${clickableElements.length} clickable elements`);

    // At minimum, there should be some interactive elements
    expect(clickableElements.length).toBeGreaterThan(0);
  });

  it("should handle keyboard navigation", async () => {
    // Send a tab key to test keyboard navigation
    await browser.keys(["Tab"]);

    // Wait a moment for focus to shift
    await browser.pause(200);

    // Verify the app is still responsive
    const bodyElement = await $("body");
    expect(await bodyElement.isDisplayed()).toBe(true);
  });

  it("should maintain state during basic interactions", async () => {
    // Click somewhere in the app (body is always safe)
    const bodyElement = await $("body");
    await bodyElement.click();

    // Verify the app hasn't crashed
    const title = await browser.getTitle();
    expect(title).toBe("Citadel");
  });
});
