# Library Store

This store centralizes all library data management (books, authors) using Zustand, replacing the previous pattern of per-component hooks and local state.

## Architecture Changes

### Before (Old Pattern)
```typescript
// Every component had its own state and event listeners
const MyComponent = () => {
  const [loading, books] = useLoadBooks(); // Local state, duplicate fetching
  const { library, eventEmitter } = useLibrary();
  
  // Manual event subscription in each component
  useEffect(() => {
    const unsub = eventEmitter.listen(LIBRARY_BOOK_CREATED, () => {
      // Refetch...
    });
    return unsub;
  }, []);
  
  return <div>{books.map(...)}</div>;
};
```

**Problems:**
- ❌ Duplicate state across components
- ❌ Multiple identical API calls
- ❌ Manual event subscription in each component
- ❌ No caching layer
- ❌ Complex event management

### After (New Pattern)
```typescript
// All components share cached store data
const MyComponent = () => {
  const { books, loading } = useBooksState(); // Shared state, cached
  
  return <div>{books.map(...)}</div>;
};
```

**Benefits:**
- ✅ Single source of truth
- ✅ Automatic caching (one fetch, many consumers)
- ✅ Centralized event handling
- ✅ Simple, clean component code
- ✅ Automatic re-renders only for subscribed components

## Usage

### Setup (Already Done in App.tsx)

```typescript
import { useInitializeLibraryStore } from "@/lib/hooks/use-initialize-library-store";

export const App = () => {
  useInitializeLibraryStore(); // Call once at app root
  // ... rest of app
};
```

### Accessing Books

```typescript
import { useBooks, useBooksLoading, useBooksError } from "@/stores/library/store";

const BooksPage = () => {
  const books = useBooks();
  const loading = useBooksLoading();
  const error = useBooksError();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      {books.map(book => <BookCard key={book.id} book={book} />)}
    </div>
  );
};
```

### Accessing Authors

```typescript
import { useAuthors, useAuthorsLoading, useAuthorsError } from "@/stores/library/store";

const AuthorsPage = () => {
  const authors = useAuthors();
  const loading = useAuthorsLoading();
  const error = useAuthorsError();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return (
    <div>
      {authors.map(author => <AuthorCard key={author.id} author={author} />)}
    </div>
  );
};
```

### Advanced: Using Individual Selectors

For optimal performance, select only what you need:

```typescript
import { useLibraryStore } from "@/stores/library/store";

const BookCount = () => {
  // Only re-renders when books.length changes
  const count = useLibraryStore(state => state.books.length);
  return <div>{count} books</div>;
};

const BookTitles = () => {
  // Only re-renders when book titles change
  const titles = useLibraryStore(state => state.books.map(b => b.title));
  return <ul>{titles.map(t => <li key={t}>{t}</li>)}</ul>;
};
```

### Advanced: Direct Store Access

```typescript
import { useLibraryStore } from "@/stores/library/store";
import { useLibrary } from "@/lib/contexts/library";

const RefreshButton = () => {
  const { library } = useLibrary();
  const loadBooks = useLibraryStore(state => state.loadBooks);
  
  const handleRefresh = async () => {
    if (library) {
      await loadBooks(library);
    }
  };
  
  return <button onClick={handleRefresh}>Refresh</button>;
};
```

## How It Works

1. **Initialization**: When the library context becomes ready, `useInitializeLibraryStore` automatically:
   - Fetches initial books and authors data
   - Sets up event listeners for all library events
   - Marks the store as initialized

2. **Caching**: Data is stored in Zustand and shared across all components
   - First render triggers the fetch
   - Subsequent renders use cached data
   - No duplicate network calls

3. **Automatic Updates**: When library events fire (book created/updated, author changed, etc.):
   - Store automatically refetches affected data
   - All subscribed components re-render with new data
   - No manual event handling needed

4. **Cleanup**: When the library closes or errors:
   - Store resets to initial state
   - Event listeners are cleaned up automatically

## Migration Guide

### Replacing `useLoadBooks`

**Before:**
```typescript
import { useLoadBooks } from "@/lib/hooks/use-load-books";

const [loading, books] = useLoadBooks();
```

**After:**
```typescript
import { useBooks, useBooksLoading } from "@/stores/library/store";

const books = useBooks();
const loading = useBooksLoading();
```

### Replacing `useLoadAuthors`

**Before:**
```typescript
import { useLoadAuthors } from "@/lib/hooks/use-load-authors";

const [loading, authors] = useLoadAuthors();
```

**After:**
```typescript
import { useAuthors, useAuthorsLoading } from "@/stores/library/store";

const authors = useAuthors();
const loading = useAuthorsLoading();
```

## Files

- `store.ts` - Main store definition with state, actions, and selectors
- `README.md` - This file

## Related

- `src/lib/hooks/use-initialize-library-store.ts` - Initialization hook
- `src/lib/contexts/library/` - Library context (provides Library instance and event emitter)