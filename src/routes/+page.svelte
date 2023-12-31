<script lang="ts">
  import { goto } from "$app/navigation";
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import { onMount } from "svelte";
  import { derived, writable } from "svelte/store";
  import * as bindings from "../bindings";
  import BookTable from "../components/molecules/BookTable.svelte";
  import CoverView from "../components/molecules/CoverView.svelte";
  import {
    initLibrary,
    libraryClient,
    waitForLibrary,
  } from "../stores/library";
  import { settings, waitForSettings } from "../stores/settings";
  import { joinSync } from "$lib/path";
  import { books } from "../stores/books";
  import { any } from "$lib/any";

  const coverImageAbsPath = (book: bindings.CalibreBook) => {
    return joinSync(
      $settings.calibreLibraryPath,
      book.dir_rel_path,
      "cover.jpg"
    );
  };
  const bookAbsPath = (book: bindings.CalibreBook) => {
    return joinSync(
      $settings.calibreLibraryPath,
      book.dir_rel_path,
      book.filename
    );
  };
  const x = (event: DragEvent, book: bindings.CalibreBook) => {
    event.preventDefault();
    // @ts-ignore
    window.__TAURI__.drag.startDrag({
      item: [bookAbsPath(book)],
      icon: coverImageAbsPath(book),
    });
  };


  let view: "table" | "cover" = "cover";
  let search = writable("");
  let selectedBooks = derived([books, search], ([$books, search]) =>
    $books.filter((book) =>
      search.length === 0
        ? $books
        : any(book.authors, (item) =>
            item.toLowerCase().includes(search.toLowerCase())
          ) || book.title.toLowerCase().includes(search.toLowerCase())
    )
  );
  let range = derived(selectedBooks, ($selectedBooks) =>
    $selectedBooks.length === 0 ? "0" : `1-${$selectedBooks.length}`
  );

  // ensure app setup
  onMount(async () => {
    await waitForSettings();
    await initLibrary({
      libraryType: "calibre",
      connectionType: "remote",
      // url: "http://localhost:61440"
      url: "https://carafe.beardie-cloud.ts.net"
      // libraryPath: $settings.calibreLibraryPath
    });
    await waitForLibrary();

    if (window.__TAURI_IPC__ && $settings.calibreLibraryPath === "") {
      goto("/setup");
    } else {
      books.set(await libraryClient().listBooks());
    }
  });

  const coverImageUrl = (book: bindings.CalibreBook) => {
    return book.cover_url;
    // return convertFileSrc(coverImageAbsPath(book));
  };
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section class="scrollable-section">
  <div class="books">
    <div class="view-control">
      <button on:click={() => (view = "table")}>Table</button>
      <button on:click={() => (view = "cover")}>Covers</button>
    </div>
    <span>Showing {$range} of {$selectedBooks.length} items</span>
    <input type="text" bind:value={$search} placeholder="Search" />
    {#if view === "cover"}
      <CoverView
        bookList={$selectedBooks}
        {bookAbsPath}
        coverPathForBook={coverImageUrl}
        dragHandler={x}
      />
    {:else if view === "table"}
      <BookTable bookList={$selectedBooks} coverPathForBook={coverImageUrl} />
    {/if}
  </div>
</section>

<style>
  section {
    margin-top: 64px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overscroll-behavior: contain;
    padding: 16px;
    width: fit-content;
  }

  .books {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
</style>
