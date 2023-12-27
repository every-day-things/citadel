<script lang="ts">
  import { goto } from "$app/navigation";
  import { pickLibrary } from "$lib/library/pickLibrary";

  const openFilePicker = async () => {
    await pickLibrary();
    goto("/");
  };
</script>

<div>
  <h1>Set up Citadel</h1>
  <label for="library-path">Pick Calibre Library Path</label>
  <button on:click={openFilePicker} id="library-path"
    >Choose Calibre Library Folder</button
  >
</div>

<style>
  div {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 4rem;
  }

  button {
    width: auto;
    margin: auto;
  }
</style>
