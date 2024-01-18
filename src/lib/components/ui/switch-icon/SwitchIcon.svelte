<script lang="ts">
  import { createRadioGroup, melt } from "@melt-ui/svelte";
  import type { CreateRadioGroupProps } from "@melt-ui/svelte";
  import type { ComponentConstructorOptions, SvelteComponent } from "svelte";
  import type { SVGAttributes, SvelteHTMLElements } from "svelte/elements";

  type $$Props = {
    value?: CreateRadioGroupProps["defaultValue"];
    optionList: {
      label: string;
      icon: new (
        options: ComponentConstructorOptions<SVGAttributes<SVGSVGElement>>
      ) => SvelteComponent<SvelteHTMLElements["svg"]>;
    }[];
  };

  export let optionList: $$Props["optionList"];
  export let value: $$Props["value"] = optionList[0].label;

  const {
    elements: { root, item, hiddenInput },
    helpers: { isChecked },
    states: { value: radioValue },
  } = createRadioGroup({
    defaultValue: value,
    orientation: "horizontal",
  });

  $: value = $radioValue;
</script>

<div use:melt={$root} class="btn-container" aria-label="View density">
  {#each optionList as option}
    <button
      use:melt={$item(option.label)}
      class="btn-item {$isChecked(option.label) ? 'selected' : ''}"
      id={option.label}
      aria-label={option.label}
    >
      <svelte:component
        this={option.icon}
        color={$isChecked(option.label)
          ? "var(--text-onbrand)"
          : "var(--text-ontertiary)"}
      />
    </button>
  {/each}
  <input name="line-height" use:melt={$hiddenInput} />
</div>

<style>
  .btn-container {
    display: flex;
    flex-direction: row;
  }

  .btn-item {
    --border-color: rgba(255, 255, 255, 0.16);
    border: 1px solid var(--border-color);
    width: 40px;
    height: 40px;
    cursor: default;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    background-color: var(--bg-tertiary);
  }

  .btn-item.selected {
    background-color: var(--bg-brand);
  }

  .btn-item:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 1px;
    z-index: 1;
    box-shadow: 0 0 0 2px var(--border-color);
  }

  .btn-item:not(.selected):hover {
    background-color: var(--bg-tertiary-hover) !important;
  }

  .btn-item:first-of-type {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .btn-item:last-of-type {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
