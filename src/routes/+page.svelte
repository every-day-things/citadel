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

  initLibrary({
    libraryType: "calibre",
    connectionType: "local",
  });

  let books = writable([] as bindings.CalibreBook[]);
  let view: "table" | "cover" = "table";
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

  const x = async () => {
    const filePath =
      "/Users/phil/Downloads/Secrets of the Autistic Millionaire.epub";
    const importableFile =
      await bindings.commands.checkFileImportable(filePath);
    console.log(importableFile);
    const metadata =
      await bindings.commands.getImportableFileMetadata(importableFile);
    console.log(metadata);

    const libPath = await settings.get("calibreLibraryPath");
    const y = await bindings.commands.addBookToDbByMetadata(libPath, metadata);
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
    <button on:click={x}>Action!</button>
    <span>Showing {$range} of {$books.length} items</span>
    {#if view === "cover"}
      <CoverView
        bookList={$books}
        coverPathForBook={(book) =>
          convertFileSrc(
            "/Users/phil/dev/macos-book-app/sample-library/" +
              book.path +
              "/cover.jpg"
          )}
      />
    {:else if view === "table"}
      <BookTable
        bookList={$books}
        coverPathForBook={(book) =>
          convertFileSrc(
            "/Users/phil/dev/macos-book-app/sample-library/" +
              book.path +
              "/cover.jpg"
          )}
      />
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
