<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { onMount } from "svelte";
  import { libraryClient } from "../../../stores/library";
  import type { PageData } from "./$types";
  import type { CalibreBook } from "../../../bindings";

  export let data: PageData;
  let book: CalibreBook;
  let pageTitle: string;

  onMount(async () => {
    book = (await libraryClient().listBooks()).filter(
      (book) => book.id.toString() === data?.id
    )[0];

    pageTitle = `"${book?.title}" by ${book?.authors.join(", ")}`;
  });

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);

    libraryClient().updateBook(book!.id.toString(), {
      title: (formData.get("title") as string | undefined) ?? book.title ?? "",
    });
    invalidateAll();
  };
</script>

<div class="safeAreaView">
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
      <label for="authors">Authors</label>
      <input
        disabled
        type="text"
        id="authors"
        name="authors"
        value={book?.authors}
      />

      <label for="sortable_authors">Sort authors</label>
      <input
        disabled
        type="text"
        id="sortable_authors"
        name="sortable_authors"
        value={book?.sortable_author_list}
      >
      <span class="text-label-small">Sort fields are set automatically.</span>
    </fieldset>

    <button type="submit">Save</button>
  </form>
</div>

<style>
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
