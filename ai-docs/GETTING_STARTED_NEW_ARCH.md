# Getting Started with the New Architecture
## Quick Start Guide for Developers

This guide helps you start building features with Citadel's recommended store-based architecture.

---

## TL;DR

**Old way** (4-5 files):
```
libcalibre → Tauri command → TypeScript service → Context → Component
```

**New way** (2-3 files):
```
Store → Adapter → Tauri command/HTTP
Component uses store via hook
```

**Benefits**: Faster development, automatic UI updates, built-in caching.

---

## Quick Start: Add Your First Feature

Let's add a simple "mark book as favorite" feature.

### Step 1: Define Backend Operation

**File**: `src-tauri/src/libs/calibre/mod.rs`

```rust
#[tauri::command]
#[specta::specta]
pub fn clb_cmd_toggle_favorite(
    library_root: String,
    book_id: String,
    is_favorite: bool,
) -> Result<(), CommandError> {
    // Implementation here
    Ok(())
}
```

Don't forget to add it to the command list in `main.rs`.

### Step 2: Add to Adapter

**File**: `src/adapters/backend.ts`

```typescript
interface BackendAdapter {
  // ... existing methods
  toggleFavorite(bookId: string, isFavorite: boolean): Promise<void>;
}

class TauriAdapter implements BackendAdapter {
  async toggleFavorite(bookId: string, isFavorite: boolean) {
    await commands.clbCmdToggleFavorite(
      this.libraryPath, 
      bookId, 
      isFavorite
    );
  }
}

class RemoteAdapter implements BackendAdapter {
  async toggleFavorite(bookId: string, isFavorite: boolean) {
    // For now, stub it out
    throw new Error('Not implemented in remote mode');
  }
}
```

### Step 3: Add to Store

**File**: `src/stores/books.ts`

```typescript
const createBooksStore = () => {
  // ... existing code
  
  return {
    subscribe,
    // ... existing methods
    
    async toggleFavorite(bookId: string) {
      const state = get({ subscribe });
      const book = state.items.find(b => b.id === bookId);
      if (!book) return;
      
      const newFavoriteState = !book.is_favorite;
      
      // Optimistic update
      update(s => ({
        ...s,
        items: s.items.map(b =>
          b.id === bookId 
            ? { ...b, is_favorite: newFavoriteState }
            : b
        ),
      }));
      
      try {
        const adapter = getBackendAdapter();
        await adapter.toggleFavorite(bookId, newFavoriteState);
      } catch (error) {
        // Rollback on error
        update(s => ({
          ...s,
          items: s.items.map(b => b.id === bookId ? book : b),
          error: error as Error,
        }));
        throw error;
      }
    },
  };
};
```

### Step 4: Use in Component

**File**: `src/components/atoms/BookCard.tsx`

```typescript
import { useBooks } from '@/lib/hooks/use-books';

const BookCard = ({ book }) => {
  const { toggleFavorite } = useBooks({ autoLoad: false });
  
  const handleFavoriteClick = async () => {
    try {
      await toggleFavorite(book.id);
      // UI updates automatically!
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Could show toast notification
    }
  };
  
  return (
    <Card>
      <h3>{book.title}</h3>
      <button onClick={handleFavoriteClick}>
        {book.is_favorite ? '⭐' : '☆'}
      </button>
    </Card>
  );
};
```

That's it! **3 files changed**, automatic UI updates across all components.

---

## Setting Up the New Architecture

If you're starting fresh or migrating, follow these steps:

### 1. Create Adapter Infrastructure

**File**: `src/adapters/backend.ts` (create new)

```typescript
import { commands } from '@/bindings';
import type { LibraryBook, BookUpdate } from '@/bindings';

export interface BackendAdapter {
  listBooks(): Promise<LibraryBook[]>;
  updateBook(bookId: string, updates: BookUpdate): Promise<void>;
  // Add more methods as needed
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
    return (await res.json()).items;
  }

  async updateBook(bookId: string, updates: BookUpdate) {
    await fetch(`${this.baseUrl}/books/${bookId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }
}

