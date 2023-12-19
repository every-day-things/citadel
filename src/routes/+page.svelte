<script lang="ts">
  import type { ExStruct } from "../bindings";

  import Greeter from "./Greeter.svelte";
  import * as bindings from "../bindings";

  const a: ExStruct = {
    some_field: "some value",
  };

  (async () => {
    const result = await bindings.commands.someStruct();
    console.log(result.some_field);
  })();
</script>

<svelte:head>
  <title>Library</title>
</svelte:head>

<section>
  <h1>citadel</h1>

  <Greeter />
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 0.6;
  }

  h1 {
    width: 100%;
  }
</style>
