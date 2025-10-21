# E2E Testing for Citadel

This directory contains end-to-end (E2E) tests for the Citadel desktop application using WebdriverIO and tauri-driver.

## Overview

E2E tests verify that the entire application works correctly from a user's perspective. Unlike unit tests that test individual components, E2E tests launch the actual Tauri application and interact with it just like a real user would.

## Prerequisites

### 1. Install tauri-driver

`tauri-driver` is a WebDriver server specifically designed for Tauri applications. You need to install it as a Rust binary:

```bash
cargo install tauri-driver
```

Verify the installation:

```bash
tauri-driver --version
```

### 2. Install Node Dependencies

All WebdriverIO dependencies should already be installed:

```bash
npm install
# or
bun install
```

## Running E2E Tests

### Quick Start

```bash
# 1. Build the application for testing (one-time or when you make changes)
npm run build:app:release

# 2. Run the E2E tests
npm run test:e2e
```

### Combined Build + Test

```bash
# Build and test in one command
npm run test:e2e:build
```

## Project Structure

```
e2e-tests/
├── README.md                      # This file
├── helpers/
│   └── app-helpers.ts            # Reusable test utilities (Playwright-like API)
├── screenshots/                   # Screenshots captured during test failures
├── app-launch.test.ts            # Basic app launch tests
├── library-navigation.test.ts    # UI navigation tests
└── example-with-helpers.test.ts  # Example using helper utilities
```

## Writing Tests

### Basic Test Structure

```typescript
import { expect } from "@wdio/globals";

describe("Feature Name", () => {
  it("should do something", async () => {
    // Your test code here
    const element = await $("selector");
    await element.click();

    expect(await element.getText()).toBe("Expected text");
  });
});
```

### Using Test Helpers (Recommended)

The `helpers/app-helpers.ts` module provides Playwright-like utilities for more readable tests:

```typescript
import { expect } from "@wdio/globals";
import {
  waitForAppReady,
  findByTestId,
  clickElement,
  typeText,
  takeScreenshot,
} from "./helpers/app-helpers";

describe("Book Management", () => {
  before(async () => {
    await waitForAppReady();
  });

  it("should add a new book", async () => {
    // Find and click the "Add Book" button
    const addButton = await findByTestId("add-book-button");
    await clickElement(addButton);

    // Fill in the form
    const titleInput = await findByTestId("book-title-input");
    await typeText(titleInput, "My New Book");

    // Submit
    const saveButton = await findByTestId("save-book-button");
    await clickElement(saveButton);

    // Verify success
    const bookList = await findByTestId("book-list");
    const text = await bookList.getText();
    expect(text).toContain("My New Book");
  });
});
```

## Best Practices

### 1. Use data-testid Attributes

Add `data-testid` attributes to your React components for reliable element selection:

```tsx
// In your React component
<button data-testid="add-book-button" onClick={handleAddBook}>
  Add Book
</button>
```

### 2. Wait for Elements

Always wait for elements to be ready before interacting with them:

```typescript
// Bad - might fail if element isn't ready
const button = await $("button");
await button.click();

// Good - waits for element to be clickable
const button = await $("button");
await button.waitForClickable({ timeout: 5000 });
await button.click();

// Better - use helper
await clickElement("button");
```

### 3. Use Descriptive Test Names

```typescript
// Bad
it("test 1", async () => { ... });

// Good
it("should display error message when adding book with invalid ISBN", async () => { ... });
```

### 4. Take Screenshots for Debugging

```typescript
import { takeScreenshot } from "./helpers/app-helpers";

it("should handle complex workflow", async () => {
  // Take a screenshot at key points
  await takeScreenshot("before-action");

  // ... perform actions ...

  await takeScreenshot("after-action");
});
```

### 5. Clean Up Test Data

If your tests create data, clean it up afterward:

```typescript
afterEach(async () => {
  // Delete test data, reset app state, etc.
});
```

## Debugging Tests

### 1. Run Tests Locally

Make sure tauri-driver is running:

```bash
# Terminal 1: Start tauri-driver
tauri-driver --port 4445

# Terminal 2: Run tests
npm run test:e2e
```

### 2. Check Screenshots

Failed tests automatically save screenshots to `e2e-tests/screenshots/`. Check these for visual debugging.

### 3. Increase Timeouts

If tests are failing due to timeouts, you can increase them in `wdio.conf.ts`:

```typescript
waitforTimeout: 10000, // Increase from 10s to 20s
```

### 4. Run Specific Tests

```bash
# Run only tests matching a pattern
npx wdio run wdio.conf.ts --spec e2e-tests/app-launch.test.ts
```

### 5. Enable Verbose Logging

In `wdio.conf.ts`, change:

```typescript
logLevel: "info", // Change to "debug" for more detailed logs
```

## Common Issues

### Issue: "Application binary not found"

**Solution:** Make sure you've built the release version:

```bash
cd src-tauri && cargo build --release
```

### Issue: "Connection refused to tauri-driver"

**Solution:** Make sure tauri-driver is installed and the port is available:

```bash
cargo install tauri-driver
# Check if port 4445 is free
lsof -i :4445
```

### Issue: "Element not found"

**Solution:**
1. Check that the selector is correct
2. Make sure the element exists in your UI
3. Add a wait condition
4. Use `data-testid` attributes for more reliable selection

### Issue: Tests pass locally but fail in CI

**Solution:**
1. Check that CI has all dependencies installed
2. Verify the build artifacts are correct
3. Check screenshot artifacts in GitHub Actions
4. May need to increase timeouts for slower CI environment

## Available Helper Functions

See `helpers/app-helpers.ts` for the complete list. Key functions include:

- `waitForAppReady()` - Wait for app to be fully loaded
- `findByTestId(id)` - Find element by data-testid
- `findByText(text)` - Find element by text content
- `findByPlaceholder(text)` - Find input by placeholder
- `findByRole(role, name)` - Find element by ARIA role
- `clickElement(selector)` - Click an element safely
- `typeText(selector, text)` - Type into an input
- `takeScreenshot(name)` - Capture a screenshot
- `waitForVisible(selector)` - Wait for element to be visible
- `waitForHidden(selector)` - Wait for element to be hidden

## CI/CD Integration

E2E tests run automatically in GitHub Actions on every push and pull request. See `.github/workflows/quality.yml` for configuration.

The workflow:
1. Installs all dependencies
2. Installs tauri-driver
3. Builds the release version of the app
4. Runs all E2E tests
5. Uploads screenshots if tests fail

## Resources

- [WebdriverIO Documentation](https://webdriver.io/docs/gettingstarted)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [tauri-driver Documentation](https://github.com/tauri-apps/tauri/tree/dev/tooling/webdriver)
- [Mocha Test Framework](https://mochajs.org/)

## Contributing

When adding new features to Citadel, please:

1. Add `data-testid` attributes to new UI elements
2. Write E2E tests for critical user workflows
3. Use the helper utilities for consistency
4. Run tests locally before pushing
5. Check CI results and fix any failures

## Example Test Scenarios to Implement

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
