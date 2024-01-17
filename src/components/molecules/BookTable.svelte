<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import { libraryClientStore } from "../../stores/library";
  import BookTableRow from "../atoms/BookTableRow.svelte";
  import VirtualList from "$lib/components/ui/virtual-list/VirtualList.svelte";

  export let bookList: LibraryBook[];

  const scrollableDivHeight = "80vh";

  const renderFn = (book: LibraryBook) => ({
    component: BookTableRow,
    props: {
      book,
    },
  });
</script>

<div class="book header">
  <p class="cover">Cover</p>
  <p class="title">Title</p>
  <p class="title">Authors</p>
</div>
<VirtualList
  {scrollableDivHeight}
  items={bookList}
  {renderFn}
  itemHeightPx={220}
/>

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
</style>
