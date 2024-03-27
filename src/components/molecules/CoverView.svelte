<script lang="ts">
	import VirtualRowList from "$lib/components/ui/virtual-list/VirtualRowList.svelte";
	import { writable, type Writable } from "svelte/store";
	import type { LibraryBook } from "../../bindings";
	import BookAsCover from "../atoms/BookAsCover.svelte";
	import { onMount } from "svelte";

	export let bookList: LibraryBook[];
	export let dragHandler: (event: DragEvent, book: LibraryBook) => void;
	export let editHandler: (book: LibraryBook) => void;

	let selectedItemId = writable<LibraryBook["id"] | undefined>(undefined);
	const itemHeight = 320;
	const itemMarginTotal = 40;
	const totalHeight = itemHeight + itemMarginTotal;

	let scrollableDivHeight: Writable<string> = writable("80vh");

	let groupSize = writable(5);

	onMount(() => {
		groupSize.set(window.innerWidth < 1200 ? 4 : 6);
		window.addEventListener("resize", () => {
			groupSize.set(window.innerWidth < 1200 ? 4 : 6);
		});

		const coverViewDiv = document.getElementById("cover-view");

		if (coverViewDiv) {
			const coverViewTop = coverViewDiv.getBoundingClientRect().top;
			scrollableDivHeight.set(`calc(100vh - ${coverViewTop}px)`);
		}

		window.addEventListener("resize", () => {
			if (!coverViewDiv) return;
			const coverViewTop = coverViewDiv.getBoundingClientRect().top;
			scrollableDivHeight.set(`calc(100vh - ${coverViewTop}px)`);
		});
	});

	const renderFn = (bookListIndex: number) => ({
		component: BookAsCover,
		props: {
			book: bookList[bookListIndex],
			dragHandler,
			selectedItemId,
			onEditHandler: (book: LibraryBook) => {
				editHandler(book);
			},
			onClickHandler: (e: MouseEvent) => {
				e.stopPropagation();
				selectedItemId.set(bookList[bookListIndex].id);
			},
		},
	});
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="cover-view" on:click={() => selectedItemId.set(undefined)} role="list">
	<VirtualRowList
		scrollableDivHeight={$scrollableDivHeight}
		items={bookList.map((_, index) => index)}
		{groupSize}
		groupHeight={totalHeight}
		{renderFn}
	/>
</div>
