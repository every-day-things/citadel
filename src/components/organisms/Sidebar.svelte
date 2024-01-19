<script lang="ts">
  import { page } from "$app/stores";
  import { promptToAddBook, commitAddBook } from "$lib/library/addBook";
  import { pickLibrary } from "$lib/library/pickLibrary";
  import { books } from "../../stores/books";
  import { libraryClient } from "../../stores/library";
  import { Button } from "$lib/components/ui/button";
  import { writable } from "svelte/store";
  import type { ImportableBookMetadata } from "../../bindings";
  import * as Dialog from "$lib/components/ui/dialog";
  import { fade } from "svelte/transition";
  import Input from "$lib/components/ui/input/input.svelte";

  type Optional<T> = T | null;

  let sidebarOpen = false;

  let bookMetadata = writable<Optional<ImportableBookMetadata>>(null);
  let isMetadataEditorOpen = writable(false);

  let authorList = writable<string[]>([]);

  $: $authorList = $bookMetadata?.author_names ?? [];

  $: if ($bookMetadata) {
    bookMetadata.set({
      ...$bookMetadata,
      author_names: $authorList,
    });
  }

  const beginAddBookHandler = async () => {
    const res = await promptToAddBook(libraryClient());
    if (res) {
      bookMetadata.set(res);
      isMetadataEditorOpen.set(true);
    }
  };

  const commitAddBookHandler = async () => {
    if ($bookMetadata) {
      const result = await commitAddBook(libraryClient(), $bookMetadata);
      // side effects: update in-cache book list when Library updated
      books.set(await libraryClient().listBooks());
      isMetadataEditorOpen.set(false);
      bookMetadata.set(null);
    }
  };

  const switchLibraryHandler = async () => {
    await pickLibrary();
  };

  const pluralize = (count: number, singular: string, plural: string) =>
    count === 1 ? singular : plural;
</script>

{#if sidebarOpen}
  <nav>
    <button on:click={() => (sidebarOpen = false)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-layout-sidebar-left-collapse"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
        /><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" /></svg
      >
    </button>
    <div class="group">
      <p class="label">My Library</p>
      <Button variant="secondary" on:click={beginAddBookHandler}
        >⊕ Add book</Button
      >
      <Dialog.Root bind:open={$isMetadataEditorOpen}>
        <Dialog.Content transition={fade}>
          <Dialog.Header>
            <Dialog.Title>Add new book</Dialog.Title>
            {#if $bookMetadata === null } 
              <p>Something went wrong. Probably horribly wrong. If you see this message twice, please report an issue on GitHub.</p>
            {:else}
              <form class="flex flex-col gap-4">
                <label for="title">Title</label>
                <Input
                  type="text"
                  bind:value={$bookMetadata.title}
                  id="title"
                />
                <label for="authors">Authors</label>
                <p class="text-sm text-slate-400 dark:text-slate-200">
                  Adding {$authorList.length}
                  {pluralize($authorList.length, "author", "authors")}:
                  {#each $authorList as author}
                    <span
                      class="whitespace-nowrap text-sm rounded-lg px-2 py-1 bg-blue-200 m-1"
                      >{author}</span
                    >
                    {" "}
                  {/each}
                </p>
                <ul id="authors" class="flex flex-col gap-1">
                  {#each $authorList as author}
                    <li class="flex flex-row justify-between w-full">
                      <Input type="text" bind:value={author} class="max-w-72" />
                      <button
                        class="ml-2"
                        on:click={() => {
                          const newAuthorList = $authorList.filter(
                            (a) => a !== author
                          );
                          authorList.set(newAuthorList);
                        }}>X</button
                      >
                    </li>
                  {/each}
                  <button
                    on:click={() => {
                      authorList.set([...$authorList, ""]);
                    }}>+ add author</button
                  >
                </ul>
                <Button
                  variant="default"
                  on:click={commitAddBookHandler}
                  class="mt-6">Add book</Button
                >
              </form>
            {/if}
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
      <Button variant="secondary" on:click={switchLibraryHandler}
        >Switch Library</Button
      >
      <a
        href="/setup"
        aria-current={$page.url.pathname === "/setup" ? "page" : undefined}
      >
        First-time setup
      </a>
      <a aria-disabled="true">Configure library</a>
    </div>
    <div class="group">
      <p class="label">My Shelves</p>
      <a href="/" aria-current={$page.url.pathname === "/" ? "page" : undefined}
        >All books</a
      >
    </div>
    <div class="group">
      <p class="label">Devices</p>
      <!-- <a aria-disabled="true">Kobo Glo (2015)</a> -->
      <p class="note">Devices are coming soon.</p>
    </div>

    <div class="bottom">
      <div>
        <a aria-disabled="true"> ⚙️ Settings </a>
      </div>
    </div>
  </nav>
{:else}
  <div class="floating-open">
    <button class="open" on:click={() => (sidebarOpen = true)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-layout-sidebar-left-expand"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
        />
        <path d="M9 4v16" />
        <path d="M14 10l2 2l-2 2" />
      </svg>
    </button>
  </div>
{/if}

<style>
  button:has(svg) {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: var(--text-onsecondary);
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button.open:has(svg) {
    color: var(--text-primary);
  }

  .floating-open {
    position: sticky;
    padding: 8px 0;
    z-index: 100;
    background-color: var(--bg-secondary);
  }

  .group {
    display: flex;
    flex-direction: column;
    border-top: 1px solid #444;
    gap: 8px;
    margin-bottom: 8px;
  }
  .group .label {
    margin: 8px 0;
    font-weight: bold;
  }
  .note {
    font-style: italic;
  }

  nav {
    position: sticky;
    display: flex;
    flex-direction: column;
    top: 0;
    height: 100vh;
    padding: 8px 16px;
    background-color: var(--bg-secondary);
    width: 236px;
    min-width: 236px;
    box-sizing: border-box;
  }
  p,
  a {
    color: var(--text-onsecondary);
  }
  a[aria-disabled="true"] {
    color: var(--text-secondary);
    cursor: not-allowed;
  }
  a[aria-disabled="true"]:hover {
    text-decoration: none;
  }

  .bottom {
    padding: 8px;
    margin-top: auto;
    transform: translateY(-100%);
  }

  a[aria-current="page"] {
    color: var(--text-brand);
  }
</style>
