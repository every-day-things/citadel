<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItem: LibraryBook | undefined;
</script>

<div class="covers">
  {#each bookList as book}
    <div class="book">
      <BookAsCover
        {book}
        {dragHandler}
        isSelected={selectedItem?.id === book.id}
        onClickHandler={() => (selectedItem = book)}
      />
    </div>
  {/each}
</div>

<style>
  .covers {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 1200px) {
    .covers {
      grid-template-columns: 1fr 1fr 1fr 1fr;
    }
  }

</style>
