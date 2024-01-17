<script lang="ts">
  import VirtualRowList from "$lib/components/ui/virtual-list/VirtualRowList.svelte";
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItem: LibraryBook | undefined;
  const itemHeight = 320;
  const itemMarginTotal = 40;
  const totalHeight = itemHeight + itemMarginTotal;
  const scrollableDivHeight = "80vh";

  const renderFn = (book: LibraryBook) => ({
    component: BookAsCover,
    props: {
      book,
      dragHandler,
      isSelected: selectedItem?.id === book.id,
      onClickHandler: () => (selectedItem = book)
    }
  });
</script>

<VirtualRowList
  {scrollableDivHeight}
  items={bookList}
  groupSize={5}
  groupHeight={totalHeight}
  {renderFn}
/>
