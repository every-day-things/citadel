<script lang="ts">
  import VirtualRowList from "$lib/components/ui/virtual-list/VirtualRowList.svelte";
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItem: LibraryBook | undefined;

  let itemHeight = 320;
  let itemMarginTotal = 40;
  let totalHeight = itemHeight + itemMarginTotal;

  let scrollableDivHeight = "80vh";
  const renderFn = (book: LibraryBook) => {
    return {
      component: BookAsCover,
      props: {
        book,
        dragHandler,
        isSelected: selectedItem?.id === book.id,
        onClickHandler: () => (selectedItem = book)
      }
    };
  };
</script>

<VirtualRowList
  {scrollableDivHeight}
  items={bookList}
  groupSize={5}
  groupHeight={totalHeight}
  {renderFn}
/>
