# Testing Guide for Citadel

This document provides an overview of all testing approaches used in the Citadel project.

## Testing Layers

Citadel uses a multi-layered testing strategy:

```
┌─────────────────────────────────────┐
│         E2E Tests (WebdriverIO)     │  ← Full application workflows
├─────────────────────────────────────┤
│     Integration Tests (Vitest)      │  ← Component interactions
├─────────────────────────────────────┤
│       Unit Tests (Vitest + Rust)    │  ← Individual functions
└─────────────────────────────────────┘
```

## Quick Start

### Run All Tests

```bash
# Run unit tests
npm run test

# Run E2E tests (requires build first)
npm run test:e2e:build
```

## 1. Unit Tests (Vitest)

Unit tests verify individual functions and components work correctly in isolation.

### Location
- Frontend: `src/**/*.test.ts`
- Example: `src/lib/authors.test.ts`

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run specific test file
npm run test src/lib/authors.test.ts

# Run with coverage
npm run test -- --coverage
```

### Writing Unit Tests

```typescript
// src/lib/my-feature.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-feature";

describe("myFunction", () => {
  it("should return expected result", () => {
    const result = myFunction("input");
    expect(result).toBe("expected output");
  });
});
```

### Test Factories

Use factories for generating test data:

```typescript
import { LibraryAuthorFactory } from "@/test/factories/library-author";

const author = LibraryAuthorFactory.build();
```

## 2. Integration Tests (Vitest)

Integration tests verify that multiple components work together correctly.

### Example: Testing Tauri Commands

```typescript
// src/services/books.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core");

describe("Book Service Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch books from backend", async () => {
    const mockBooks = [{ id: 1, title: "Test Book" }];
    vi.mocked(invoke).mockResolvedValue(mockBooks);

    const result = await getBooks();
    expect(result).toEqual(mockBooks);
    expect(invoke).toHaveBeenCalledWith("get_books");
  });
});
```

## 3. E2E Tests (WebdriverIO + tauri-driver)

E2E tests verify complete user workflows in the actual application.

### Location
- `e2e-tests/`

### Prerequisites

Install tauri-driver (one-time setup):

```bash
cargo install tauri-driver
```

### Running E2E Tests

```bash
# Build app and run tests
npm run test:e2e:build

# Just run tests (if already built)
npm run test:e2e

# Run specific test file
npx wdio run wdio.conf.ts --spec e2e-tests/app-launch.test.ts
```

### Writing E2E Tests

See [e2e-tests/README.md](./e2e-tests/README.md) for detailed documentation.

Quick example:

```typescript
import { expect } from "@wdio/globals";
import { waitForAppReady, findByTestId, clickElement } from "./helpers/app-helpers";

describe("Add Book Workflow", () => {
  before(async () => {
    await waitForAppReady();
  });

  it("should add a new book", async () => {
    const addButton = await findByTestId("add-book-button");
    await clickElement(addButton);

    // ... rest of test
  });
});
```

## 4. Rust Backend Tests

Test Rust backend logic with standard Rust tests.

### Location
- `src-tauri/src/**/*.rs`

### Running Rust Tests

```bash
cd src-tauri
cargo test

# Run with output
cargo test -- --nocapture

# Run specific test
cargo test test_name
```

### Writing Rust Tests

```rust
// src-tauri/src/book.rs
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_book_metadata() {
        let metadata = parse_metadata("test.epub");
        assert_eq!(metadata.title, "Expected Title");
    }
}
```

## CI/CD Testing

All tests run automatically in GitHub Actions:

### Quality Workflow (`.github/workflows/quality.yml`)

Runs on every push and PR:
- ✅ Formatting checks
- ✅ Linting (TypeScript + Rust)
- ✅ Unit tests (Vitest)
- ✅ E2E tests (WebdriverIO + tauri-driver)

### Build Workflow (`.github/workflows/build.yml`)

Builds the app for:
- Ubuntu 22.04 (deb, AppImage)
- macOS 15 (app, dmg)

## Test Coverage

### Viewing Coverage

```bash
# Generate coverage report
npm run test -- --coverage

