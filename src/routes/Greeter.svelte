<script lang="ts">
  import { invoke } from "@tauri-apps/api/tauri";

  let name = "";
  let greetMsg = "";

  async function greet() {
    greetMsg = await invoke("greet", { name });
  }
</script>

<div>
  <label for="name">What's your name?</label>
  <input
    type="text"
    id="name"
    bind:value={name}
    placeholder="Enter your name"
  />

  <button type="button" on:click={greet}> greet</button>

  <p>{greetMsg}</p>
</div>
