<script lang="ts">
  import { goto } from "$app/navigation";
  import { pickLibrary } from "$lib/library/pickLibrary";
  import { settings } from "../../stores/settings";
  import { Button } from "$lib/components/ui/button";

  const openFilePicker = async () => {
    await pickLibrary();
    if ($settings.calibreLibraryPath !== "") {
      goto("/");
    }
  };
</script>

<div>
  <h1>Set up Citadel</h1>
  <label for="library-path">Pick Calibre Library Path</label>
  <Button on:click={openFilePicker} id="library-path">
    Choose Calibre Library Folder
  </Button>
</div>

<style>
  h1 {
    margin-bottom: 4rem;
    font-weight: 700;
  }
  div {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 4rem;
  }

  label {
    margin-bottom: 1rem;
  }
</style>
