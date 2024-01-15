<script lang="ts">
  import { type LibraryBook } from "../../bindings";
  import { libraryClientStore } from "../../stores/library";
  import { openBookInDefaultApp, sendToDevice, shortenToChars } from "./BookAsCover";
  import { Button } from "$lib/components/ui/button";

  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;
  export let onClickHandler: () => void;
  export let book: LibraryBook;
  export let isSelected = false;

  let isSendingToDevice = false;
  let devicePath = "";
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-missing-attribute -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="container">
  {#if isSelected}
    {#if isSendingToDevice}
      <div class="controls">
        <button on:click={() => (isSendingToDevice = false)}>← Cancel</button>
        <label for="devicePath">Device Path</label>
        <input
          id="devicePath"
          type="text"
          placeholder="/mnt/MySdCard"
          bind:value={devicePath}
        />

        <button
          on:click={() => {
            isSendingToDevice = false;
            sendToDevice(book, devicePath);
          }}
          >
          Send to Device</button>
      </div>
    {:else}
      <div class="controls">
        <a href="/books/{book.id}"><Button>Edit</Button></a>
        <Button on:click={() => openBookInDefaultApp(book)}>Read ↗</Button>
        <Button disabled>Info</Button>
        <Button on:click={() => (isSendingToDevice = true)}>Send</Button>
        <Button disabled>Convert</Button>
        <hr />
        <Button disabled>Delete</Button>
      </div>
    {/if}
  {:else}
    <div class="cover">
      <img
        id="cover"
        src={$libraryClientStore.getCoverUrlForBook(book.id)}
        on:click={onClickHandler}
        on:dragstart={(e) => dragHandler(e, book)}
        class:selected={isSelected}
      />
      <span class="title">{shortenToChars(book.title, 50)}</span>
      <span class="authors">{book.author_list.join(", ")}</span>
      <img
        src={$libraryClientStore.getCoverUrlForBook(book.id)}
        class="cover-blur"
      />
    </div>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    width: 100%;
    position: relative;
  }

  img, .cover-blur {
    max-width: 100%;
    max-height: 240px;
    transition: all 0.2s ease-in-out;
    border: 2px solid transparent;
    position: relative;
    z-index: 1;
  }

  img:hover {
    transform: scale(1.02);
  }

  .cover-blur {
    opacity: 0;
    position: absolute;
    top: 10px;
    transform: scale(1.02);
    filter: blur(5px) opacity(0.3);
    z-index: 0;
    border-radius: 64px;
  }

  #cover:hover ~ .cover-blur {
    opacity: 1;
  }

  .selected {
    border: 2px solid #0f0;
  }

  span {
    text-align: center;
  }

  span.title {
    color: var(--text-primary);
    margin: 8px 0;
  }
  span.authors {
    color: var(--text-secondary);
  }
</style>
