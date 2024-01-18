<script lang="ts">
  import { writable, type Writable } from "svelte/store";

  import { List } from "svelte-virtual";

  type TGroupRow = $$Generic;

  export let items: Array<TGroupRow> = [];
  export let groupSize: Writable<number> = writable(5)
  export let groupHeight: number = 320;
  export let renderFn: Function;
  export let scrollableDivHeight: string | number;

  const groupBySize = <T,>(groupSize: number, array: Array<T>) => {
    const groups: T[][] = [];
    for (let i = 0; i < array.length; i += groupSize) {
      groups.push(array.slice(i, i + groupSize));
    }
    return groups;
  };

  $: itemsGrouped = groupBySize($groupSize, items);
</script>

<List
  itemCount={itemsGrouped.length}
  itemSize={groupHeight}
  height={scrollableDivHeight}
>
  <div slot="item" let:index let:style {style}>
    <div id={`group-${index}`} style="height: {groupHeight}px;" class="group">
      {#each itemsGrouped[index] as item}
        <svelte:component
          this={renderFn(item).component}
          {...renderFn(item, index).props}
        />
      {/each}
    </div>
  </div>
</List>

<style>
  .group {
    display: flex;
    flex-direction: row;
  }
</style>
