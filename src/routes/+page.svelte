<script>
  import Greeter from "./Greeter.svelte";
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
