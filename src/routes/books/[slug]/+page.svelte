<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import { libraryClient } from "../../../stores/library";
  import type { PageData } from "./$types";
  import type { LibraryBook, LibraryAuthor } from "../../../bindings";
  import { writable } from "svelte/store";
  import { Button } from "$lib/components/ui/button";

  import {
    createCombobox,
    melt,
    type ComboboxOptionProps,
  } from "@melt-ui/svelte";
  import CheckIcon from "virtual:icons/f7/checkmark-alt";
  import ChevronUpIcon from "virtual:icons/f7/chevron-down";
  import ChevronDownIcon from "virtual:icons/f7/chevron-up";
  // import { Check, ChevronDown, ChevronUp } from 'lucide-svelte';
  // import { fly } from 'svelte/transition';

  let authors: LibraryAuthor[] = [
    {
      id: "awk",
      name: "Author 1",
      sortable_name: "Author 1",
    },
    {
      id: "qz",
      name: "Author 2",
      sortable_name: "Author 2",
    },
    {
      id: "9",
      name: "Author 3",
      sortable_name: "Author 3",
    },
  ];

  const toOption = (
    author: LibraryAuthor
  ): ComboboxOptionProps<LibraryAuthor> => ({
    value: author,
    label: author.name,
    disabled: false,
  });

  const {
    elements: { menu, input, option, label},
    states: { open, inputValue, touchedInput, selected },
    helpers: { isSelected },
  } = createCombobox<LibraryAuthor, true>({
    forceVisible: true,
    multiple: true,
    positioning: {
      placement: "right",
      strategy: "absolute",
    },
  });

  $: if ($selected) {
    $inputValue = "";
  }

  $: filteredAuthors = $touchedInput
    ? authors.filter(({ id, name }) => {
        const normalizedInput = $inputValue.toLowerCase();
        return (
          id.toLowerCase().includes(normalizedInput) ||
          name.toLowerCase().includes(normalizedInput)
        );
      })
    : authors;

  export let data: PageData;
  let book: LibraryBook;
  let pageTitle: string;

  $: pageTitle = `"${book?.title}" by ${book?.author_list
    .map((item) => item.name)
    .join(", ")}`;

  let metadata = writable<LibraryBook>({} as LibraryBook);

  const getBookMatchingId = async (
    id: LibraryBook["id"]
  ): Promise<LibraryBook> => {
    return (await libraryClient().listBooks()).filter(
      (book) => book.id.toString() === id
    )[0];
  };

  const x = async (id: string) => {
    book = await getBookMatchingId(id);
    authors = (await libraryClient().listAuthors()).toSorted((a, b) =>
      a.sortable_name.localeCompare(b.sortable_name)
    );
    metadata.set(book);
    selected.set(book.author_list.map(toOption));
  };

  onMount(async () => {
    await x(data.id);
  });

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);

    libraryClient().updateBook(book!.id.toString(), {
      title: (formData.get("title") as string | undefined) ?? book.title ?? "",
      author_id_list: $selected?.map((author) => author.value.id) ?? [],
      publication_date: null,
      timestamp: null,
    });
    invalidateAll();
    x(data.id);
  };
</script>

<div class="safeAreaView">
  {#if window.__TAURI__}
    <button on:click={() => history.back()}>X</button>
    <h1>Editing {pageTitle}</h1>

    <form on:submit={save}>
      <fieldset>
        <label for="title">Title</label>
        <input type="text" id="title" name="title" value={book?.title} />

        <label for="sortable_title">Sort title</label>
        <input
          disabled
          type="text"
          id="sortable_title"
          name="sortable_title"
          value={book?.sortable_title}
        />
        <span class="text-label-small">Sort fields are set automatically.</span>
      </fieldset>
      <fieldset>
        <div class="flex flex-col gap-1">
          <!-- svelte-ignore a11y-label-has-associated-control - $label contains the 'for' attribute -->
          <label use:melt={$label}>
            <span class="text-sm font-medium">Authors for this work:</span>
          </label>
          <div class="flex row justify-between">
            <div class="flex row">
              {#if $selected}
                {#each $selected as author}
                  <span class="bg-blue-500 p-2 rounded-xl m-2"
                    >{author.value.name}</span
                  >
                {/each}
              {/if}
            </div>

            <div class="relative w-min">
              <input
                use:melt={$input}
                class="flex h-10 items-center justify-between rounded-lg bg-white
                px-3 pr-12 text-black"
                placeholder="Author name..."
              />
              <div
                class="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-slate-900"
              >
                {#if $open}
                  <ChevronUpIcon class="square-4" />
                {:else}
                  <ChevronDownIcon class="square-4" />
                {/if}
              </div>
            </div>
          </div>
          {#if $open}
            <ul
              class="z-10 flex max-h-[300px] flex-col overflow-hidden rounded-lg bg-white shadow-md text-black"
              use:melt={$menu}
            >
              <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
              <div
                class="flex max-h-fit flex-col gap-0 overflow-y-auto bg-white px-2 py-2 text-black"
                tabindex="0"
              >
                {#each filteredAuthors as author, index (index)}
                  <li
                    use:melt={$option(toOption(author))}
                    class="relative cursor-pointer scroll-my-2 rounded-md py-2 pl-4 pr-4
                border-b border-slate-100 hover:bg-slate-100
              hover:bg-slate-100
              data-[highlighted]:bg-slate-200 data-[highlighted]:text-slate-900
                data-[disabled]:opacity-50"
                  >
                    {#if $isSelected(author)}
                      <div
                        class="check absolute left-2 top-1/2 z-10 text-slate-900"
                      >
                        <CheckIcon class="square-4" style="color: green;" />
                      </div>
                    {/if}
                    <div class="pl-4">
                      <span class="font-medium">{author.name}</span>
                    </div>
                  </li>
                {:else}
                  <li class="relative cursor-pointer rounded-md py-1 pl-8 pr-4">
                    No results found
                  </li>
                {/each}
              </div>
            </ul>
          {/if}
        </div>
        <span class="text-label-small">Sort fields are set automatically.</span>
      </fieldset>

      <button type="submit">Save</button>
    </form>
  {:else}
    <p>
      You cannot edit book metadata outside of the Citadel desktop app. For now!
    </p>

    <Button><a href="/">go home</a></Button>
  {/if}
</div>

<style>
  .check {
    position: absolute;
    left: 0.5rem;
    top: 50%;
    translate: 0 calc(-50% + 1px);
  }

  h1 {
    font-size: 1rem;
  }
  .safeAreaView {
    margin-top: 48px;
  }

  form,
  fieldset {
    display: flex;
    flex-direction: column;
  }

  .text-label-small {
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 4px;
    margin-left: 4px;
  }
</style>
