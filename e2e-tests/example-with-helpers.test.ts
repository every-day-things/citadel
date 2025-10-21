import { expect } from "@wdio/globals";
import {
  waitForAppReady,
  takeScreenshot,
  findByText,
  clickElement,
  typeText,
  getTextContent,
  pressKeys,
} from "./helpers/app-helpers";

/**
 * E2E Test: Example Using Helpers
 *
 * This test demonstrates how to use the helper utilities for more
 * readable and maintainable tests (Playwright-style experience).
 */
describe("Example Test with Helpers", () => {
  before(async () => {
    // Use the helper to wait for app to be ready
    await waitForAppReady();
  });

  it("should demonstrate helper usage", async () => {
    // Take a screenshot for reference
    await takeScreenshot("app-ready");

    // Verify the app window is present
    const bodyElement = await $("body");
    expect(await bodyElement.isDisplayed()).toBe(true);

    // Example: Finding elements by text (once you have actual UI elements)
    // const libraryButton = await findByText("Library");
    // await clickElement(libraryButton);

    // Example: Using keyboard shortcuts
    await pressKeys(["Tab"]);

    // Verify app is still responsive
    const title = await browser.getTitle();
    expect(title).toBe("Citadel");
  });

  it("should handle errors gracefully", async () => {
    try {
      // This will likely fail, but shows error handling
      // await findByText("NonexistentElement");
    } catch (error) {
      // Take screenshot on error for debugging
      await takeScreenshot("error-state");
    }

    // App should still be functional
    const title = await browser.getTitle();
    expect(title).toBe("Citadel");
  });
});

/**
 * NOTE: To create effective tests for your Citadel app:
 *
 * 1. Add data-testid attributes to key UI elements in your React components:
 *    <button data-testid="add-book-button">Add Book</button>
 *
 * 2. Use the helpers in this way:
 *    const addButton = await findByTestId("add-book-button");
 *    await clickElement(addButton);
 *
 * 3. Test user workflows:
 *    - Opening a library
 *    - Adding a book
 *    - Searching for books
 *    - Editing book metadata
 *    - Exporting/importing data
 *
 * 4. Test error states:
 *    - Invalid file formats
 *    - Missing files
 *    - Network errors
 *
 * 5. Test keyboard navigation:
 *    - Tab order
 *    - Shortcuts (Cmd+N, Cmd+O, etc.)
 *    - Accessibility features
 */
