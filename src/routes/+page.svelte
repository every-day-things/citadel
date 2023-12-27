<script lang="ts">
  import { goto } from "$app/navigation";
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import { onMount } from "svelte";
  import { derived, writable } from "svelte/store";
  import * as bindings from "../bindings";
  import BookTable from "../components/molecules/BookTable.svelte";
  import CoverView from "../components/molecules/CoverView.svelte";
  import {
    initLibrary,
    libraryClient,
    waitForLibrary,
  } from "../stores/library";
  import { settings, waitForSettings } from "../stores/settings";
  import { dialog } from "@tauri-apps/api";
  import { joinSync } from "$lib/path";

  initLibrary({
    libraryType: "calibre",
    connectionType: "local",
  });

  let books = writable([] as bindings.CalibreBook[]);
  let view: "table" | "cover" = "cover";
  const range = derived(books, ($books) => {
    if ($books.length === 0) {
      return "0";
    } else {
      return `1-${$books.length}`;
    }
  });

  // ensure app setup
  onMount(async () => {
    await waitForLibrary();
    await waitForSettings();

    if ($settings.calibreLibraryPath === "") {
      goto("/setup");
    } else {
      books.set(await libraryClient().listBooks());
    }
  });

  const coverImageUrl = (book: bindings.CalibreBook) => {
    const p = joinSync($settings.calibreLibraryPath, book.path, "cover.jpg");

    return convertFileSrc(p);
  };

  const addEpub = async () => {
    let filePath = await dialog.open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "EPUB",
          extensions: ["epub"],
        },
      ],
    });
    if (!filePath) {
      return;
    }
    if (typeof filePath === "object") {
      filePath = filePath[0];
    }
    const importableFile =
      await bindings.commands.checkFileImportable(filePath);
    console.log(importableFile);
    const metadata =
      await bindings.commands.getImportableFileMetadata(importableFile);
    console.log(metadata);

    const libPath = await settings.get("calibreLibraryPath");
    await bindings.commands.addBookToDbByMetadata(libPath, metadata);

    books.set(await libraryClient().listBooks());
  };
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section class="scrollable-section">
  <div class="books">
    <div class="view-control">
      <button on:click={() => (view = "table")}>Table</button>
      <button on:click={() => (view = "cover")}>Covers</button>
    </div>
    <button on:click={addEpub}>Add EPUB</button>
    <span>Showing {$range} of {$books.length} items</span>
    {#if view === "cover"}
      <CoverView bookList={$books} coverPathForBook={coverImageUrl} />
    {:else if view === "table"}
      <BookTable bookList={$books} coverPathForBook={coverImageUrl} />
    {/if}
  </div>
</section>

<style>
  section {
    margin-top: 64px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    overscroll-behavior: contain;
    padding: 16px;
    width: fit-content;
  }

  .books {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
</style>
