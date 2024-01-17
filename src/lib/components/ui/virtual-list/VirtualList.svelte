<script lang="ts">
  import { writable } from "svelte/store";

  import { SvelteComponent, onDestroy, onMount } from "svelte";
  type Row = $$Generic;

  export let scrollableDivHeight = "80vh";
  export let items: Array<Row> = [];
  export let renderFn: Function;
  export let skeletonFn: ((row: Row) => SvelteComponent) | undefined =
    undefined;
  /**
   * Exact height of each item in pixels.
   * Required for items to not overlap each other, and to ensure that
   * the scrollbar works correctly.
   */
  export let itemHeightPx: number = 320;

  let options = {
    rootMargin: "200px 0px 200px 0px",
    threshold: 0,
  };
  let unsubscribes: Array<(...args: any) => void> = [];
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

  function updateHeight() {
    const scrollableDiv = document.getElementById("vlist-container");
    if (scrollableDiv) {
      const rect = scrollableDiv.getBoundingClientRect();
      const offsetTop = rect.top;
      scrollableDivHeight = `calc(100vh - ${offsetTop}px)`;
    }
  }

  onMount(() => {
    window.addEventListener("resize", updateHeight);
    updateHeight(); // Set initial height
    for (const groupId in items) {
      let observer = new IntersectionObserver(callback, options);
      const element = document.querySelector(`#group-${groupId}`);
      if (element) {
        observer.observe(element);
        unsubscribes.push(observer.unobserve);
      }
    }
    visibleGroups.set(
      Object.fromEntries(items.map((_, index) => [`group-${index}`, false]))
    );
  });

  onDestroy(() => {
    window.removeEventListener("resize", updateHeight);
    for (const unsub of unsubscribes) {
      try {
        unsub();
      } catch (e) {}
    }
  });
</script>

<div
  id="vlist-container"
  style="overflow:auto; max-height: {scrollableDivHeight};"
>
  {#each items as row, index}
    <div id={`group-${index}`} style="height: {itemHeightPx}px;">
      {#if $visibleGroups[`group-${index}`]}
          <svelte:component
            this={renderFn(row).component}
            {...renderFn(row, index).props}
          />
      {/if}
    </div>
  {/each}
</div>

<style>
  .group {
    display: flex;
    flex-direction: row;
  }
</style>
