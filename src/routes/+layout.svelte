<script>
  import Sidebar from "../components/organisms/Sidebar.svelte";
  import Header from "./Header.svelte";
  import "./semantic.css";
  import "./styles.css";
</script>

<div class="app">
  <Header />

  <main>
    <Sidebar />
    <slot />
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: row;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
    height: 100vh;
  }
</style>
