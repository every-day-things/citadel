# Architecture Recommendations for Citadel
## Svelte-Inspired React with Tauri/Remote Backend

**Version**: 1.0  
**Date**: December 2024  
**Context**: Dual-mode architecture (Tauri local + remote web)

---

## Table of Contents
1. [Core Architecture Philosophy](#core-architecture-philosophy)
2. [Recommended Patterns](#recommended-patterns)
3. [State Management Strategy](#state-management-strategy)
4. [Data Layer Architecture](#data-layer-architecture)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)
7. [Implementation Examples](#implementation-examples)
8. [Migration Strategy](#migration-strategy)

---

## Core Architecture Philosophy

### Key Constraints
1. **Dual-mode deployment**: Must work as Tauri app (fast, local DB) and web app (slower, network calls)
2. **Svelte stores preference**: Already invested in Svelte store patterns in React
3. **Development velocity**: Speed of feature implementation is paramount
4. **DB performance**: Not a concern in Tauri mode, but critical in remote mode

### Guiding Principles
- **Progressive enhancement**: Build for Tauri first, add remote capability where needed
- **Pragmatic abstraction**: Only abstract where modes genuinely differ
- **Store-first architecture**: Leverage Svelte stores as single source of truth
- **Optimistic UI**: Assume success, handle failures gracefully

---

## Recommended Patterns

### 1. Store-Based Data Layer (Recommended)

Replace the current multi-layer architecture with store-based data management:

```
React Components
    ↓ (subscribe to stores)
Domain Stores (books, authors, settings)
    ↓ (call adapters)
Backend Adapter (Tauri commands OR HTTP client)
```

**Benefits**:
- Single source of truth
- Automatic UI updates via subscriptions
- Natural caching layer
- Clear separation of concerns
- Fast local development (Tauri mode)

**Implementation**:
```typescript
// src/stores/books.ts
import { writable, derived, get } from 'svelte/store';
import { getBackendAdapter } from './adapters';

interface BooksState {
  items: LibraryBook[];
  loading: boolean;
  error: Error | null;
  lastFetch: number | null;
}

const createBooksStore = () => {
  const { subscribe, set, update } = writable<BooksState>({
    items: [],
    loading: false,
    error: null,
    lastFetch: null,
  });

  const adapter = getBackendAdapter();

  return {
    subscribe,
    
    // Load books with automatic caching
    async load(forceRefresh = false) {
      const state = get({ subscribe });
      const now = Date.now();
      
      // Skip if recently fetched (unless forced)
      if (!forceRefresh && state.lastFetch && (now - state.lastFetch) < 5000) {
        return;
      }

      update(s => ({ ...s, loading: true, error: null }));
      
      try {
        const items = await adapter.listBooks();
        set({ items, loading: false, error: null, lastFetch: now });
      } catch (error) {
        update(s => ({ ...s, loading: false, error: error as Error }));
      }
    },

    // Optimistic update pattern
    async updateBook(bookId: string, updates: BookUpdate) {
      const state = get({ subscribe });
      const originalBook = state.items.find(b => b.id === bookId);
      
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
        await adapter.updateBook(bookId, updates);
      } catch (error) {
        // Rollback on error
        if (originalBook) {
          update(s => ({
            ...s,
            items: s.items.map(book => 
              book.id === bookId ? originalBook : book
            ),
            error: error as Error,
          }));
        }
        throw error;
      }
    },

    // Add book with optimistic ID
    async addBook(metadata: ImportableBookMetadata) {
      const tempId = `temp-${Date.now()}`;
      const tempBook: LibraryBook = {
        id: tempId,
        title: metadata.title,
        // ... other fields
      };

      // Optimistically add
      update(s => ({ ...s, items: [...s.items, tempBook] }));

      try {
        const realId = await adapter.addBook(metadata);
        
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
      } catch (error) {
        // Remove temp on error
        update(s => ({
          ...s,
          items: s.items.filter(book => book.id !== tempId),
          error: error as Error,
        }));
        throw error;
      }
    },

    // Manual invalidation
    invalidate() {
      update(s => ({ ...s, lastFetch: null }));
    },
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
```

### 2. Backend Adapter Pattern

Create a thin adapter layer that handles Tauri vs Remote differences:

```typescript
// src/adapters/backend.ts
import { commands } from '@/bindings';
import { isTauri } from '@tauri-apps/api/core';

interface BackendAdapter {
  listBooks(): Promise<LibraryBook[]>;
  updateBook(bookId: string, updates: BookUpdate): Promise<void>;
  // ... other methods
}

class TauriAdapter implements BackendAdapter {
  constructor(private libraryPath: string) {}

  async listBooks() {
    return commands.clbQueryListAllBooks(this.libraryPath);
  }

  async updateBook(bookId: string, updates: BookUpdate) {
    await commands.clbCmdUpdateBook(this.libraryPath, bookId, updates);
  }
}

class RemoteAdapter implements BackendAdapter {
  constructor(private baseUrl: string) {}

  async listBooks() {
    const res = await fetch(`${this.baseUrl}/books`);
    const data = await res.json();
    return data.items;
  }

  async updateBook(bookId: string, updates: BookUpdate) {
    await fetch(`${this.baseUrl}/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }
}

let adapter: BackendAdapter;

export const initializeAdapter = (config: { 
  mode: 'tauri' | 'remote';
  libraryPath?: string;
  baseUrl?: string;
}) => {
  if (config.mode === 'tauri' && config.libraryPath) {
    adapter = new TauriAdapter(config.libraryPath);
  } else if (config.mode === 'remote' && config.baseUrl) {
    adapter = new RemoteAdapter(config.baseUrl);
  } else {
    throw new Error('Invalid adapter configuration');
  }
};

export const getBackendAdapter = () => {
  if (!adapter) {
    throw new Error('Adapter not initialized');
  }
  return adapter;
};
```

### 3. React Hook Integration

Create hooks that bridge Svelte stores to React components:

```typescript
// src/lib/hooks/use-store.ts
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { Readable } from 'svelte/store';

/**
 * Subscribe to a Svelte store in React components.
 * Uses React 18's useSyncExternalStore for optimal performance.
 */
export function useStore<T>(store: Readable<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    () => {
      let value: T;
      store.subscribe(v => { value = v; })();
      return value!;
    }
  );
}

// Usage in components:
// const books = useStore(booksStore);
```

```typescript
// src/lib/hooks/use-books.ts
import { useEffect } from 'react';
import { useStore } from './use-store';
import { booksStore } from '@/stores/books';

export const useBooks = (autoLoad = true) => {
  const state = useStore(booksStore);

  useEffect(() => {
    if (autoLoad) {
      void booksStore.load();
    }
  }, [autoLoad]);

  return {
    books: state.items,
    loading: state.loading,
    error: state.error,
    refresh: () => booksStore.load(true),
    updateBook: booksStore.updateBook,
    addBook: booksStore.addBook,
  };
};
```

### 4. Remove Event Emitter Pattern

**Current Problem**: Manual event orchestration across components

```typescript
// ❌ Current: Manual event emitting
eventEmitter?.emit(LibraryEventNames.LIBRARY_AUTHOR_UPDATED, {
  author: authorId,
});
```

**Solution**: Stores automatically notify subscribers

```typescript
// ✅ Recommended: Stores handle notifications automatically
await authorsStore.updateAuthor(authorId, updates);
// All components subscribed to authorsStore automatically update
```

---

## State Management Strategy

### Store Types

#### 1. Domain Stores (Primary Data)
- `booksStore` - All book data and operations
- `authorsStore` - All author data and operations
- `settingsStore` - Application settings (already exists)

#### 2. UI Stores (Transient State)
- `modalStore` - Modal open/close state
- `selectionStore` - Multi-select state
- `filterStore` - Current filter/search state

#### 3. Derived Stores (Computed Values)
```typescript
// Automatically recompute when dependencies change
export const filteredBooks = derived(
  [booksStore, filterStore],
  ([$books, $filters]) => {
    return $books.items.filter(book => {
      if ($filters.searchTerm) {
        return book.title.toLowerCase().includes($filters.searchTerm.toLowerCase());
      }
      if ($filters.authorId) {
        return book.author_list.some(a => a.id === $filters.authorId);
      }
      return true;
    });
  }
);
```

### Context Usage

**Keep React Context for**:
- Dependency injection (providing stores)
- Theme/Mantine providers
- Router context

**Don't use React Context for**:
- Actual data (use stores)
- Frequently changing state (use stores)

```typescript
// ✅ Good: Context provides store instances
export const LibraryContext = createContext<{
  books: typeof booksStore;
  authors: typeof authorsStore;
}>(null!);

// ❌ Bad: Context holds the data itself
export const LibraryContext = createContext<{
  books: LibraryBook[];
  setBooks: (books: LibraryBook[]) => void;
}>(null!);
```

---

## Data Layer Architecture

### For Tauri Mode (Current Primary)

**Keep it simple**: Direct store → Tauri command → DB

```typescript
// No need for caching, N+1 optimization, etc.
// SQLite is fast enough for UI purposes
const booksStore = {
  async load() {
    const books = await commands.clbQueryListAllBooks(libraryPath);
    set({ items: books, loading: false });
  }
};
```

### For Remote Mode (Future)

**Add Progressive Enhancement**:

```typescript
const booksStore = {
  async load(forceRefresh = false) {
    const adapter = getBackendAdapter();
    
    // Remote mode: Check cache first
    if (adapter instanceof RemoteAdapter && !forceRefresh) {
      const cached = await this.checkCache();
      if (cached) {
        set({ items: cached, loading: false });
        // Background refresh
        this.loadFresh().catch(console.error);
        return;
      }
    }
    
    // Tauri mode: Just fetch (it's fast)
    const books = await adapter.listBooks();
    set({ items: books, loading: false });
    
    // Remote mode: Update cache
    if (adapter instanceof RemoteAdapter) {
      await this.updateCache(books);
    }
  }
};
```

### Incremental Remote Support

Build remote support incrementally:

**Phase 1: Read-only remote**
```typescript
class RemoteAdapter {
  async listBooks() { /* implement */ }
  async listAuthors() { /* implement */ }
  
  // Stub write operations
  async updateBook() { 
    throw new Error('Updates not supported in remote mode yet');
  }
}
```

**Phase 2: Add write operations**
```typescript
class RemoteAdapter {
  async updateBook(bookId, updates) {
    const res = await fetch(`${this.baseUrl}/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Update failed');
  }
}
```

**Phase 3: Add optimizations**
```typescript
class RemoteAdapter {
  private cache = new Map();
  
  async listBooks() {
    // Add caching, prefetching, etc.
  }
}
```

---

## Error Handling

### Standard Error Types

```typescript
// src/lib/errors.ts
export class CitadelError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = 'CitadelError';
  }
}

export class BackendError extends CitadelError {
  constructor(message: string, public originalError?: unknown) {
    super(message, 'BACKEND_ERROR', true);
  }
}

export class ValidationError extends CitadelError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', true);
  }
}
```

### Store Error Handling

```typescript
const booksStore = {
  async load() {
    update(s => ({ ...s, loading: true, error: null }));
    
    try {
      const items = await adapter.listBooks();
      set({ items, loading: false, error: null, lastFetch: Date.now() });
    } catch (err) {
      const error = err instanceof CitadelError 
        ? err 
        : new BackendError('Failed to load books', err);
      
      update(s => ({ ...s, loading: false, error }));
      
      // Log for debugging
      console.error('[booksStore] Load failed:', error);
      
      // Don't throw - let UI handle via error state
    }
  }
};
```

### Tauri Command Error Handling

```rust
// src-tauri/src/libs/calibre/mod.rs

// ❌ Current
pub fn clb_cmd_update_book(...) -> Result<i32, ()> {
    // Returns () on error - no information!
}

// ✅ Recommended
#[derive(Debug, Serialize)]
pub struct CommandError {
    code: String,
    message: String,
    recoverable: bool,
}

pub fn clb_cmd_update_book(...) -> Result<i32, CommandError> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(CommandError {
            code: "DB_NOT_FOUND".to_string(),
            message: format!("No database found at {}", library_root),
            recoverable: false,
        }),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);
            let book_id_int = book_id.parse::<i32>()
                .map_err(|_| CommandError {
                    code: "INVALID_ID".to_string(),
                    message: "Book ID must be a number".to_string(),
                    recoverable: true,
                })?;
            
            calibre.update_book(book_id_int, updates.to_dto())
                .map(|entry| entry.book.id)
                .map_err(|e| CommandError {
                    code: "UPDATE_FAILED".to_string(),
                    message: e.to_string(),
                    recoverable: true,
                })
        }
    }
}
```

---

## Performance Considerations

### Tauri Mode (Current)
- **Don't optimize prematurely**: SQLite is fast enough
- **Keep queries simple**: N+1 queries are fine for UI
- **No caching needed**: Direct DB access is ~1ms

### Remote Mode (Future)
- **Add caching at adapter level**: Not in stores
- **Batch requests where possible**: Combine related operations
- **Optimistic updates**: Always for write operations
- **Background sync**: Refresh data without blocking UI

### Optimization Strategy

```typescript
// Tauri: Simple and direct
class TauriAdapter {
  async getBookWithAuthors(bookId: string) {
    const book = await commands.getBook(bookId);
    // N+1 is fine here - each query is ~1ms
    const authors = await Promise.all(
      book.author_ids.map(id => commands.getAuthor(id))
    );
    return { ...book, authors };
  }
}

// Remote: Optimize for network
class RemoteAdapter {
  async getBookWithAuthors(bookId: string) {
    // Single request with includes
    const res = await fetch(
      `${this.baseUrl}/books/${bookId}?include=authors`
    );
    return res.json();
  }
}
```

---

## Implementation Examples

### Example 1: Converting Current Books Flow

**Current**:
```typescript
// Multiple layers, manual orchestration
const { library, eventEmitter } = useLibrary();
const [books, setBooks] = useState<LibraryBook[]>([]);

useEffect(() => {
  library?.listBooks().then(setBooks);
}, [library]);

useEffect(() => {
  const unsub = eventEmitter?.listen(
    LibraryEventNames.LIBRARY_BOOK_UPDATED,
    () => {
      library?.listBooks().then(setBooks);
    }
  );
  return unsub;
}, [eventEmitter, library]);
```

**Recommended**:
```typescript
// Single store, automatic updates
import { useBooks } from '@/lib/hooks/use-books';

const { books, loading, updateBook } = useBooks();

// That's it! Updates are automatic.
```

### Example 2: Adding a New Feature (Send to Device)

**Current Approach** (4-5 files):
1. Define DTO in `libcalibre/dtos/`
2. Implement in `libcalibre/client.rs`
3. Add Tauri command in `src-tauri/src/libs/calibre/mod.rs`
4. Add TypeScript interface in `src/lib/services/library/`
5. Use in component

**Recommended Approach** (2-3 files):

```typescript
// 1. Add to adapter interface (src/adapters/backend.ts)
interface BackendAdapter {
  // ... existing methods
  sendToDevice(bookId: string, devicePath: string): Promise<void>;
}

// 2. Implement in Tauri adapter
class TauriAdapter {
  async sendToDevice(bookId: string, devicePath: string) {
    await commands.clbCmdSendToDevice(this.libraryPath, bookId, devicePath);
  }
}

// 3. Add to store (src/stores/books.ts)
const booksStore = {
  async sendToDevice(bookId: string, devicePath: string) {
    const adapter = getBackendAdapter();
    await adapter.sendToDevice(bookId, devicePath);
    // Could update book status if needed
  }
};

// 4. Use in component
const { sendToDevice } = useBooks();
await sendToDevice(book.id, devicePath);
```

### Example 3: Author Management with Relationships

```typescript
// src/stores/authors.ts
const createAuthorsStore = () => {
  const { subscribe, set, update } = writable<AuthorsState>({
    items: [],
    loading: false,
    error: null,
  });

  return {
    subscribe,
    
    async load() {
      update(s => ({ ...s, loading: true }));
      const adapter = getBackendAdapter();
      const items = await adapter.listAuthors();
      set({ items, loading: false, error: null });
    },

    async deleteAuthor(authorId: string) {
      const adapter = getBackendAdapter();
      
      // Check for relationships
      const books = get(booksStore);
      const hasBooks = books.items.some(book =>
        book.author_list.some(a => a.id === authorId)
      );
      
      if (hasBooks) {
        throw new ValidationError(
          'Cannot delete author with existing books',
          'authorId'
        );
      }
      
      // Optimistically remove
      update(s => ({
        ...s,
        items: s.items.filter(a => a.id !== authorId),
      }));
      
      try {
        await adapter.deleteAuthor(authorId);
      } catch (error) {
        // Rollback
        await this.load();
        throw error;
      }
    },
  };
};

export const authorsStore = createAuthorsStore();

// Derived store for books by author
export const booksByAuthor = (authorId: string) =>
  derived(
    [booksStore, authorsStore],
    ([$books, $authors]) => {
      const author = $authors.items.find(a => a.id === authorId);
      const books = $books.items.filter(book =>
        book.author_list.some(a => a.id === authorId)
      );
      return { author, books };
    }
  );
```

---

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- [ ] Create adapter pattern (`src/adapters/backend.ts`)
- [ ] Create `useStore` hook for Svelte/React bridge
- [ ] Migrate `settingsStore` to use adapter (already close)
- [ ] Add error types (`src/lib/errors.ts`)

### Phase 2: Core Stores (Week 2-4)
- [ ] Create `booksStore` with full operations
- [ ] Create `authorsStore` with full operations
- [ ] Update Tauri commands to return proper errors
- [ ] Migrate main Books page to use stores

### Phase 3: Remove Old Patterns (Week 4-6)
- [ ] Remove `LibraryContext` reducer pattern
- [ ] Remove manual event emitters
- [ ] Remove `Library` service interface layer
- [ ] Update all components to use stores

### Phase 4: Remote Support (Week 6-8)
- [ ] Implement `RemoteAdapter` for read operations
- [ ] Add caching layer for remote mode
- [ ] Implement remote write operations
- [ ] Add offline detection and sync

### Migration Tactics

**Run in parallel**: Keep old system working while building new

```typescript
// Component using both temporarily
const BooksPage = () => {
  // New system
  const { books: newBooks } = useBooks();
  
  // Old system (fallback)
  const { library } = useLibrary();
  const [oldBooks, setOldBooks] = useState([]);
  
  // Use new if available, fall back to old
  const books = newBooks.length > 0 ? newBooks : oldBooks;
  
  // ... rest of component
};
```

**Feature flags**: Control rollout

```typescript
// src/lib/feature-flags.ts
export const FEATURE_FLAGS = {
  USE_NEW_STORES: import.meta.env.VITE_USE_NEW_STORES === 'true',
};

// In components
const books = FEATURE_FLAGS.USE_NEW_STORES 
  ? useBooks() 
  : useOldLibraryPattern();
```

---

## Decision Matrix

| Scenario | Recommendation | Rationale |
|----------|---------------|-----------|
| Read-only data display | Store + derived store | Automatic updates, minimal code |
| Write operation | Store method with optimistic update | Best UX, handles errors well |
| Complex business logic | Store method | Keeps logic centralized |
| Cross-cutting concerns (auth, logging) | Keep in Context | Not data, truly app-wide |
| Temporary UI state | Local useState or UI store | No need to persist |
| Feature differs local/remote | Adapter method | Encapsulates difference |
| Need caching | Add to adapter, not store | Stores are cache, adapters handle source |

---

## Conclusion

This architecture leverages your existing Svelte store investment while simplifying the overall system:

**Benefits**:
- ✅ Faster feature development (2-3 files instead of 4-5)
- ✅ Automatic UI updates (no manual event orchestration)
- ✅ Natural caching layer (stores hold state)
- ✅ Clear separation of concerns (stores vs adapters vs components)
- ✅ Incremental migration path (run systems in parallel)
- ✅ Easy testing (mock adapters, test stores independently)

**Trade-offs**:
- ⚠️  Svelte stores less common in React ecosystem (but you're already committed)
- ⚠️  Migration effort required (but manageable with parallel systems)
- ⚠️  Some React devs may be unfamiliar (but pattern is simple)

**Next Steps**:
1. Review and discuss with team
2. Build small prototype with one feature (e.g., book filtering)
3. Evaluate developer experience
4. Decide on migration timeline
5. Update this document with learnings

---

## References

- [Svelte Stores Documentation](https://svelte.dev/docs/svelte-store)
- [React 18 useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Tauri Command System](https://tauri.app/v1/guides/features/command)
- Current codebase analysis: `docs/ARCHITECTURE_ANALYSIS.md`
