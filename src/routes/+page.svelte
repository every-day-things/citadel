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

  const LibraryBookSortOrder = {
    nameAz: "name-asc",
    nameZa: "name-desc",
    authorAz: "author-asc",
    authorZa: "author-desc",
  } as const;
  type LibraryBookSortOrder =
    | "name-asc"
    | "name-desc"
    | "author-asc"
    | "author-desc";

  const x = (event: DragEvent, book: bindings.LibraryBook) => {
    event.preventDefault();
    const coverImageAbsPath = $libraryClient.getCoverPathForBook(
      book.id.toString()
    );
    const bookFilePath = $libraryClient.getDefaultFilePathForBook(
      book.id.toString()
    );

    // @ts-ignore
    window.__TAURI__.drag.startDrag({
      item: [bookFilePath],
      icon: coverImageAbsPath,
    });
  };

  let view: "table" | "cover" = "cover";
  let sortOrder = writable<LibraryBookSortOrder>(LibraryBookSortOrder.authorAz);
  let search = writable("");
  let selectedBooks = derived(
    [books, search, sortOrder],
    ([$books, search, $sortOrder]) =>
      $books
        .filter((book) =>
          search.length === 0
            ? $books
            : any(book.author_list, (item) =>
                item.toLowerCase().includes(search.toLowerCase())
              ) || book.title.toLowerCase().includes(search.toLowerCase())
        )
        .filter((book) => book.title !== "" && book.author_list.length > 0)
        .toSorted((a, b) => {
          const a_author = a.author_list.length > 0 ? a.author_list[0] : "";
          const b_author = b.author_list.length > 0 ? b.author_list[0] : "";

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
        })
  );
  let range = derived(selectedBooks, ($selectedBooks) =>
    $selectedBooks.length === 0 ? "0" : `1-${$selectedBooks.length}`
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
        // url: "http://localhost:61440"
        url: "https://carafe.beardie-cloud.ts.net",
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
    }
  });
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section class="scrollable-section">
  <div class="books">
    <div class="controls">
      <input
        type="text"
        bind:value={$search}
        placeholder="Search book titles and authors"
      />
      <div class="switch">
        <button
          on:click={() => (view = "table")}
          class={view === "table" ? "selected" : ""}>Table</button
        >
        <button
          on:click={() => (view = "cover")}
          class={view === "cover" ? "selected" : ""}>Covers</button
        >
      </div>
      <select bind:value={$sortOrder}>
        <option value={LibraryBookSortOrder.nameAz}>Name (A-Z)</option>
        <option value={LibraryBookSortOrder.nameZa}>Name (Z-A)</option>
        <option value={LibraryBookSortOrder.authorAz}>Author (A-Z)</option>
        <option value={LibraryBookSortOrder.authorZa}>Author (Z-A)</option>
      </select>
    </div>
    <span class="num_items"
      >Showing {$range} of {$selectedBooks.length} items</span
    >
    {#if view === "cover"}
      <CoverView bookList={$selectedBooks} dragHandler={x} />
    {:else if view === "table"}
      <BookTable bookList={$selectedBooks} />
    {/if}
  </div>
</section>

<style>
  .controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
  }

  .switch {
    display: flex;
    flex-direction: row;
  }

  .switch button:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .switch button:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  .switch button {
    background: var(--bg-secondary);
    color: var(--text--onsecondary);
    border: none;
    padding: 8px;
    font-size: 1.2rem;
    cursor: pointer;
    margin: 0;
  }

  .switch button.selected {
    background: var(--bg-primary);
    color: var(--text-onprimary);
  }

  input {
    color: var(--text--onsecondary);
    background-color: var(--bg-secondary);
    min-width: 64ch;
    max-width: 84ch;
    padding: 4px;
  }

  section {
    margin-top: 64px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overscroll-behavior: contain;
    padding: 16px;
    width: calc(100% - 32px);
  }

  .num_items {
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .books {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
</style>
