<script lang="ts">
  import { page } from "$app/stores";
  import { addBook } from "$lib/library/addBook";
  import { pickLibrary } from "$lib/library/pickLibrary";
  import { books } from "../../stores/books";
  import { libraryClient } from "../../stores/library";
  import { settings } from "../../stores/settings";

  let sidebarOpen = false;

  const addBookHandler = async () => {
    await addBook(libraryClient());
    // side effects: update in-cache book list when Library updated
    books.set(await libraryClient().listBooks());
  };

  const switchLibraryHandler = async () => {
    await pickLibrary();
  };
</script>

{#if sidebarOpen}
  <nav>
    <button on:click={() => (sidebarOpen = false)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-layout-sidebar-left-collapse"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
        /><path d="M9 4v16" /><path d="M15 10l-2 2l2 2" /></svg
      >
    </button>
    <div class="group">
      <p>My Library</p>
      <button on:click={addBookHandler}>⊕ Add book</button>
      <button on:click={switchLibraryHandler}>Switch Library</button>
      <a
        href="/setup"
        aria-current={$page.url.pathname === "/setup" ? "page" : undefined}
      >
        Do setup</a
      >
      <a>Configure library</a>
    </div>
    <div class="group">
      <p>My Shelves</p>
      <a href="/" aria-current={$page.url.pathname === "/" ? "page" : undefined}
        >All books</a
      >
    </div>
    <div class="group">
      <p>Devices</p>
      <a href="">Kobo Glo (2015)</a>
    </div>

    <div class="bottom">
      <div>
        <a href=""> ⚙️ Settings </a>
      </div>
    </div>
  </nav>
{:else}
  <div class="floating-open">
    <button class="open" on:click={() => (sidebarOpen = true)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-layout-sidebar-left-expand"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path
          d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z"
        />
        <path d="M9 4v16" />
        <path d="M14 10l2 2l-2 2" />
      </svg>
    </button>
  </div>
{/if}

<style>
  button:has(svg) {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: var(--text-onsecondary);
  }

  button.open:has(svg) {
    color: var(--text-primary);
  }

  .floating-open {
    position: fixed;
    top: 0;
    left: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 0 0 8px 0;
    z-index: 100;
  }

  .group {
    display: flex;
    flex-direction: column;
    border-top: 1px solid #444;
    gap: 8px;
    margin-bottom: 8px;
  }
  .group p {
    margin: 8px 0;
    font-weight: bold;
  }

  nav {
    position: sticky;
    display: flex;
    flex-direction: column;
    top: 0;
    height: 100vh;
    padding: 8px 16px;
    background-color: var(--bg-secondary);
    width: 236px;
    min-width: 236px;
    box-sizing: border-box;
  }
  p,
  a {
    color: var(--text-onsecondary);
  }

  .bottom {
    padding: 8px;
    margin-top: auto;
    transform: translateY(-100%);
  }

  a[aria-current="page"] {
    color: var(--text-brand);
  }
</style>
