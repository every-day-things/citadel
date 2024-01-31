<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { derived, writable } from "svelte/store";
  import * as bindings from "../bindings";
  import BookTable from "../components/molecules/BookTable.svelte";
  import CoverView from "../components/molecules/CoverView.svelte";
  import {
    initLibrary,
    libraryClientStore as libraryClient,
    waitForLibrary,
  } from "../stores/library";
  import { settings, waitForSettings } from "../stores/settings";
  import { books } from "../stores/books";
  import { any } from "$lib/any";
  import * as Select from "$lib/components/ui/select";
  import { Input } from "$lib/components/ui/input";
  import type { Selected } from "bits-ui";
  import SwitchIcon from "$lib/components/ui/switch-icon/SwitchIcon.svelte";
  import GridIcon from "virtual:icons/f7/square-grid-2x2";
  import ListIcon from "virtual:icons/f7/list-bullet";

  const LibraryBookSortOrder = {
    nameAz: "name-asc",
    nameZa: "name-desc",
    authorAz: "author-asc",
    authorZa: "author-desc",
  } as const;
  const LibraryBookSortOrderStrings: Record<
    keyof typeof LibraryBookSortOrder,
    string
  > = {
    nameAz: "Name (A-Z)",
    nameZa: "Name (Z-A)",
    authorAz: "Author (A-Z)",
    authorZa: "Author (Z-A)",
  } as const;
  const LBSOSEntries: Array<[keyof typeof LibraryBookSortOrder, string]> =
    Object.entries(LibraryBookSortOrder) as Array<
      [keyof typeof LibraryBookSortOrder, string]
    >;

  type LibraryBookSortOrderKinds =
    | "name-asc"
    | "name-desc"
    | "author-asc"
    | "author-desc";

  const x = (event: DragEvent, book: bindings.LibraryBook) => {
    event.preventDefault();
    const coverImageAbsPath = $libraryClient.getCoverPathForBook(
      book.id.toString(),
    );
    const bookFilePath = $libraryClient.getDefaultFilePathForBook(
      book.id.toString(),
    );

    // @ts-ignore
    window.__TAURI__.drag.startDrag({
      item: [bookFilePath],
      icon: coverImageAbsPath,
    });
  };

  let view: "table" | "cover" = "cover";
  let resolveBooksPromise: () => void;
  const booksPromise = new Promise<void>((resolve) => {
    resolveBooksPromise = resolve;
  });
  const waitForBooksPromise = () => booksPromise;

  $: sortOrderElement = undefined as Selected<string> | undefined;
  let sortOrder = writable<LibraryBookSortOrderKinds>(
    LibraryBookSortOrder.authorAz,
  );
  $: sortOrder.set(
    (sortOrderElement?.value as LibraryBookSortOrderKinds) ??
      LibraryBookSortOrder.authorAz,
  );

  let search = writable("");
  let selectedBooks = derived(
    [books, search, sortOrder],
    ([$books, search, $sortOrder]) =>
      $books
        .filter((book) =>
          search.length === 0
            ? $books
            : any(book.author_list, (item) =>
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.sortable_name.toLowerCase().includes(search.toLowerCase()),
              ) || book.title.toLowerCase().includes(search.toLowerCase()),
        )
        .filter((book) => book.title !== "" && book.author_list.length > 0)
        .toSorted((a, b) => {
          const a_author = a.author_list.length > 0 ? a.author_list[0].sortable_name : ""
          const b_author = b.author_list.length > 0 ? b.author_list[0].sortable_name : ""

          switch ($sortOrder) {
            case "name-asc":
              return a.title.localeCompare(b.title);
            case "name-desc":
              return b.title.localeCompare(a.title);
            case "author-asc":
              return a_author.localeCompare(b_author);
            case "author-desc":
              return b_author.localeCompare(a_author);
            default:
              return 0;
          }
        }),
  );
  let range = derived(selectedBooks, ($selectedBooks) =>
    $selectedBooks.length === 0 ? "0" : `1-${$selectedBooks.length}`,
  );

  // ensure app setup
  onMount(async () => {
    await waitForSettings();
    if (window.__TAURI__) {
      console.log("Running in Tauri");
      await initLibrary({
        libraryType: "calibre",
        connectionType: "local",
        libraryPath: $settings.calibreLibraryPath,
      });
    } else {
      console.log("Running in browser");
      await initLibrary({
        libraryType: "calibre",
        connectionType: "remote",
        // url: "http://localhost:61440",
        url: "https://citadel-backend.fly.dev",
      });
    }
    await waitForLibrary();

    if (window.__TAURI__ && $settings.calibreLibraryPath === "") {
      console.log("No library path set, redirecting to setup");
      goto("/setup");
    } else {
      console.log({
        tauri: window.__TAURI__,
        clp: $settings.calibreLibraryPath,
      });
      books.set(await $libraryClient.listBooks());
      resolveBooksPromise();
    }
  });
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section class="scrollable-section safe-area">
  <div class="books">
    <div class="pg-header">
      <div class="controls">
        <Input
          class="searchBox"
          type="text"
          bind:value={$search}
          placeholder="Search book titles and authors"
        />
        <Select.Root bind:selected={sortOrderElement}>
          <Select.Trigger class="w-[180px]">
            <Select.Value placeholder="Sort Order" />
          </Select.Trigger>
          <Select.Content>
            {#each LBSOSEntries as [sortOrderKey, sortOrderItem]}
              <Select.Item value={sortOrderItem}>
                {LibraryBookSortOrderStrings[sortOrderKey]}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        <SwitchIcon
          bind:value={view}
          optionList={[
            {
              label: "cover",
              icon: GridIcon,
            },
            {
              label: "table",
              icon: ListIcon,
            },
          ]}
        />
      </div>
      <span class="num_items"
        >Showing {$range} of {$selectedBooks.length} items</span
      >
    </div>
    {#await waitForBooksPromise()}
      <p>Loading books...</p>
    {:then _}
      <div class="view-container">
        {#if view === "cover"}
          <CoverView bookList={$selectedBooks} dragHandler={x} />
        {:else if view === "table"}
          <BookTable bookList={$selectedBooks} />
        {/if}
      </div>
    {/await}
  </div>
</section>

<style>
  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    width: 100%;
  }

  :global(.searchBox) {
    min-width: 40ch;
    max-width: 72ch;
    margin-right: 8px;
  }

  .pg-header {
    padding: 16px;
    box-shadow: 0 var(--shadow-height) 0 var(--shadow-color);
  }
  .safe-area {
    margin-top: 16px;
  }

  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overscroll-behavior: contain;
  }

  .num_items {
    display: block;
    color: var(--text-secondary);
    margin: 8px 0;
  }

  .books {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
</style>
