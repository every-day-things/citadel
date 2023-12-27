<script lang="ts">
  import { goto } from "$app/navigation";
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
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

  initLibrary({
    libraryType: "calibre",
    connectionType: "local",
  });

  let view: "table" | "cover" = "cover";
  const range = derived(books, ($books) => {
    if ($books.length === 0) {
      return "0";
    } else {
      return `1-${$books.length}`;
    }
  });

  // ensure app setup
  onMount(async () => {
    await waitForLibrary();
    await waitForSettings();

    if ($settings.calibreLibraryPath === "") {
      goto("/setup");
    } else {
      books.set(await libraryClient().listBooks());
    }
  });

  const coverImageUrl = (book: bindings.CalibreBook) => {
    return convertFileSrc(coverImageAbsPath(book));
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
    <span>Showing {$range} of {$books.length} items</span>
    {#if view === "cover"}
      <CoverView
        bookList={$books}
        coverPathForBook={coverImageUrl}
        dragHandler={x}
      />
    {:else if view === "table"}
      <BookTable bookList={$books} coverPathForBook={coverImageUrl} />
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
