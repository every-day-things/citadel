# Migration Example: Books Feature
## From Multi-Layer to Store-Based Architecture

This document provides a concrete, step-by-step example of migrating the books feature from the current multi-layer architecture to the recommended store-based approach.

---

## Current Architecture (Before)

### Files Involved
1. `src-tauri/libcalibre/src/client.rs` - Database operations
2. `src-tauri/src/libs/calibre/mod.rs` - Tauri commands
3. `src/bindings.ts` - Generated TypeScript bindings
4. `src/lib/services/library/_internal/adapters/calibre.ts` - Service layer
5. `src/lib/contexts/library/Provider.tsx` - Context provider
6. `src/lib/hooks/use-load-books.ts` - React hook
7. `src/components/pages/Books.tsx` - Component

### Current Flow

```
Component (Books.tsx)
  ↓ uses
useLoadBooks() hook
  ↓ calls
library.listBooks() (from context)
  ↓ calls
calibre.ts adapter
  ↓ calls
commands.clbQueryListAllBooks() (Tauri command)
  ↓ calls
libcalibre client
  ↓ queries
SQLite database
```

### Current Code

**Component Usage:**
```typescript
// src/components/pages/Books.tsx (simplified)
export const Books = () => {
  const [loadingBooks, books] = useLoadBooks();
  const { library, eventEmitter } = useLibrary();
  
  const handleUpdateBook = async (bookId: string, updates: BookUpdate) => {
    await library?.updateBook(bookId, updates);
    // Manual event emission required
    eventEmitter?.emit(LibraryEventNames.LIBRARY_BOOK_UPDATED, { 
      book: bookId 
    });
  };
  
  return (
    <div>
      {loadingBooks ? <Spinner /> : <BookList books={books} />}
    </div>
  );
};
```

**Hook Implementation:**
```typescript
// src/lib/hooks/use-load-books.ts
export const useLoadBooks = () => {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const { library, state, eventEmitter } = useLibrary();
  
  const updateBooklist = useCallback(() => {
    setLoading(true);
    void (async () => {
      if (state !== LibraryState.ready) return;
      const books = await library.listBooks();
      setBooks(books);
      setLoading(false);
    })();
  }, [library, state]);

  // Initial load
  useEffect(() => {
    updateBooklist();
  }, [updateBooklist]);

  // Listen for updates
  useEffect(() => {
    if (state !== LibraryState.ready) return;
    
    const unsub1 = eventEmitter.listen(
      LibraryEventNames.LIBRARY_BOOK_CREATED,
      () => updateBooklist()
    );
    const unsub2 = eventEmitter.listen(
      LibraryEventNames.LIBRARY_BOOK_UPDATED,
      () => updateBooklist()
    );
    
    return () => {
      unsub1();
      unsub2();
    };
  }, [state, eventEmitter, updateBooklist]);

  return [loading, books] as const;
};
```

### Problems with Current Approach
1. **Boilerplate**: 7 files touched for simple operations
2. **Manual orchestration**: Events must be manually emitted
3. **State duplication**: Data exists in multiple places
4. **No caching**: Every render can trigger new fetches
5. **Error handling**: Inconsistent across layers

---

## New Architecture (After)

### Files Involved
1. `src-tauri/src/libs/calibre/mod.rs` - Tauri commands (improved errors)
2. `src/adapters/backend.ts` - Adapter interface
3. `src/stores/books.ts` - Books store
4. `src/lib/hooks/use-books.ts` - Simple React hook
5. `src/components/pages/Books.tsx` - Component (simplified)

### New Flow

```
Component (Books.tsx)
  ↓ uses
useBooks() hook
  ↓ subscribes to
booksStore
  ↓ calls
BackendAdapter
  ↓ calls
Tauri commands OR HTTP API
  ↓
Database / Remote Server
```

---

## Step-by-Step Migration

### Step 1: Create Adapter Interface

**File: `src/adapters/backend.ts`** (new file)

