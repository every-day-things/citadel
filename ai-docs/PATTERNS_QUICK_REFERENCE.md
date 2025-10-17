# Citadel Patterns Quick Reference
## Store-Based Architecture Cheat Sheet

**Quick Links**: [Full Recommendations](./ARCHITECTURE_RECOMMENDATIONS.md) | [Migration Example](./MIGRATION_EXAMPLE.md)

---

## When to Use What

| You Need To... | Use This | Example |
|----------------|----------|---------|
| Display data | Store + hook | `const { books } = useBooks()` |
| Update data | Store method | `await booksStore.updateBook(id, data)` |
| Filter/compute | Derived store | `derived(books, $b => $b.filter(...))` |
| Temp UI state | `useState` | `const [open, setOpen] = useState(false)` |
| Global UI state | UI store | `modalStore.open('add-book')` |
| Different local/remote | Adapter method | `adapter.listBooks()` |

---

## Common Patterns

### 1. Create a Store

```typescript
// src/stores/books.ts
import { writable, get } from 'svelte/store';
import { getBackendAdapter } from '@/adapters/backend';

const createBooksStore = () => {
  const { subscribe, set, update } = writable({
    items: [],
    loading: false,
    error: null,
  });

  return {
    subscribe,
    
    async load() {
      update(s => ({ ...s, loading: true }));
      try {
        const adapter = getBackendAdapter();
        const items = await adapter.listBooks();
        set({ items, loading: false, error: null });
      } catch (error) {
        update(s => ({ ...s, loading: false, error }));
      }
    },
  };
};

export const booksStore = createBooksStore();
```

### 2. Use Store in React Component

```typescript
import { useBooks } from '@/lib/hooks/use-books';

const BooksPage = () => {
  const { books, loading, error, refresh } = useBooks();
  
  if (loading) return <Spinner />;
  if (error) return <Error error={error} />;
  
  return <BookList books={books} onRefresh={refresh} />;
};
```

### 3. Optimistic Updates

```typescript
// In store
async updateBook(bookId, updates) {
  const state = get({ subscribe });
  const original = state.items.find(b => b.id === bookId);
  
  // Update UI immediately
  update(s => ({
    ...s,
    items: s.items.map(b => 
      b.id === bookId ? { ...b, ...updates } : b
    ),
  }));
  
  try {
    await adapter.updateBook(bookId, updates);
  } catch (error) {
    // Rollback on error
    update(s => ({
      ...s,
      items: s.items.map(b => b.id === bookId ? original : b),
      error,
    }));
    throw error;
  }
}
```

### 4. Derived Stores

```typescript
import { derived } from 'svelte/store';

// Single dependency
export const bookCount = derived(
  booksStore,
  $books => $books.items.length
);

// Multiple dependencies
export const booksByAuthor = (authorId: string) =>
  derived(
    [booksStore, authorsStore],
    ([$books, $authors]) => {
      const author = $authors.items.find(a => a.id === authorId);
      const books = $books.items.filter(b =>
        b.author_list.some(a => a.id === authorId)
      );
      return { author, books };
    }
  );

// Use in React
const { author, books } = useStore(booksByAuthor(authorId));
```

### 5. Backend Adapter

```typescript
// src/adapters/backend.ts
interface BackendAdapter {
  listBooks(): Promise<LibraryBook[]>;
}

class TauriAdapter implements BackendAdapter {
  async listBooks() {
    return commands.clbQueryListAllBooks(this.libraryPath);
  }
}

class RemoteAdapter implements BackendAdapter {
  async listBooks() {
    const res = await fetch(`${this.baseUrl}/books`);
    return res.json();
  }
}

// Usage in store
const adapter = getBackendAdapter();
const books = await adapter.listBooks();
```

### 6. Create React Hook for Store

