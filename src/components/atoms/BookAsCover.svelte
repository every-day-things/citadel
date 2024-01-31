<script lang="ts">
  import { type LibraryBook } from "../../bindings";
  import { libraryClientStore } from "../../stores/library";
  import {
    getBookDownloadUrl,
    openBookInDefaultApp,
    sendToDevice,
    shortenToChars,
  } from "./BookAsCover";
  import { downloadFile } from "$lib/download";
  import { Button } from "$lib/components/ui/button";
  import type { Writable } from "svelte/store";

  export let dragHandler: (event: DragEvent, book: LibraryBook) => void;
  export let onClickHandler: () => void;
  export let book: LibraryBook;
  export let selectedItemId: Writable<LibraryBook["id"] | undefined>;

  $: isSelected = $selectedItemId === book.id;

  let isSendingToDevice = false;
  let devicePath = "";

  function handleDownload(book: LibraryBook) {
    const url = getBookDownloadUrl(book);
    if (url) {
      downloadFile(url);
    }
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-missing-attribute -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="container p-4">
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
          Send to Device</button
        >
      </div>
    {:else}
      <div class="controls">
        {#if window.__TAURI__}
          <a href="/books/{book.id}"><Button>Edit</Button></a>
          <Button on:click={() => openBookInDefaultApp(book)}>Read ↗</Button>
        {:else}
          <Button on:click={() => handleDownload(book)}>Download</Button>
        {/if}
        <Button disabled>Info</Button>
        {#if window.__TAURI__}
          <Button on:click={() => (isSendingToDevice = true)}>Send</Button>
        {/if}
        <Button disabled>Convert</Button>
        <hr />
        <Button disabled>Delete</Button>
      </div>
    {/if}
  {:else}
    <div class="cover">
      {#if $libraryClientStore.getCoverUrlForBook(book.id)}
        <img
          id="cover"
          src={$libraryClientStore.getCoverUrlForBook(book.id)}
          on:click={onClickHandler}
          on:dragstart={(e) => dragHandler(e, book)}
          class:selected={isSelected}
        />
      {:else}
        <div
          class="cover-placeholder"
          style="background-color: #{Math.floor(
            Math.random() * 16777215,
          ).toString(16)};"
        >
          {shortenToChars(book.title, 50)}
        </div>
      {/if}
      <span class="title">{shortenToChars(book.title, 50)}</span>
      <span class="authors">{book.author_list.map(item => item.name).join(", ")}</span>
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
    justify-content: flex-start;
    width: 100%;
    position: relative;
  }

  .cover-placeholder {
    width: 120px;
    height: 200px;
    display: flex;
    flex-direction: row;
    font: 4em sans-serif;
    word-wrap: break-all;
    overflow-wrap: break-word;
    overflow: hidden;
  }

  img,
  .cover-blur {
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