```typescript
import { commands, type LibraryBook, type BookUpdate, type ImportableBookMetadata } from '@/bindings';
import { isTauri } from '@tauri-apps/api/core';

export interface BackendAdapter {
  listBooks(): Promise<LibraryBook[]>;
  updateBook(bookId: string, updates: BookUpdate): Promise<void>;
  addBook(metadata: ImportableBookMetadata): Promise<string | undefined>;
  deleteBook(bookId: string): Promise<void>;
}

class TauriAdapter implements BackendAdapter {
  constructor(private libraryPath: string) {}

  async listBooks(): Promise<LibraryBook[]> {
    return commands.clbQueryListAllBooks(this.libraryPath);
  }

  async updateBook(bookId: string, updates: BookUpdate): Promise<void> {
    const result = await commands.clbCmdUpdateBook(
      this.libraryPath,
      bookId,
      updates
    );
    if (!result) {
      throw new Error(`Failed to update book ${bookId}`);
    }
  }

  async addBook(metadata: ImportableBookMetadata): Promise<string | undefined> {
    await commands.clbCmdCreateBook(this.libraryPath, metadata);
    // Note: Current implementation doesn't return the new ID
    // This is a limitation we should fix
    return undefined;
  }

  async deleteBook(bookId: string): Promise<void> {
    // Not yet implemented in backend
    throw new Error('Delete not implemented');
  }
}

class RemoteAdapter implements BackendAdapter {
  constructor(private baseUrl: string) {}

  async listBooks(): Promise<LibraryBook[]> {
    const res = await fetch(`${this.baseUrl}/books`);
    if (!res.ok) throw new Error('Failed to fetch books');
    const data = await res.json() as { items: LibraryBook[] };
    return data.items;
  }

  async updateBook(bookId: string, updates: BookUpdate): Promise<void> {
    const res = await fetch(`${this.baseUrl}/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update book');
  }

  async addBook(_metadata: ImportableBookMetadata): Promise<string | undefined> {
    throw new Error('Not implemented');
  }

  async deleteBook(_bookId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}

// Global adapter instance
let adapter: BackendAdapter | null = null;

export const initializeBackendAdapter = (config: {
  mode: 'tauri' | 'remote';
  libraryPath?: string;
  baseUrl?: string;
}) => {
  if (config.mode === 'tauri') {
    if (!config.libraryPath) {
      throw new Error('Library path required for Tauri mode');
    }
    adapter = new TauriAdapter(config.libraryPath);
  } else {
    if (!config.baseUrl) {
      throw new Error('Base URL required for remote mode');
    }
    adapter = new RemoteAdapter(config.baseUrl);
  }
};

export const getBackendAdapter = (): BackendAdapter => {
  if (!adapter) {
    throw new Error('Backend adapter not initialized. Call initializeBackendAdapter first.');
  }
  return adapter;
};

// Auto-detect and initialize
export const autoInitializeAdapter = (libraryPath: string) => {
  initializeBackendAdapter({
    mode: isTauri() ? 'tauri' : 'remote',
    libraryPath: isTauri() ? libraryPath : undefined,
    baseUrl: !isTauri() ? 'https://citadel-backend.fly.dev' : undefined,
  });
};
```

### Step 2: Create Books Store

**File: `src/stores/books.ts`** (new file)

```typescript
import { writable, derived, get } from 'svelte/store';
import type { LibraryBook, BookUpdate, ImportableBookMetadata } from '@/bindings';
import { getBackendAdapter } from '@/adapters/backend';

interface BooksState {
  items: LibraryBook[];
  loading: boolean;
  error: Error | null;
  lastFetch: number | null;
}

const CACHE_DURATION = 5000; // 5 seconds