```typescript
// src/lib/hooks/use-books.ts
import { useEffect, useSyncExternalStore } from 'react';
import { booksStore } from '@/stores/books';

export const useBooks = (autoLoad = true) => {
  const state = useSyncExternalStore(
    booksStore.subscribe,
    () => {
      let value;
      const unsub = booksStore.subscribe(v => { value = v; });
      unsub();
      return value;
    }
  );

  useEffect(() => {
    if (autoLoad) void booksStore.load();
  }, [autoLoad]);

  return {
    books: state.items,
    loading: state.loading,
    error: state.error,
    refresh: booksStore.load,
    updateBook: booksStore.updateBook,
  };
};
```

### 7. Error Handling

```typescript
// src/lib/errors.ts
export class CitadelError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable = true
  ) {
    super(message);
  }
}

// In store
try {
  await adapter.updateBook(id, updates);
} catch (err) {
  const error = err instanceof CitadelError
    ? err
    : new CitadelError('Update failed', 'BACKEND_ERROR');
  
  update(s => ({ ...s, error }));
  console.error('[store] Update failed:', error);
}
```

### 8. Caching Strategy

```typescript
// Simple time-based cache
const CACHE_TTL = 5000; // 5 seconds

async load(forceRefresh = false) {
  const state = get({ subscribe });
  const now = Date.now();
  
  // Skip if cached and not forced
  if (!forceRefresh && state.lastFetch) {
    if (now - state.lastFetch < CACHE_TTL) {
      return; // Use cached data
    }
  }
  
  // Fetch fresh data
  const items = await adapter.listBooks();
  set({ items, loading: false, lastFetch: now });
}
```

### 9. Add with Temporary ID

```typescript
async addBook(metadata) {
  const tempId = `temp-${Date.now()}`;
  const tempBook = { id: tempId, ...metadata };
  
  // Add temp immediately
  update(s => ({ 
    ...s, 
    items: [...s.items, tempBook] 
  }));
  
  try {
    const realId = await adapter.addBook(metadata);
    
    // Replace temp with real
    update(s => ({
      ...s,
      items: s.items.map(b => 
        b.id === tempId ? { ...b, id: realId } : b
      ),
    }));
    
    return realId;
  } catch (error) {
    // Remove temp on error
    update(s => ({
      ...s,
      items: s.items.filter(b => b.id !== tempId),
      error,
    }));
    throw error;
  }
}
```

### 10. Feature Flags for Migration

```typescript
// .env
VITE_USE_NEW_STORES=true

// src/lib/feature-flags.ts
export const FEATURES = {
  USE_NEW_STORES: import.meta.env.VITE_USE_NEW_STORES === 'true',
};

// In component
const Component = () => {
  if (FEATURES.USE_NEW_STORES) {
    return <NewComponent />;
  }
  return <OldComponent />;
};
```

---

## File Structure

```
src/
├── adapters/
│   └── backend.ts           # Tauri/Remote adapter
├── stores/
│   ├── books.ts            # Books store
│   ├── authors.ts          # Authors store
│   └── settings.ts         # Settings store (existing)
├── lib/
│   ├── hooks/
│   │   ├── use-books.ts    # React hook for books
│   │   ├── use-authors.ts  # React hook for authors
│   │   └── use-store.ts    # Generic Svelte → React bridge
│   └── errors.ts           # Error types
└── components/
    └── pages/
        └── Books.tsx       # Use hooks, not contexts
```

---

## Anti-Patterns (Don't Do This)

### ❌ Manual Event Emitters
```typescript
// DON'T
eventEmitter.emit('BOOK_UPDATED', { bookId });
eventEmitter.listen('BOOK_UPDATED', () => reload());
```

**Why**: Stores automatically notify subscribers

### ❌ State in Multiple Places
```typescript
// DON'T
const [books, setBooks] = useState([]);
const { library } = useLibrary();
const booksFromStore = useStore(booksStore);
```

**Why**: Single source of truth in stores

### ❌ Unnecessary Abstraction Layers
```typescript
// DON'T
Component → Hook → Context → Service → Adapter → Command
```

**Why**: Store + Adapter is enough

### ❌ Fetching on Every Render
```typescript
// DON'T
useEffect(() => {
  library.listBooks().then(setBooks);
}, []); // Missing deps = stale closure
```

**Why**: Store handles caching automatically

### ❌ Context for Data
```typescript
// DON'T
const BooksContext = createContext<LibraryBook[]>([]);
```

