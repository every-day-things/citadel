/**
 * E2E Test Helpers for Citadel Application
 *
 * This module provides utility functions to make E2E tests more readable
 * and maintainable. These helpers abstract common operations and provide
 * a Playwright-like experience with WebdriverIO.
 */

/**
 * Wait for the application to be fully loaded and ready
 */
export async function waitForAppReady(timeout = 10000): Promise<void> {
  await browser.waitUntil(
    async () => {
      try {
        const title = await browser.getTitle();
        return title === "Citadel";
      } catch (error) {
        return false;
      }
    },
    {
      timeout,
      timeoutMsg: `Application did not load within ${timeout}ms`,
    }
  );

  // Give the app a moment to fully initialize
  await browser.pause(500);
}

/**
 * Take a screenshot with a descriptive name
 * Useful for debugging test failures
 */
export async function takeScreenshot(name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `./e2e-tests/screenshots/${name}-${timestamp}.png`;
  await browser.saveScreenshot(filename);
  console.log(`Screenshot saved: ${filename}`);
}

/**
 * Find element by text content (similar to Playwright's getByText)
 */
export async function findByText(text: string): Promise<WebdriverIO.Element> {
  const xpath = `//*[contains(text(), "${text}")]`;
  const element = await $(xpath);
  await element.waitForExist({ timeout: 5000 });
  return element;
}

/**
 * Find element by placeholder text (similar to Playwright's getByPlaceholder)
 */
export async function findByPlaceholder(placeholder: string): Promise<WebdriverIO.Element> {
  const element = await $(`[placeholder="${placeholder}"]`);
  await element.waitForExist({ timeout: 5000 });
  return element;
}

/**
 * Find element by role and name (similar to Playwright's getByRole)
 */
export async function findByRole(
  role: string,
  name?: string
): Promise<WebdriverIO.Element> {
  let selector = `[role="${role}"]`;
  if (name) {
    selector = `//*[@role="${role}" and contains(text(), "${name}")]`;
  }
  const element = await $(selector);
  await element.waitForExist({ timeout: 5000 });
  return element;
}

/**
 * Find element by test ID (data-testid attribute)
 */
export async function findByTestId(testId: string): Promise<WebdriverIO.Element> {
  const element = await $(`[data-testid="${testId}"]`);
  await element.waitForExist({ timeout: 5000 });
  return element;
}

/**
 * Click an element and wait for it to be clickable
 */
export async function clickElement(
  selector: string | WebdriverIO.Element
): Promise<void> {
  const element = typeof selector === "string" ? await $(selector) : selector;
  await element.waitForClickable({ timeout: 5000 });
  await element.click();
}

/**
 * Type text into an input field
 */
export async function typeText(
  selector: string | WebdriverIO.Element,
  text: string
): Promise<void> {
  const element = typeof selector === "string" ? await $(selector) : selector;
  await element.waitForDisplayed({ timeout: 5000 });
  await element.setValue(text);
}

/**
 * Clear and type text into an input field
 */
export async function clearAndType(
  selector: string | WebdriverIO.Element,
  text: string
): Promise<void> {
  const element = typeof selector === "string" ? await $(selector) : selector;
  await element.waitForDisplayed({ timeout: 5000 });
  await element.clearValue();
  await element.setValue(text);
}

/**
 * Wait for an element to be visible
 */
export async function waitForVisible(
  selector: string,
  timeout = 5000
): Promise<WebdriverIO.Element> {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout });
  return element;
}

/**
 * Wait for an element to be hidden
 */
export async function waitForHidden(selector: string, timeout = 5000): Promise<void> {
  const element = await $(selector);
  await element.waitForDisplayed({ timeout, reverse: true });
}

/**
 * Check if an element exists (without waiting)
 */
export async function elementExists(selector: string): Promise<boolean> {
  try {
    const element = await $(selector);
    return await element.isExisting();
  } catch {
    return false;
  }
}

/**
 * Get text content of an element
 */
export async function getTextContent(
  selector: string | WebdriverIO.Element
): Promise<string> {
  const element = typeof selector === "string" ? await $(selector) : selector;
  await element.waitForDisplayed({ timeout: 5000 });
  return await element.getText();
}

/**
 * Simulate keyboard shortcuts
 */
export async function pressKeys(keys: string[]): Promise<void> {
  await browser.keys(keys);
}

/**
 * Wait for a specific amount of time
 * Use sparingly - prefer waiting for specific conditions
 */
export async function wait(ms: number): Promise<void> {
  await browser.pause(ms);
}