# Coverage will be output to ./coverage/
```

### Coverage Goals

- Unit tests: Aim for >80% coverage on critical business logic
- Integration tests: Cover all Tauri command interactions
- E2E tests: Cover all critical user workflows

## Best Practices

### 1. Test Naming

```typescript
// Good: Descriptive, states expected behavior
it("should display error when ISBN is invalid", () => { ... });

// Bad: Vague, unclear purpose
it("test 1", () => { ... });
```

### 2. AAA Pattern (Arrange, Act, Assert)

```typescript
it("should format author names correctly", () => {
  // Arrange - Set up test data
  const authors = [{ name: "John Doe" }, { name: "Jane Smith" }];

  // Act - Perform the action
  const result = formatAuthorList(authors);

  // Assert - Verify the result
  expect(result).toBe("John Doe, Jane Smith");
});
```

### 3. Use Test IDs for E2E Tests

```tsx
// Add data-testid to your components
<button data-testid="add-book-button" onClick={handleAddBook}>
  Add Book
</button>
```

### 4. Mock External Dependencies

```typescript
import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core");

// Now you can control invoke's behavior
vi.mocked(invoke).mockResolvedValue({ success: true });
```

### 5. Keep Tests Fast

- Unit tests should run in milliseconds
- Avoid unnecessary waits in E2E tests
- Use `beforeEach` to set up common test state

### 6. Test Error Cases

```typescript
it("should handle network errors gracefully", async () => {
  vi.mocked(invoke).mockRejectedValue(new Error("Network error"));

  await expect(fetchBooks()).rejects.toThrow("Network error");
});
```

## Debugging Tests

### Unit Tests

```bash
# Run in watch mode for quick feedback
npm run test -- --watch

# Run with UI
npm run test -- --ui
```

### E2E Tests

```bash
# Enable debug logging in wdio.conf.ts
logLevel: "debug"

# Check screenshots in e2e-tests/screenshots/
# Tests automatically capture screenshots on failure
```

### Rust Tests

```bash
# Show println! output
cargo test -- --nocapture

# Run test and show backtraces
RUST_BACKTRACE=1 cargo test
```

## Common Issues

### "Tests are flaky"

**Solutions:**
- Add proper waits instead of fixed delays
- Use `waitFor` conditions instead of `setTimeout`
- Ensure test data is properly cleaned up
- Check for race conditions

### "E2E tests fail in CI but pass locally"

**Solutions:**
- Check CI has all dependencies installed
- Increase timeouts for slower CI environment
- Check screenshot artifacts for visual debugging
- Ensure app builds correctly in CI

### "Mocks not working"

**Solutions:**
- Ensure `vi.mock()` is called before imports
- Clear mocks between tests with `vi.clearAllMocks()`
- Check mock is properly typed with `vi.mocked()`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [WebdriverIO Documentation](https://webdriver.io/)
- [Tauri Testing Guide](https://tauri.app/v1/guides/testing/)
- [Rust Testing Book](https://doc.rust-lang.org/book/ch11-00-testing.html)

## Contributing

When contributing to Citadel:

1. ✅ Write tests for new features
2. ✅ Update existing tests when changing behavior
3. ✅ Ensure all tests pass before submitting PR
4. ✅ Add `data-testid` attributes to new UI elements
5. ✅ Run tests locally: `npm run test && npm run test:e2e:build`

## Test Checklist for New Features

- [ ] Unit tests for business logic
- [ ] Integration tests for API interactions
- [ ] E2E tests for user workflows
- [ ] Rust tests for backend functionality
- [ ] Error case handling
- [ ] Edge cases covered
- [ ] Tests pass locally
- [ ] Tests pass in CI
