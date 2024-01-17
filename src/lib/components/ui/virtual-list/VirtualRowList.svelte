<script lang="ts">
  import VirtualList from './VirtualList.svelte';
  import VirtualRowListItem from './VirtualRowListGroup.svelte';

  import { SvelteComponent} from "svelte";
  type TGroupRow = $$Generic;

  export let items: Array<TGroupRow> = [];
  export let groupSize: number = 5;
  export let groupHeight: number = 320;
  export let renderFn: Function;
  export let scrollableDivHeight = "80vh";
  export let skeletonFn: ((row: TGroupRow) => SvelteComponent) | undefined =
    undefined;

  const groupBySize = <T,>(groupSize: number, array: Array<T>) => {
    const groups: T[][] = [];
    for (let i = 0; i < array.length; i += groupSize) {
      groups.push(array.slice(i, i + groupSize));
    }
    return groups;
  };

  $: itemsGrouped = groupBySize(groupSize, items);


  const renderFn2 = (row: TGroupRow, index: number) => {
    return {
      component: VirtualRowListItem,
      props: {
        groupItems: row,
        index,
        renderItem: renderFn,
        groupHeight,
      },
    };
  };
</script>

<VirtualList
  {scrollableDivHeight}
  items={itemsGrouped}
  renderFn={renderFn2}
/>
