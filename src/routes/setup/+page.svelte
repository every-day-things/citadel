<script lang="ts">
  import { open } from "@tauri-apps/api/dialog";
  import { settings } from "../../stores/settings";

  const openFilePicker = async () => {
    const selected = await open({
      multiple: false,
      directory: true,
      filters: [
        {
          name: "Image",
          extensions: ["png", "jpeg"],
        },
      ],
    });

    if (typeof selected === "string") {
      settings.set("calibreLibraryPath", selected);
    } else {
      console.log("no path selected", selected);
    }
  };
</script>

<div>
  <button on:click={openFilePicker}>Choose Calibre Library Folder</button>
</div>
