<script lang="ts">
  import { writable } from "svelte/store";
  import { onMount, onDestroy } from "svelte";
  import type { SvelteComponent } from "svelte";

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

  const options = {
    rootMargin: "200px 0px 200px 0px",
    threshold: 0,
  };

  let visibleGroups = writable<Record<string, boolean>>({});
  let unsubscribes: Array<(...args: any) => void> = [];

  const callback: IntersectionObserverCallback = (entries) => {
    visibleGroups.update((currentVisibleGroups) => {
      let updatedVisibleGroups = { ...currentVisibleGroups }; // Create a new object for reactivity
      entries.forEach((change) => {
        updatedVisibleGroups[change.target.id] = change.isIntersecting;
      });
      return updatedVisibleGroups;
    });
  };

  function updateHeight() {
    const scrollableDiv = document.getElementById("vlist-container");
    if (scrollableDiv) {
      const offsetTop = scrollableDiv.getBoundingClientRect().top;
      scrollableDivHeight = `calc(100vh - ${offsetTop}px)`;
    }
  }

  onMount(() => {
    window.addEventListener("resize", updateHeight);
    updateHeight();
    items.forEach((_, groupId) => {
      let observer = new IntersectionObserver(callback, options);
      const element = document.querySelector(`#group-${groupId}`);
      if (element) {
        observer.observe(element);
        unsubscribes.push(() => observer.unobserve(element));
      }
    });
    visibleGroups.set(
      Object.fromEntries(items.map((_, index) => [`group-${index}`, false]))
    );
  });

  onDestroy(() => {
    window.removeEventListener("resize", updateHeight);
    unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {}
    });
  });
</script>

<div
  id="vlist-container"
  style="overflow:auto; max-height: {scrollableDivHeight};"
>
  {#each items as row, index}
    <div id={`group-${index}`} style="height: {itemHeightPx}px;">
      {#if $visibleGroups[`group-${index}`]}
        {#if renderFn}
          <svelte:component
            this={renderFn(row).component}
            {...renderFn(row, index).props}
          />
        {:else if skeletonFn}
          {skeletonFn(row)}
        {/if}
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