const createBooksStore = () => {
  const { subscribe, set, update } = writable<BooksState>({
    items: [],
    loading: false,
    error: null,
    lastFetch: null,
  });

  const load = async (forceRefresh = false) => {
    const state = get({ subscribe });
    const now = Date.now();
    
    // Skip if recently fetched (unless forced)
    if (
      !forceRefresh && 
      state.lastFetch && 
      (now - state.lastFetch) < CACHE_DURATION
    ) {
      return;
    }

    update(s => ({ ...s, loading: true, error: null }));
    
    try {
      const adapter = getBackendAdapter();
      const items = await adapter.listBooks();
      
      set({ 
        items, 
        loading: false, 
        error: null, 
        lastFetch: now 
      });
    } catch (error) {
      console.error('[booksStore] Failed to load books:', error);
      update(s => ({ 
        ...s, 
        loading: false, 
        error: error as Error 
      }));
    }
  };

  const updateBook = async (bookId: string, updates: BookUpdate) => {
    const state = get({ subscribe });
    const originalBook = state.items.find(b => b.id === bookId);
    
    if (!originalBook) {
      throw new Error(`Book ${bookId} not found`);
    }
    
    // Optimistically update UI
    update(s => ({
      ...s,
      items: s.items.map(book => 
        book.id === bookId 
          ? { ...book, ...updates } 
          : book
      ),
    }));

    try {
      const adapter = getBackendAdapter();
      await adapter.updateBook(bookId, updates);
    } catch (error) {
      console.error('[booksStore] Failed to update book:', error);
      
      // Rollback on error
      update(s => ({
        ...s,
        items: s.items.map(book => 
          book.id === bookId ? originalBook : book
        ),
        error: error as Error,
      }));
      
      throw error;
    }
  };

  const addBook = async (metadata: ImportableBookMetadata) => {
    const tempId = `temp-${Date.now()}`;
    const tempBook: LibraryBook = {
      id: tempId,
      uuid: null,
      title: metadata.title,
      author_list: [],
      sortable_title: null,
      file_list: [],
      cover_image: null,
      identifier_list: [],
      description: null,
      is_read: false,
    };

    // Optimistically add
    update(s => ({ 
      ...s, 
      items: [...s.items, tempBook] 
    }));

    try {
      const adapter = getBackendAdapter();
      const realId = await adapter.addBook(metadata);
      
      if (realId) {
        // Replace temp with real
        update(s => ({
          ...s,
          items: s.items.map(book => 
            book.id === tempId 
              ? { ...book, id: realId } 
              : book
          ),
        }));
        
        return realId;
      } else {
        // Backend doesn't return ID, need to reload
        await load(true);
        return undefined;
      }
    } catch (error) {
      console.error('[booksStore] Failed to add book:', error);
      
      // Remove temp on error
      update(s => ({
        ...s,
        items: s.items.filter(book => book.id !== tempId),
        error: error as Error,
      }));
      
      throw error;
    }
  };

  const invalidate = () => {
    update(s => ({ ...s, lastFetch: null }));
  };

  const reset = () => {
    set({
      items: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  };

  return {
    subscribe,
    load,
    updateBook,
    addBook,
    invalidate,
    reset,
  };
};

export const booksStore = createBooksStore();

// Derived stores for common queries
export const bookById = (id: string) => 
  derived(booksStore, $books => 
    $books.items.find(book => book.id === id)
  );

export const booksByAuthor = (authorId: string) =>
  derived(booksStore, $books =>
    $books.items.filter(book =>
      book.author_list.some(author => author.id === authorId)
    )
  );

export const booksCount = derived(
  booksStore,
  $books => $books.items.length
);

export const unreadBooks = derived(
  booksStore,
  $books => $books.items.filter(book => !book.is_read)
);
```

### Step 3: Create React Hook

**File: `src/lib/hooks/use-books.ts`** (replace existing)

```typescript
import { useEffect, useSyncExternalStore } from 'react';
import { booksStore } from '@/stores/books';
import type { BookUpdate, ImportableBookMetadata } from '@/bindings';

/**
 * Hook to access books store in React components.
 * Automatically loads books on mount and subscribes to updates.
 */
export const useBooks = (options: { autoLoad?: boolean } = {}) => {
  const { autoLoad = true } = options;
  
  // Subscribe to store using React 18's useSyncExternalStore
  const state = useSyncExternalStore(
    booksStore.subscribe,
    () => {
      let value: ReturnType<typeof booksStore.subscribe> extends (cb: (v: infer T) => void) => void ? T : never;
      const unsubscribe = booksStore.subscribe(v => { value = v; });
      unsubscribe();
      return value!;
    }
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      void booksStore.load();
    }
  }, [autoLoad]);

  return {
    // State
    books: state.items,
    loading: state.loading,
    error: state.error,
    
    // Actions
    refresh: (force = true) => booksStore.load(force),
    updateBook: (bookId: string, updates: BookUpdate) => 
      booksStore.updateBook(bookId, updates),
    addBook: (metadata: ImportableBookMetadata) => 
      booksStore.addBook(metadata),
    invalidate: () => booksStore.invalidate(),
  };
};

/**
 * Hook to access a single book by ID.
 */
export const useBook = (bookId: string | undefined) => {
  const { books, loading } = useBooks();
  
  const book = bookId 
    ? books.find(b => b.id === bookId)
    : undefined;
  
  return { book, loading };
};
```

### Step 4: Update Component

**File: `src/components/pages/Books.tsx`** (simplified version)

```typescript
import { useBooks } from '@/lib/hooks/use-books';
import type { BookUpdate } from '@/bindings';

