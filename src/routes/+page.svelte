<script lang="ts">
  import { listBooks } from "$lib/library/books";

  import Greeter from "./Greeter.svelte";
  import * as bindings from "../bindings";
  import { convertFileSrc } from "@tauri-apps/api/tauri";

  let books: bindings.CalibreBook[] = [];

  (async () => {
    books = await listBooks();
  })();
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section class="scrollable-section">
  <h1>citadel</h1>
  <Greeter />

  <div class="books">
    <div class="book">
      <p class="cover">Cover</p>
      <p class="title">Title</p>
      <!-- <p class="title">Title sort</p> -->
      <p class="title">Authors</p>
    </div>
    {#each books as book}
      <div class="book">
        {#if book.has_cover}
          <!-- svelte-ignore a11y-missing-attribute -->
          <img
            src={convertFileSrc(
              "/Users/phil/dev/macos-book-app/sample-library/" +
                book.path +
                "/cover.jpg"
            )}
          />
        {/if}
        <p>{book.title}</p>
        <!-- <p>{book.sortable_title}</p> -->
        <p>{book.authors.join(", ")}</p>
      </div>
    {/each}
  </div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 0.6;
  }

  h1 {
    width: 100%;
  }

  .books {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .book {
    display: grid;
    grid-template-columns: 0.3fr 1fr 0.5fr;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    gap: 16px 16px;
    grid-template-areas: "cover title authors";
  }

  .book p {
    grid-area: "title";
  }

  .book img {
    grid-area: "cover";
    max-width: 120px;
  }
</style>
