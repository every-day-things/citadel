import { test, expect } from "./fixtures";

/**
 * E2E Test: Example Using Playwright API
 *
 * This test demonstrates how to use the Playwright-style API for testing
 * the Citadel Tauri application.
 */
test.describe("Example Test with Playwright API", () => {
  test("should demonstrate basic Playwright API usage", async ({ page }) => {
    // Get the window title (Playwright-style)
    const title = await page.title();
    expect(title).toBe("Citadel");

    // Verify the app window is present
    const bodyElement = await page.locator("body");
    expect(await bodyElement.isVisible()).toBe(true);
  });

  test("should demonstrate screenshot functionality", async ({ page }) => {
    // Take a screenshot (Playwright-style)
    const screenshot = await page.screenshot({
      path: "./e2e-tests/screenshots/example-test.png",
    });

    expect(screenshot).toBeDefined();
  });

  test("should demonstrate keyboard interactions", async ({ page }) => {
    // Press Tab key
    await page.keyboard(["Tab"]);

    // Wait a bit
    await page.waitForTimeout(200);

    // App should still be functional
    const title = await page.title();
    expect(title).toBe("Citadel");
  });
});

/**
 * EXAMPLES: How to write tests for your Citadel app
 *
 * Once you add data-testid attributes to your React components, you can write
 * tests like this:
 */
test.describe("Example Tests (for reference)", () => {
  test.skip("example: finding elements by test ID", async ({ page }) => {
    // Add this to your React component:
    // <button data-testid="add-book-button">Add Book</button>

    const addButton = await page.getByTestId("add-book-button");
    await addButton.click();

    // Verify something happened
    const title = await page.title();
    expect(title).toBe("Citadel");
  });

  test.skip("example: finding elements by text", async ({ page }) => {
    // Find a button or element by its text content
    const libraryButton = await page.getByText("Library");
    await libraryButton.click();

    // Wait for some element to appear
    const bookList = await page.getByTestId("book-list");
    await bookList.waitFor({ timeout: 5000 });

    // Verify it's visible
    expect(await bookList.isVisible()).toBe(true);
  });

  test.skip("example: filling forms", async ({ page }) => {
    // Find input by placeholder
    const titleInput = await page.getByPlaceholder("Book title");
    await titleInput.fill("My New Book");

    // Find input by test ID
    const authorInput = await page.getByTestId("author-input");
    await authorInput.fill("John Doe");

    // Submit the form
    const saveButton = await page.getByRole("button", { name: "Save" });
    await saveButton.click();

    // Verify the book was added
    const bookItem = await page.getByText("My New Book");
    expect(await bookItem.isVisible()).toBe(true);
  });

  test.skip("example: testing workflows", async ({ page }) => {
    // 1. Open library
    const openButton = await page.getByTestId("open-library-button");
    await openButton.click();

    // 2. Wait for library to load
    await page.waitForTimeout(1000);

    // 3. Search for a book
    const searchInput = await page.getByPlaceholder("Search books");
    await searchInput.fill("Harry Potter");

    // 4. Press Enter to search
    await page.keyboard(["Enter"]);

    // 5. Verify search results
    const searchResults = await page.getByTestId("search-results");
    await searchResults.waitFor({ timeout: 5000 });

    const resultText = await searchResults.textContent();
    expect(resultText).toContain("Harry Potter");
  });

  test.skip("example: testing error states", async ({ page }) => {
    // Try to add a book with invalid data
    const addButton = await page.getByTestId("add-book-button");
    await addButton.click();

    // Don't fill required fields
    const saveButton = await page.getByTestId("save-book-button");
    await saveButton.click();

    // Verify error message appears
    const errorMessage = await page.getByText("Title is required");
    expect(await errorMessage.isVisible()).toBe(true);
  });
});

/**
 * NOTE: To make testing easier, add data-testid attributes to your components:
 *
 * // src/components/BookList.tsx
 * <div data-testid="book-list">
 *   {books.map(book => (
 *     <div key={book.id} data-testid={`book-item-${book.id}`}>
 *       <h3 data-testid="book-title">{book.title}</h3>
 *       <button data-testid="edit-book-button">Edit</button>
 *       <button data-testid="delete-book-button">Delete</button>
 *     </div>
 *   ))}
 * </div>
 */
