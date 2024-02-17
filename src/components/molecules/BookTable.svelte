<script lang="ts">
	import { List } from "svelte-virtual";
	import type { LibraryBook } from "../../bindings";
	import BookTableRow from "../atoms/BookTableRow.svelte";
	import { writable, type Writable } from "svelte/store";
	import { onMount } from "svelte";

	export let bookList: LibraryBook[];

	const scrollableDivHeight: Writable<string> = writable("80vh");
	const itemHeightPx = 220;

	onMount(() => {
		const listContainerDiv = document.getElementById("list-container");

		if (listContainerDiv) {
			const containerTop = listContainerDiv.getBoundingClientRect().top;
			scrollableDivHeight.set(`calc(100vh - ${containerTop}px)`);
		}

		window.addEventListener("resize", () => {
			if (!listContainerDiv) return;
			const coverViewTop = listContainerDiv.getBoundingClientRect().top;
			scrollableDivHeight.set(`calc(100vh - ${coverViewTop}px)`);
		});
	});
</script>

<div class="book header">
	<p class="cover">Cover</p>
	<p class="title">Title</p>
	<p class="title">Authors</p>
</div>
<div id="list-container">
	<List
		itemCount={bookList.length}
		itemSize={itemHeightPx}
		height={$scrollableDivHeight}
	>
		<div slot="item" let:index let:style {style}>
			<BookTableRow book={bookList[index]} />
		</div>
	</List>
</div>

<style>
	.book {
		display: grid;
		grid-template-columns: 0.3fr 1fr 0.5fr;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 16px;
		grid-template-areas: "cover title authors";
	}
	.header {
		border-bottom: 2px solid rgba(0, 0, 0, 0.05);
	}
</style>
