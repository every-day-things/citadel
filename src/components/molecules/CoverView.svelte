<script lang="ts">
  import type { CalibreBook } from "../../bindings";

  export let bookList: CalibreBook[];
  export let coverPathForBook: (book: CalibreBook) => string;
</script>

<div class="covers">
  {#each bookList as book}
    <div class="book">
      {#if book.has_cover}
        <!-- svelte-ignore a11y-missing-attribute -->
        <img src={coverPathForBook(book)} />
      {/if}
    </div>
  {/each}
</div>

<style>
  .covers {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }

  .book {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  .book img {
    grid-area: "cover";
    max-width: 100%;
    max-height: 400px;
  }
</style>
