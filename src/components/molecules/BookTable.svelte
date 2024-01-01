<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import { libraryClientStore } from "../../stores/library";

  export let bookList: LibraryBook[];
</script>

<div class="book header">
  <p class="cover">Cover</p>
  <p class="title">Title</p>
  <p class="title">Authors</p>
</div>
{#each bookList as book}
  <div class="book">
    <!-- svelte-ignore a11y-missing-attribute -->
    <img src={$libraryClientStore.getCoverUrlForBook(book.id)} />
    <p>{book.title}</p>
    <p>{book.author_list.join(", ")}</p>
  </div>
{/each}

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

  .header {
    border-bottom: 2px solid rgba(0, 0, 0, 0.05);
  }

  .book p {
    grid-area: "title";
  }
  .book img {
    grid-area: "cover";
    max-width: 120px;
  }
</style>
