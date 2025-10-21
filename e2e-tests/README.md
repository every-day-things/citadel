# E2E Testing for Citadel

This directory contains end-to-end (E2E) tests for the Citadel desktop application using **Playwright with tauri-driver**.

## Overview

This is an **experimental setup** that combines:
- **Playwright** - For the test runner, assertions, and familiar API
- **tauri-driver** - WebDriver server for automating Tauri apps
- **WebDriver bridge** - Custom fixtures to connect Playwright to tauri-driver

This gives you a Playwright-like testing experience while still being able to automate your Tauri desktop application!

## Prerequisites

### 1. Install tauri-driver

`tauri-driver` is a WebDriver server specifically designed for Tauri applications:

```bash
cargo install tauri-driver
```

Verify the installation:

```bash
tauri-driver --version
```

### 2. Install Node Dependencies

All dependencies should already be installed:

```bash
npm install
```

## Running E2E Tests

### Quick Start

```bash
# 1. Build the application for testing (one-time or when you make changes)
npm run build:app:release

# 2. Run the E2E tests
npm run test:e2e
```

The test runner will:
1. Automatically start tauri-driver
2. Launch your Tauri app
3. Run all tests
4. Generate HTML report
5. Clean up and stop tauri-driver

### Combined Build + Test

```bash
# Build and test in one command
npm run test:e2e:build
```

### Run Specific Tests

```bash
# Run only specific test file
npx playwright test app-launch.spec.ts

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run tests with debugging
npx playwright test --debug
```

## Project Structure

```
e2e-tests/
├── README.md                 # This file
├── fixtures.ts               # Playwright fixtures with Tauri support
├── global-setup.ts           # Starts tauri-driver before tests
├── global-teardown.ts        # Stops tauri-driver after tests
├── screenshots/              # Screenshots captured during tests
├── test-results/             # Test results and HTML reports
├── app-launch.spec.ts        # Basic app launch tests
├── navigation.spec.ts        # UI navigation tests
└── example.spec.ts           # Example tests with best practices
```

## Writing Tests

### Basic Test Structure (Playwright-style!)

```typescript
import { test, expect } from "./fixtures";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    // Get the window title
    const title = await page.title();
    expect(title).toBe("Citadel");

    // Find and click an element
    const button = await page.getByTestId("my-button");
    await button.click();

    // Verify result
    const result = await page.getByText("Success");
    expect(await result.isVisible()).toBe(true);
  });
});
```

### Available Playwright-style APIs

The custom `page` fixture provides these Playwright-like methods:

#### Finding Elements

```typescript
// By test ID (recommended)
await page.getByTestId("add-book-button");

// By text content
await page.getByText("Library");
await page.getByText("Library", { exact: true });

// By placeholder
await page.getByPlaceholder("Search books");

// By role and name
await page.getByRole("button", { name: "Save" });

// By CSS selector
await page.locator("button.primary");
```

#### Interacting with Elements

```typescript
const button = await page.getByTestId("my-button");

// Click
await button.click();

// Fill input
await button.fill("some text");

// Get text content
const text = await button.textContent();

// Check visibility
const isVisible = await button.isVisible();

// Wait for element
await button.waitFor({ timeout: 5000 });
```

#### Page Methods

```typescript
// Get title
const title = await page.title();

// Take screenshot
await page.screenshot({ path: "./screenshots/my-test.png" });

// Wait for timeout
await page.waitForTimeout(1000);

// Press keyboard keys
await page.keyboard(["Tab"]);
await page.keyboard(["Control", "S"]);

// Get viewport size
const size = await page.viewportSize();
```

## Best Practices

### 1. Use data-testid Attributes

Add `data-testid` attributes to your React components for reliable element selection:

```tsx
// In your React component
<button data-testid="add-book-button" onClick={handleAddBook}>
  Add Book
</button>

<input
  data-testid="book-title-input"
  placeholder="Enter title"
  value={title}
  onChange={handleChange}
/>
```

### 2. Write Descriptive Test Names

```typescript
// Good: Descriptive, states expected behavior
test("should display error message when adding book with invalid ISBN", async ({ page }) => {
  // ...
});

// Bad: Vague, unclear purpose
test("test 1", async ({ page }) => {
  // ...
});
```

### 3. Use Playwright's Expect Assertions

```typescript
import { test, expect } from "./fixtures";

test("my test", async ({ page }) => {
  const title = await page.title();

  // Use Playwright's expect
  expect(title).toBe("Citadel");
  expect(title).toContain("Citadel");
  expect(title).not.toBe("Wrong Title");
});
```

### 4. Group Related Tests

```typescript
test.describe("Book Management", () => {
  test("should add a book", async ({ page }) => { /* ... */ });
  test("should edit a book", async ({ page }) => { /* ... */ });
  test("should delete a book", async ({ page }) => { /* ... */ });
});
```

### 5. Use test.skip for Incomplete Tests

