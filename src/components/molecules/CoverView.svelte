<script lang="ts">
  import VirtualRowList from "$lib/components/ui/virtual-list/VirtualRowList.svelte";
  import { writable } from "svelte/store";
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";
  import { onMount } from "svelte";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItemId = writable<LibraryBook["id"] | undefined>(undefined);
  const itemHeight = 320;
  const itemMarginTotal = 40;
  const totalHeight = itemHeight + itemMarginTotal;
  const scrollableDivHeight = "80vh";

  let groupSize = writable(5);

  onMount(() => {
    groupSize.set(window.innerWidth < 1200 ? 4 : 6);
    window.addEventListener("resize", () => {
      groupSize.set(window.innerWidth < 1200 ? 4 : 6);
    });
  });

  const renderFn = (bookListIndex: number) => ({
    component: BookAsCover,
    props: {
      book: bookList[bookListIndex],
      dragHandler,
      selectedItemId,
      onClickHandler: () => {
        selectedItemId.set(bookList[bookListIndex].id);
      },
    },
  });
</script>

<VirtualRowList
  {scrollableDivHeight}
  items={bookList.map((_, index) => index)}
  {groupSize}
  groupHeight={totalHeight}
  {renderFn}
/>
