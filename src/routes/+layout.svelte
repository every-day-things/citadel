<script>
  import "../app.pcss";
  import Sidebar from "../components/organisms/Sidebar.svelte";
  import "./semantic.css";
  import "./styles.css";
</script>

<div class="app">
  <main>
    <Sidebar></Sidebar>
    <div class="scrollable">
      <slot></slot>
    </div>
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
    height: fit-content;
  }

  .scrollable {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    width: 100%;
    height: 100vh;
    box-sizing: border-box;
  }
  .scrollable::-webkit-scrollbar {
    display: none;
  }

  .scrollable {
    scrollbar-width: none; /* Firefox */
  }
</style>
