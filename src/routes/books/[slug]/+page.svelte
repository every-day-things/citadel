<script lang="ts">
  import { invalidate, invalidateAll } from "$app/navigation";
  import { commands } from "../../../bindings";
  import { settings } from "../../../stores/settings";
  import type { PageData } from "./$types";

  export let data: PageData;

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    const libPath = $settings.calibreLibraryPath;

    const formData = new FormData(event.currentTarget as HTMLFormElement);

    const new_book = await commands.updateBook(
      libPath,
      data.id.toString(),
      (formData.get("title") as string | undefined) ?? data.title ?? ""
    );
    invalidateAll();
  };
</script>

<div class="safeAreaView">
  <button on:click={() => history.back()}>X</button>
  <h1>Editing {data.pageTitle}</h1>

  <form on:submit={save}>
    <fieldset>
      <label for="title">Title</label>
      <input type="text" id="title" name="title" value={data.title} />

      <label for="sortable_title">Sort title</label>
      <input
        disabled
        type="text"
        id="sortable_title"
        name="sortable_title"
        value={data.sortable_title}
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
        value={data.authors}
      />

      <label for="sortable_authors">Sort authors</label>
      <input
        disabled
        type="text"
        id="sortable_authors"
        name="sortable_authors"
        value={data.sortable_author_list}
      />
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