export const Books = ({ search_for_author }: BookSearchOptions) => {
  // Single hook replaces useLibrary + useLoadBooks + manual state
  const { books, loading, error, updateBook, refresh } = useBooks();
  
  const [filteredBooks, setFilteredBooks] = useState(books);
  
  // Filter books based on search
  useEffect(() => {
    let filtered = books;
    
    if (search_for_author) {
      filtered = filtered.filter(book =>
        book.author_list.some(author => author.id === search_for_author)
      );
    }
    
    setFilteredBooks(filtered);
  }, [books, search_for_author]);
  
  const handleUpdateBook = async (bookId: string, updates: BookUpdate) => {
    try {
      await updateBook(bookId, updates);
      // No manual event emission needed - UI updates automatically!
    } catch (error) {
      console.error('Failed to update book:', error);
      // Could show a toast notification here
    }
  };
  
  if (error) {
    return (
      <div>
        <p>Error loading books: {error.message}</p>
        <button onClick={() => refresh()}>Retry</button>
      </div>
    );
  }
  
  return (
    <div>
      {loading ? (
        <Spinner />
      ) : (
        <BookList 
          books={filteredBooks} 
          onUpdate={handleUpdateBook}
        />
      )}
    </div>
  );
};
```

### Step 5: Update App Initialization

**File: `src/App.tsx`** (add adapter initialization)

```typescript
import { autoInitializeAdapter } from '@/adapters/backend';

export const App = () => {
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  
  // ... existing settings logic ...
  
  useEffect(() => {
    const fetchSettings = async () => {
      await waitForSettings();
      const activeLibrary = await getActiveLibrary(settingsStore);
      
      if (activeLibrary.isSome) {
        const path = activeLibrary.value.absolutePath;
        setLibraryPath(path);
        
        // Initialize backend adapter
        autoInitializeAdapter(path);
      }
    };
    
    safeAsyncEventHandler(fetchSettings)();
  }, []);
  
  // ... rest of component ...
};
```

---

## Comparison

### Lines of Code

**Before:**
- `use-load-books.ts`: ~50 lines
- `Books.tsx`: ~200 lines (with event handling)
- Total for books feature: ~250 lines

**After:**
- `books.ts` store: ~150 lines (includes all operations)
- `use-books.ts`: ~40 lines
- `Books.tsx`: ~80 lines (simplified)
- `backend.ts` adapter: ~100 lines (shared across features)
- Total for books feature: ~270 lines first time, ~120 lines for subsequent features

### Developer Experience

**Adding a new operation (e.g., "Mark as Read"):**

**Before (4-5 files):**
1. Add method to `libcalibre` client
2. Add Tauri command
3. Regenerate bindings
4. Add to TypeScript service layer
5. Update component + emit event

**After (2 files):**
1. Add to store:
```typescript
// stores/books.ts
async markAsRead(bookId: string) {
  await this.updateBook(bookId, { is_read: true });
}
```

2. Use in component:
```typescript
// Component
const { markAsRead } = useBooks();
await markAsRead(book.id);
```

### Performance

**Before:**
- Every component mount triggers fetch
- No caching
- Manual event coordination can cause duplicate fetches

**After:**
- Automatic 5-second cache
- Single fetch shared across components
- Optimistic updates for instant UI feedback

### Testing

**Before:**
```typescript
// Hard to test - need to mock multiple layers
const mockLibrary = {
  listBooks: jest.fn(),
  updateBook: jest.fn(),
};
const mockEventEmitter = {
  listen: jest.fn(),
  emit: jest.fn(),
};
```

**After:**
```typescript
// Easy to test - mock adapter only
import { initializeBackendAdapter } from '@/adapters/backend';

const mockAdapter = {
  listBooks: jest.fn().mockResolvedValue([]),
  updateBook: jest.fn().mockResolvedValue(undefined),
};

initializeBackendAdapter(mockAdapter);
```

---

## Migration Checklist

- [ ] Create `src/adapters/backend.ts`
- [ ] Create `src/stores/books.ts`
- [ ] Create `src/lib/hooks/use-books.ts`
- [ ] Update `src/App.tsx` to initialize adapter
- [ ] Update `src/components/pages/Books.tsx` to use new hooks
- [ ] Test both Tauri and remote modes
- [ ] Update other components using books (BookDetail, etc.)
- [ ] Remove old files:
  - [ ] `src/lib/hooks/use-load-books.ts`
  - [ ] `src/lib/contexts/library/` (after all features migrated)
  - [ ] `src/lib/services/library/` (after all features migrated)
- [ ] Update documentation

---

## Rollback Plan

If migration causes issues, rollback is simple:

1. Keep old files alongside new files
2. Use feature flag to switch between implementations:
```typescript
const USE_NEW_STORES = import.meta.env.VITE_USE_NEW_STORES === 'true';

const Component = () => {
  if (USE_NEW_STORES) {
    return <NewBooksComponent />;
  }
  return <OldBooksComponent />;
};
```

3. Set flag in `.env`:
```
# Disable new stores
VITE_USE_NEW_STORES=false
```

---

## Next Steps

1. Review this example with the team
2. Build a small prototype for one page
3. Gather feedback on developer experience
4. Refine the approach based on learnings
5. Create similar guides for Authors and other features
6. Plan full migration timeline