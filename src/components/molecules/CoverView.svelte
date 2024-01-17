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

  const renderFn = (bookListIndex: number) => ({
    component: BookAsCover,
    props: {
      book: bookList[bookListIndex],
      dragHandler,
      isSelected: selectedItem?.id === bookList[bookListIndex].id,
      onClickHandler: () => (selectedItem = bookList[bookListIndex]),
    },
  });
</script>

<VirtualRowList
  {scrollableDivHeight}
  items={bookList.map((_, index) => index)}
  groupSize={5}
  groupHeight={totalHeight}
  {renderFn}
/>
