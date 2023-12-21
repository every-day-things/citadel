<script lang="ts">
  import { initClient as initCalibreClient } from "$lib/library/calibre";

  import * as bindings from "../bindings";
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import BookTable from "../components/molecules/BookTable.svelte";
  import CoverView from "../components/molecules/CoverView.svelte";

  let library = initCalibreClient();
  let books: bindings.CalibreBook[] = [];
  let view: "table" | "cover" = "table";

  const range = `1-${books.length}`;

  (async () => {
    books = await library.listBooks();
  })();
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
    <span>Showing {range} of {books.length} items</span>
    {#if view === "cover"}
      <CoverView
        bookList={books}
        coverPathForBook={(book) =>
          convertFileSrc(
            "/Users/phil/dev/macos-book-app/sample-library/" +
              book.path +
              "/cover.jpg"
          )}
      />
    {:else if view === "table"}
      <BookTable
        bookList={books}
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
    width: 100%;
  }

  .books {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
</style>
