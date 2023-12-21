<script lang="ts">
  import { open } from "@tauri-apps/api/dialog";
  import { settings } from "../../stores/settings";
  import { goto } from "$app/navigation";

  const openFilePicker = async () => {
    const selected = await open({
      multiple: false,
      directory: true,
      recursive: true,
      title: "Select Calibre Library Folder",
    });

    if (typeof selected === "string") {
      await settings.set("calibreLibraryPath", selected);
      goto("/");
    } else {
      console.log("no path selected", selected);
    }
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