**Why**: Use stores for data, context for DI only

---

## Tauri vs Remote Differences

### Tauri Mode (Current)
- ✅ Direct DB access (fast)
- ✅ No caching needed
- ✅ N+1 queries OK
- ✅ Simple error handling

### Remote Mode (Future)
- ⚠️ Network latency
- ⚠️ Need caching
- ⚠️ Batch requests
- ⚠️ Offline handling

### Handle Both
```typescript
// Adapter handles the difference
class TauriAdapter {
  // Simple, direct
  async getBookWithAuthors(id) {
    const book = await commands.getBook(id);
    const authors = await Promise.all(
      book.authorIds.map(id => commands.getAuthor(id))
    );
    return { ...book, authors };
  }
}

class RemoteAdapter {
  // Optimized for network
  async getBookWithAuthors(id) {
    // Single request with includes
    const res = await fetch(
      `${this.baseUrl}/books/${id}?include=authors`
    );
    return res.json();
  }
}
```

---

## Testing

### Test a Store
```typescript
import { get } from 'svelte/store';
import { booksStore } from '@/stores/books';
import { initializeBackendAdapter } from '@/adapters/backend';

describe('booksStore', () => {
  beforeEach(() => {
    // Mock adapter
    const mockAdapter = {
      listBooks: jest.fn().mockResolvedValue([
        { id: '1', title: 'Test Book' }
      ]),
    };
    initializeBackendAdapter(mockAdapter);
  });

  it('loads books', async () => {
    await booksStore.load();
    const state = get(booksStore);
    expect(state.items).toHaveLength(1);
    expect(state.loading).toBe(false);
  });
});
```

### Test a Component
```typescript
import { render } from '@testing-library/react';
import { booksStore } from '@/stores/books';

describe('BooksPage', () => {
  it('displays books', () => {
    // Set store state
    booksStore.set({
      items: [{ id: '1', title: 'Test' }],
      loading: false,
      error: null,
    });

    const { getByText } = render(<BooksPage />);
    expect(getByText('Test')).toBeInTheDocument();
  });
});
```

---

## Performance Tips

### 1. Selective Subscriptions
```typescript
// Subscribe to specific derived store, not entire state
const bookCount = useStore(booksCount);
// vs
const { books } = useBooks(); // Re-renders on any change
```

### 2. Memoize Derived Values
```typescript
const expensiveComputation = useMemo(
  () => books.filter(...).sort(...).map(...),
  [books]
);
```

### 3. Debounce User Input
```typescript
const [query, setQuery] = useState('');
const debouncedQuery = useDebounce(query, 300);

useEffect(() => {
  booksStore.search(debouncedQuery);
}, [debouncedQuery]);
```

---

## Quick Debugging

### Check Store State
```typescript
// In browser console
import { get } from 'svelte/store';
import { booksStore } from '@/stores/books';

console.log(get(booksStore));
```

### Log Store Changes
```typescript
// Temporary debugging
booksStore.subscribe(state => {
  console.log('[booksStore]', state);
});
```

### Check Adapter Mode
```typescript
import { getBackendAdapter } from '@/adapters/backend';

console.log(getBackendAdapter().constructor.name);
// "TauriAdapter" or "RemoteAdapter"
```

---

## Migration Checklist

Building a new feature? Follow this checklist:

1. **Store**: Create or extend store in `src/stores/`
2. **Adapter**: Add method to `BackendAdapter` interface
3. **Tauri**: Implement in `TauriAdapter` class
4. **Remote**: Implement or stub in `RemoteAdapter` class
5. **Hook**: Create or extend hook in `src/lib/hooks/`
6. **Component**: Use hook in component
7. **Test**: Add tests for store and component

That's it! No more 7-file changes.

---

## Resources

- [Svelte Stores Docs](https://svelte.dev/docs/svelte-store)
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [Full Architecture Recommendations](./ARCHITECTURE_RECOMMENDATIONS.md)
- [Migration Example](./MIGRATION_EXAMPLE.md)
- [Architecture Analysis](./ARCHITECTURE_ANALYSIS.md)