let adapter: BackendAdapter | null = null;

export const initializeBackendAdapter = (config: {
  mode: 'tauri' | 'remote';
  libraryPath?: string;
  baseUrl?: string;
}) => {
  if (config.mode === 'tauri' && config.libraryPath) {
    adapter = new TauriAdapter(config.libraryPath);
  } else if (config.mode === 'remote' && config.baseUrl) {
    adapter = new RemoteAdapter(config.baseUrl);
  }
};

export const getBackendAdapter = () => {
  if (!adapter) throw new Error('Adapter not initialized');
  return adapter;
};
```

### 2. Create Your First Store

**File**: `src/stores/books.ts` (create new)

```typescript
import { writable, get } from 'svelte/store';
import { getBackendAdapter } from '@/adapters/backend';
import type { LibraryBook, BookUpdate } from '@/bindings';

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

  return {
    subscribe,
    
    async load(forceRefresh = false) {
      const state = get({ subscribe });
      const now = Date.now();
      
      // Simple caching: skip if fetched in last 5 seconds
      if (!forceRefresh && state.lastFetch && (now - state.lastFetch) < 5000) {
        return;
      }

      update(s => ({ ...s, loading: true, error: null }));
      
      try {
        const adapter = getBackendAdapter();
        const items = await adapter.listBooks();
        set({ items, loading: false, error: null, lastFetch: now });
      } catch (error) {
        console.error('[booksStore] Load failed:', error);
        update(s => ({ ...s, loading: false, error: error as Error }));
      }
    },

    async updateBook(bookId: string, updates: BookUpdate) {
      const state = get({ subscribe });
      const original = state.items.find(b => b.id === bookId);
      
      // Optimistic update
      update(s => ({
        ...s,
        items: s.items.map(b => 
          b.id === bookId ? { ...b, ...updates } : b
        ),
      }));

      try {
        const adapter = getBackendAdapter();
        await adapter.updateBook(bookId, updates);
      } catch (error) {
        // Rollback on error
        if (original) {
          update(s => ({
            ...s,
            items: s.items.map(b => b.id === bookId ? original : b),
            error: error as Error,
          }));
        }
        throw error;
      }
    },
  };
};

export const booksStore = createBooksStore();
```

### 3. Create React Hook

**File**: `src/lib/hooks/use-books.ts` (create new)

```typescript
import { useEffect, useSyncExternalStore } from 'react';
import { booksStore } from '@/stores/books';

export const useBooks = (options: { autoLoad?: boolean } = {}) => {
  const { autoLoad = true } = options;
  
  // Subscribe to store
  const state = useSyncExternalStore(
    booksStore.subscribe,
    () => {
      let value: any;
      const unsub = booksStore.subscribe(v => { value = v; });
      unsub();
      return value;
    }
  );

  // Auto-load on mount
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
  };
};
```

### 4. Initialize in App

**File**: `src/App.tsx` (modify)

```typescript
import { autoInitializeAdapter } from '@/adapters/backend';

export const App = () => {
  // ... existing code ...
  
  useEffect(() => {
    const init = async () => {
      await waitForSettings();
      const activeLibrary = await getActiveLibrary(settingsStore);
      
      if (activeLibrary.isSome) {
        setLibraryPath(activeLibrary.value.absolutePath);
        
        // Initialize adapter
        autoInitializeAdapter(activeLibrary.value.absolutePath);
      }
    };
    
    void init();
  }, []);
  
  // ... rest of component ...
};
```

### 5. Use in Components

**File**: Any component

```typescript
import { useBooks } from '@/lib/hooks/use-books';

const BooksPage = () => {
  const { books, loading, error, updateBook } = useBooks();
  
  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;
  
  return (
    <div>
      {books.map(book => (
        <BookCard 
          key={book.id} 
          book={book}
          onUpdate={(updates) => updateBook(book.id, updates)}
        />
      ))}
    </div>
  );
};
```

---

## Key Concepts

### 1. Stores are Single Source of Truth

```typescript
// ✅ DO: Use store
const { books } = useBooks();

