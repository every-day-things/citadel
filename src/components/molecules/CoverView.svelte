<script lang="ts">
  import type { CalibreBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";

  export let bookList: CalibreBook[];
  export let coverPathForBook: (book: CalibreBook) => string;
  export let dragHandler: (event: DragEvent, book: CalibreBook) => void;
  export let bookAbsPath: (book: CalibreBook) => string;

  let selectedItem: CalibreBook | undefined;
</script>

<div class="covers">
  {#each bookList as book}
    <div class="book">
      {#if book.has_cover}
        <BookAsCover
          {book}
          {coverPathForBook}
          {dragHandler}
          {bookAbsPath}
          isSelected={selectedItem?.id === book.id}
          onClickHandler={() => (selectedItem = book)}
        />
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

</style>
