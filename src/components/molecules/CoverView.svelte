<script lang="ts">
  import type { CalibreBook } from "../../bindings";

  export let bookList: CalibreBook[];
  export let coverPathForBook: (book: CalibreBook) => string;
  export let dragHandler: (event: DragEvent, book: CalibreBook) => void;

  const shortenToXChars = (str: string, x: number) =>
    str.length > x ? str.slice(0, x) + "..." : str;
</script>

<div class="covers">
  {#each bookList as book}
    <div class="book">
      {#if book.has_cover}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img
          src={coverPathForBook(book)}
          on:dragstart={(e) => dragHandler(e, book)}
        />
        <span class="title">{shortenToXChars(book.title, 50)}</span>
        <span class="authors">{book.authors.join(", ")}</span>
      {/if}
    </div>
  {/each}
</div>

<style>
  .covers {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    gap: 20px;
  }

  .book {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    width: 100%;
  }

  .book img {
    grid-area: "cover";
    max-width: 100%;
    max-height: 400px;
  }

  span {
    text-align: center;
  }

  span.title {
    color: var(--text-primary);
    margin: 8px 0;
  }
  span.authors {
    color: var(--text-secondary);
  }
</style>
