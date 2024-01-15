<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";
  import { Grid } from "svelte-virtual";
  import { onMount, onDestroy } from "svelte";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItem: LibraryBook | undefined;

  let itemHeight = 320;
  let itemMarginTotal = 40;
  let totalHeight = itemHeight + itemMarginTotal;

  let gridHeight = 700;
</script>

<div id="grid-container">
  <Grid
    itemCount={bookList.length}
    itemHeight={totalHeight}
    itemWidth={220}
    bind:height={gridHeight}
  >
    <div slot="item" let:index let:style {style}>
      <BookAsCover
        book={bookList[index]}
        {dragHandler}
        isSelected={selectedItem?.id === bookList[index].id}
        onClickHandler={() => (selectedItem = bookList[index])}
      />
    </div>
  </Grid>
</div>

<style>
  #grid-container {
    display: flex;
    height: 100%;
  }
</style>
