<script lang="ts">
  import { convertFileSrc } from "@tauri-apps/api/tauri";
  import type { CalibreBook } from "../../bindings";
  import { libraryClient } from "../../stores/library";

  export let coverPathForBook: (book: CalibreBook) => string;
  export let dragHandler: (event: DragEvent, book: CalibreBook) => void;
  export let book: CalibreBook;

  const shortenToXChars = (str: string, x: number) =>
    str.length > x ? str.slice(0, x) + "..." : str;
</script>

<!-- svelte-ignore a11y-missing-attribute -->
<img src={coverPathForBook(book)} on:dragstart={(e) => dragHandler(e, book)} />
<span class="title">{shortenToXChars(book.title, 50)}</span>
<span class="authors">{book.authors.join(", ")}</span>

<style>
  img {
    grid-area: "cover";
    max-width: 100%;
    max-height: 400px;
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
