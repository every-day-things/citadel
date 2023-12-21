<script lang="ts">
  import { initClient as initCalibreClient } from "$lib/library/calibre";

  import { goto } from "$app/navigation";
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import { onMount } from "svelte";
  import * as bindings from "../bindings";
  import BookTable from "../components/molecules/BookTable.svelte";
  import CoverView from "../components/molecules/CoverView.svelte";
  import { settings, waitForSettings } from "../stores/settings";
  import type { Library } from "$lib/library/backend";
  import { derived, writable } from "svelte/store";

  let library: Library;
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
    await waitForSettings();
    if ($settings.calibreLibraryPath === "") {
      goto("/setup");
    } else {
      library = initCalibreClient();
      books.set(await library.listBooks());
    }
  });
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
