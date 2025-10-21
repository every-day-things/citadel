import { test as base } from "@playwright/test";
import { remote, type Browser } from "webdriverio";
import { join } from "path";
import { platform } from "os";

/**
 * Playwright Fixtures for Tauri App Testing
 *
 * This creates a custom Playwright fixture that uses WebDriver (via webdriverio)
 * to communicate with tauri-driver, while providing a Playwright-like API.
 */

// Determine the application binary path
const getApplicationPath = (): string => {
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
};

// Custom Page-like wrapper for WebDriver browser
export class TauriPage {
  constructor(private browser: Browser) {}

  /**
   * Get the window title
   */
  async title(): Promise<string> {
    return await this.browser.getTitle();
  }

  /**
   * Find element by selector (Playwright-style)
   */
  async locator(selector: string) {
    const element = await this.browser.$(selector);
    return {
      click: async () => {
        await element.waitForClickable({ timeout: 5000 });
        await element.click();
      },
      fill: async (text: string) => {
        await element.waitForDisplayed({ timeout: 5000 });
        await element.setValue(text);
      },
      textContent: async () => {
        await element.waitForDisplayed({ timeout: 5000 });
        return await element.getText();
      },
      isVisible: async () => {
        return await element.isDisplayed();
      },
      waitFor: async (options?: { timeout?: number }) => {
        await element.waitForDisplayed({ timeout: options?.timeout ?? 5000 });
      },
    };
  }

  /**
   * Find element by text (Playwright-style)
   */
  async getByText(text: string, options?: { exact?: boolean }) {
    const xpath = options?.exact
      ? `//*[text()="${text}"]`
      : `//*[contains(text(), "${text}")]`;
    const element = await this.browser.$(xpath);
    return {
      click: async () => {
        await element.waitForClickable({ timeout: 5000 });
        await element.click();
      },
      textContent: async () => {
        await element.waitForDisplayed({ timeout: 5000 });
        return await element.getText();
      },
      isVisible: async () => {
        return await element.isDisplayed();
      },
      waitFor: async (options?: { timeout?: number }) => {
        await element.waitForDisplayed({ timeout: options?.timeout ?? 5000 });
      },
    };
  }

  /**
   * Find element by test ID (Playwright-style)
   */
  async getByTestId(testId: string) {
    return await this.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Find element by placeholder (Playwright-style)
   */
  async getByPlaceholder(placeholder: string) {
    return await this.locator(`[placeholder="${placeholder}"]`);
  }

  /**
   * Find element by role (Playwright-style)
   */
  async getByRole(role: string, options?: { name?: string }) {
    if (options?.name) {
      const xpath = `//*[@role="${role}" and contains(text(), "${options.name}")]`;
      const element = await this.browser.$(xpath);
      return {
        click: async () => {
          await element.waitForClickable({ timeout: 5000 });
          await element.click();
        },
        textContent: async () => {
          await element.waitForDisplayed({ timeout: 5000 });
          return await element.getText();
        },
      };
    }
    return await this.locator(`[role="${role}"]`);
  }

  /**
   * Take a screenshot (Playwright-style)
   */
  async screenshot(options?: { path?: string }): Promise<Buffer> {
    const screenshot = await this.browser.saveScreenshot(
      options?.path ?? `./e2e-tests/screenshots/screenshot-${Date.now()}.png`
    );
    return Buffer.from(screenshot);
  }

  /**
   * Wait for a specific time
   */
  async waitForTimeout(ms: number): Promise<void> {
    await this.browser.pause(ms);
  }

  /**
   * Press keyboard keys
   */
  async keyboard(keys: string[]): Promise<void> {
    await this.browser.keys(keys);
  }

  /**
   * Get the window size
   */
  async viewportSize(): Promise<{ width: number; height: number }> {
    return await this.browser.getWindowSize();
  }
}

// Define fixtures
type TauriFixtures = {
  page: TauriPage;
  tauriBrowser: Browser;
};

export const test = base.extend<TauriFixtures>({
  // Tauri browser fixture
  tauriBrowser: async ({}, use) => {
    console.log("🔧 Connecting to tauri-driver...");

    const browser = await remote({
      hostname: "localhost",
      port: 4445,
      capabilities: {
        "tauri:options": {
          application: getApplicationPath(),
        },
      } as any,
    });

    console.log("✅ Connected to Tauri app");

    // Wait for app to be ready
    await browser.waitUntil(
      async () => {
        try {
          const title = await browser.getTitle();
          return title === "Citadel";
        } catch {
          return false;
        }
      },
      {
        timeout: 10000,
        timeoutMsg: "Tauri app did not load in time",
      }
    );

    await use(browser);

    console.log("🧹 Closing Tauri app...");
    await browser.deleteSession();
  },

  // Page fixture (Playwright-style wrapper)
  page: async ({ tauriBrowser }, use) => {
    const page = new TauriPage(tauriBrowser);
    await use(page);
  },
});

export { expect } from "@playwright/test";
