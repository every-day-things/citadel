<script lang="ts">
  import type { LibraryBook } from "../../bindings";
  import BookAsCover from "../atoms/BookAsCover.svelte";
  import { Grid } from "svelte-virtual";
  import { onMount, onDestroy } from "svelte";
  import { writable } from "svelte/store";

  export let bookList: LibraryBook[];
  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;

  let selectedItem: LibraryBook | undefined;

  let itemHeight = 320;
  let itemMarginTotal = 40;
  let totalHeight = itemHeight + itemMarginTotal;

  const groupBySize = <T,>(groupSize: number, array: Array<T>) => {
    const groups: T[][] = [];
    for (let i = 0; i < array.length; i += groupSize) {
      groups.push(array.slice(i, i + groupSize));
    }
    return groups;
  };

  $: bookGroups = groupBySize(5, bookList);
  let visibleGroups = writable<Record<string, boolean>>({});

  let callback: IntersectionObserverCallback = (entries) => {
    visibleGroups.update((currentVisibleGroups) => {
      let updatedVisibleGroups = { ...currentVisibleGroups }; // Create a new object for reactivity
      entries.forEach((change) => {
        if (change.isIntersecting) {
          updatedVisibleGroups[change.target.id] = true;
        } else {
          updatedVisibleGroups[change.target.id] = false;
        }
      });
      return updatedVisibleGroups; // Return the updated object
    });
  };

  let options = {
    rootMargin: "200px 0px 200px 0px",
    threshold: 0,
  };
  let unsubscribes: Array<(...args: any) => void> = [];

  let scrollableDivHeight = "80vh";

  function updateHeight() {
    const scrollableDiv = document.getElementById('scrollable-div');
    if (scrollableDiv) {
      const rect = scrollableDiv.getBoundingClientRect();
      const offsetTop = rect.top;
      scrollableDivHeight = `calc(100vh - ${offsetTop}px)`;
    }
  }

  onMount(() => {
    window.addEventListener('resize', updateHeight);
    updateHeight(); // Set initial height
    for (const groupId in bookGroups) {
      let observer = new IntersectionObserver(callback, options);
      const element = document.querySelector(`#group-${groupId}`);
      if (element) {
        observer.observe(element);
        unsubscribes.push(observer.unobserve);
      }
    }
    visibleGroups.set(
      Object.fromEntries(
        bookGroups.map((_, index) => [`group-${index}`, false])
      )
    );
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateHeight);
    for (const unsub of unsubscribes) {
      try {
        unsub();
      } catch (e) {
      }
    }
  });
</script>

<div id="scrollable-div" style="overflow:auto; max-height: {scrollableDivHeight};">
  {#each bookGroups as group, index}
    <div id={`group-${index}`} style="height: {totalHeight}px;" class="group">
      {#if $visibleGroups[`group-${index}`]}
        {#each group as book}
          <BookAsCover
            book={book}
            {dragHandler}
            isSelected={selectedItem?.id === book.id}
            onClickHandler={() => (selectedItem = book)}
          />
        {/each}
      {/if}
    </div>
  {/each}
</div>

<style>
  .group {
    display: flex;
    justify-content: space-between;
  }

  #grid-container {
    display: flex;
    height: 100%;
  }
</style>
