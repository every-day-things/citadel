<script lang="ts">
  type GroupRowType = $$Generic;

  export let index: number = 0;
  export let groupItems: Array<GroupRowType> = [];
  export let groupHeight: number;
  export let renderItem: Function;
</script>

<div id={`group-${index}`} style="height: {groupHeight}px;" class="group">
{#each groupItems as item }
    <svelte:component
      this={renderItem(item).component}
      {...renderItem(item).props}
    />
{/each}
</div>

<style>
  .group {
    display: flex;
    flex-direction: row;
  }
</style>
