<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import { libraryClientStore } from "../../stores/library";

  export let book: LibraryBook;
</script>

<div class="book">
  <!-- svelte-ignore a11y-missing-attribute -->
  <img src={$libraryClientStore.getCoverUrlForBook(book.id)} />
  <p>{book.title}</p>
  <p>{book.author_list.join(", ")}</p>
</div>

<style>
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