```typescript
// Skip test temporarily
test.skip("should do something not yet implemented", async ({ page }) => {
  // Will not run
});

// Skip entire describe block
test.describe.skip("Feature not ready", () => {
  test("test 1", async ({ page }) => { /* ... */ });
  test("test 2", async ({ page }) => { /* ... */ });
});
```

## Debugging Tests

### 1. Run Tests in Debug Mode

```bash
# Opens Playwright Inspector for step-by-step debugging
npx playwright test --debug
```

### 2. Run Tests in UI Mode

```bash
# Opens Playwright UI for interactive testing
npx playwright test --ui
```

### 3. View Test Reports

```bash
# View HTML report after tests run
npx playwright show-report
```

### 4. Check Screenshots

Failed tests automatically save screenshots to `e2e-tests/screenshots/`. Check these for visual debugging.

### 5. Enable Verbose Logging

```bash
# Run with detailed output
DEBUG=pw:api npx playwright test
```

## Common Issues

### Issue: "tauri-driver is not installed"

**Solution:** Install tauri-driver:

```bash
cargo install tauri-driver
```

### Issue: "Application binary not found"

**Solution:** Make sure you've built the release version:

```bash
cd src-tauri && cargo build --release
```

### Issue: "Connection refused to tauri-driver"

**Solution:**
1. Make sure tauri-driver is installed
2. Check if port 4445 is free:
   ```bash
   lsof -i :4445
   ```
3. Try running tauri-driver manually:
   ```bash
   tauri-driver --port 4445
   ```

### Issue: "Element not found"

**Solution:**
1. Check that the selector is correct
2. Make sure the element exists in your UI
3. Add a wait condition:
   ```typescript
   await element.waitFor({ timeout: 10000 });
   ```
4. Use `data-testid` attributes for more reliable selection

### Issue: Tests pass locally but fail in CI

**Solution:**
1. Check that CI has all dependencies installed
2. Verify the build artifacts are correct
3. Check screenshot artifacts in GitHub Actions
4. May need to increase timeouts for slower CI environment

## CI/CD Integration

E2E tests run automatically in GitHub Actions on every push and pull request. See `.github/workflows/quality.yml` for configuration.

The workflow:
1. Installs all dependencies
2. Installs tauri-driver
3. Builds the release version of the app
4. Runs all E2E tests using Playwright
5. Uploads test reports and screenshots if tests fail

## Example Test Scenarios

Here's a complete example of testing a user workflow:

```typescript
import { test, expect } from "./fixtures";

test.describe("Add Book Workflow", () => {
  test("should add a new book to the library", async ({ page }) => {
    // 1. Click "Add Book" button
    const addButton = await page.getByTestId("add-book-button");
    await addButton.click();

    // 2. Fill in book details
    const titleInput = await page.getByTestId("book-title-input");
    await titleInput.fill("The Great Gatsby");

    const authorInput = await page.getByTestId("book-author-input");
    await authorInput.fill("F. Scott Fitzgerald");

    const isbnInput = await page.getByTestId("book-isbn-input");
    await isbnInput.fill("9780743273565");

    // 3. Save the book
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.click();

    // 4. Verify the book appears in the list
    const bookItem = await page.getByText("The Great Gatsby");
    await bookItem.waitFor({ timeout: 5000 });
    expect(await bookItem.isVisible()).toBe(true);

    // 5. Take a screenshot for proof
    await page.screenshot({ path: "./screenshots/book-added.png" });
  });
});
```

## Playwright vs WebdriverIO

This setup uses Playwright's test runner and API style, but communicates with tauri-driver via WebDriver protocol. This is **experimental** but gives you:

✅ **Pros:**
- Familiar Playwright API
- Better test runner (UI mode, debugging, reporters)
- Modern testing experience
- Great documentation and tooling

⚠️ **Cons:**
- Not officially supported by Tauri
- Custom bridge layer adds complexity
- Some Playwright features may not work perfectly

If you need official support, consider using WebdriverIO directly instead.

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [tauri-driver Documentation](https://github.com/tauri-apps/tauri/tree/dev/tooling/webdriver)

## Contributing

When adding new features to Citadel, please:

1. Add `data-testid` attributes to new UI elements
2. Write E2E tests for critical user workflows
3. Use the Playwright-style API for consistency
4. Run tests locally before pushing: `npm run test:e2e:build`
5. Check CI results and fix any failures

## Test Scenarios to Implement

Here are some test scenarios you might want to implement for Citadel:

- [ ] Opening and browsing a Calibre library
- [ ] Searching for books by title, author, or ISBN
- [ ] Adding a new book to the library
- [ ] Editing book metadata
- [ ] Deleting a book
- [ ] Importing books from files
- [ ] Exporting books
- [ ] Changing application settings
- [ ] Keyboard shortcuts (Cmd+N, Cmd+O, etc.)
- [ ] Error handling (invalid files, missing data, etc.)
- [ ] Performance (loading large libraries)