// ❌ DON'T: Duplicate state
const [books, setBooks] = useState([]);
```

### 2. Optimistic Updates

Update UI immediately, rollback on error:

```typescript
// Before: Show spinner, wait for response
setLoading(true);
await api.update();
setLoading(false);

// After: Update immediately, rollback if needed
updateLocally(); // UI updates instantly
try {
  await api.update();
} catch {
  rollback(); // Only if it fails
}
```

### 3. Automatic Caching

Stores cache by default:

```typescript
// First component
useBooks(); // Fetches data

// Second component (elsewhere)
useBooks(); // Uses cached data, no fetch!
```

### 4. Derived Stores for Computed Values

```typescript
import { derived } from 'svelte/store';

export const unreadBooks = derived(
  booksStore,
  $books => $books.items.filter(b => !b.is_read)
);

// In component
const unread = useStore(unreadBooks);
```

---

## Common Tasks

### Display a List

```typescript
const { books, loading } = useBooks();

if (loading) return <Spinner />;
return <BookList books={books} />;
```

### Update an Item

```typescript
const { updateBook } = useBooks({ autoLoad: false });

await updateBook(bookId, { title: 'New Title' });
// All components update automatically!
```

### Filter/Search

```typescript
const { books } = useBooks();
const [query, setQuery] = useState('');

const filtered = useMemo(
  () => books.filter(b => b.title.includes(query)),
  [books, query]
);
```

### Add New Item

```typescript
const { addBook } = useBooks({ autoLoad: false });

await addBook({
  title: 'New Book',
  author_names: ['Author Name'],
  // ...
});
// New book appears in UI immediately
```

### Handle Errors

```typescript
const { error, refresh } = useBooks();

if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={() => refresh()}>Retry</button>
    </div>
  );
}
```

---

## Debugging Tips

### Check Store State

```typescript
// Add temporarily for debugging
useEffect(() => {
  const unsub = booksStore.subscribe(state => {
    console.log('[booksStore]', state);
  });
  return unsub;
}, []);
```

### Check Adapter Mode

```typescript
import { getBackendAdapter } from '@/adapters/backend';

console.log(
  'Using adapter:',
  getBackendAdapter().constructor.name
);
// "TauriAdapter" or "RemoteAdapter"
```

### Force Refresh

```typescript
const { refresh } = useBooks();

// Force fresh data
refresh(true);
```

---

## Migration from Old Pattern

If you have existing code using the old pattern:

### Before (Old Pattern)

```typescript
const { library, eventEmitter } = useLibrary();
const [books, setBooks] = useState([]);

useEffect(() => {
  library?.listBooks().then(setBooks);
}, [library]);

useEffect(() => {
  const unsub = eventEmitter?.listen(
    'BOOK_UPDATED',
    () => library?.listBooks().then(setBooks)
  );
  return unsub;
}, [eventEmitter, library]);
```

### After (New Pattern)

```typescript
const { books } = useBooks();
// That's it!
```

---

## Next Steps

1. ✅ Set up adapter and first store (books or authors)
2. ✅ Create corresponding React hook
3. ✅ Convert one page to use new pattern
4. ✅ Test both Tauri and remote modes
5. ✅ Gradually migrate other pages
6. ✅ Remove old patterns when migration complete

---

## Resources

- [Architecture Recommendations](./ARCHITECTURE_RECOMMENDATIONS.md) - Full details
- [Migration Example](./MIGRATION_EXAMPLE.md) - Complete migration walkthrough
- [Patterns Quick Reference](./PATTERNS_QUICK_REFERENCE.md) - Copy-paste examples
- [Svelte Stores](https://svelte.dev/docs/svelte-store) - Official docs

---

## Getting Help

- Check [Patterns Quick Reference](./PATTERNS_QUICK_REFERENCE.md) for common patterns
- Review [Migration Example](./MIGRATION_EXAMPLE.md) for detailed walkthrough
- Look at existing stores (`src/stores/settings.ts`) for inspiration
- Ask in Discord/discussions if stuck

**Remember**: The goal is faster development. If something feels overly complex, there's probably a simpler way!