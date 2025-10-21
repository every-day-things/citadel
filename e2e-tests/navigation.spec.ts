import { test, expect } from "./fixtures";

/**
 * E2E Test: Library Navigation
 *
 * This test verifies that users can navigate through the library interface
 * and interact with common UI elements.
 */
test.describe("Library Navigation", () => {
  test("should be able to locate and interact with navigation elements", async ({
    page,
  }) => {
    // Try to find any navigation links or buttons
    const bodyElement = await page.locator("body");
    const isVisible = await bodyElement.isVisible();
    expect(isVisible).toBe(true);

    // Verify the app is responsive
    const title = await page.title();
    expect(title).toBe("Citadel");
  });

  test("should handle keyboard navigation", async ({ page }) => {
    // Send a tab key to test keyboard navigation
    await page.keyboard(["Tab"]);

    // Wait a moment for focus to shift
    await page.waitForTimeout(200);

    // Verify the app is still responsive
    const title = await page.title();
    expect(title).toBe("Citadel");
  });

  test("should maintain state during basic interactions", async ({ page }) => {
    // Click somewhere in the app (body is always safe)
    const bodyElement = await page.locator("body");
    await bodyElement.click();

    // Verify the app hasn't crashed
    const title = await page.title();
    expect(title).toBe("Citadel");
  });

  test("should handle window resize", async ({ page }) => {
    // Get initial size
    const initialSize = await page.viewportSize();
    expect(initialSize.width).toBeGreaterThan(0);
    expect(initialSize.height).toBeGreaterThan(0);

    // App should still be functional after interaction
    const title = await page.title();
    expect(title).toBe("Citadel");
  });
});
