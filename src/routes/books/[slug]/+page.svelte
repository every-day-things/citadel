<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { onMount } from "svelte";
	import { libraryClient } from "../../../stores/library";
	import type { PageData } from "./$types";
	import type { LibraryBook, LibraryAuthor } from "../../../bindings";
	import { writable } from "svelte/store";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Button } from "$lib/components/ui/button";
	import {
		createDialog,
		createCombobox,
		melt,
		type ComboboxOptionProps,
	} from "@melt-ui/svelte";
	import CheckIcon from "virtual:icons/f7/checkmark-alt";
	import ChevronUpIcon from "virtual:icons/f7/chevron-down";
	import ChevronDownIcon from "virtual:icons/f7/chevron-up";
	import { Input } from "$lib/components/ui/input";
	import TextInput from "$lib/components/forms/TextInput.svelte";
	import Row from "$lib/components/forms/Row.svelte";
	import Pill from "./Pill.svelte";

	export let dialogOpen = writable(true);

	const {
		elements: { portalled, overlay, content, description, title, close },
		states: { open },
	} = createDialog();

	$: open.set($dialogOpen);
	$: if (!$open) dialogOpen.set(false);

	let authors: LibraryAuthor[] = [
		{
			id: "awk",
			name: "Author 1",
			sortable_name: "Author 1",
		},
		{
			id: "qz",
			name: "Author 2",
			sortable_name: "Author 2",
		},
		{
			id: "9",
			name: "Author 3",
			sortable_name: "Author 3",
		},
	];

	const toOption = (
		author: LibraryAuthor,
	): ComboboxOptionProps<LibraryAuthor> => ({
		value: author,
		label: author.name,
		disabled: false,
	});

	const {
		elements: { menu, input, option, label },
		states: { open: comboOpen, inputValue, touchedInput, selected },
		helpers: { isSelected },
	} = createCombobox<LibraryAuthor, true>({
		forceVisible: true,
		multiple: true,
		positioning: {
			placement: "right",
			strategy: "absolute",
		},
	});

	$: if ($selected) {
		$inputValue = "";
	}

	$: filteredAuthors = $touchedInput
		? authors.filter(({ id, name }) => {
				const normalizedInput = $inputValue.toLowerCase();
				return (
					id.toLowerCase().includes(normalizedInput) ||
					name.toLowerCase().includes(normalizedInput)
				);
			})
		: authors;

	export let data: PageData;
	let book: LibraryBook;
	let pageTitle: string;

	$: pageTitle = `"${book?.title}" by ${book?.author_list
		.map((item) => item.name)
		.join(", ")}`;

	let metadata = writable<LibraryBook>({} as LibraryBook);

	const getBookMatchingId = async (
		id: LibraryBook["id"],
	): Promise<LibraryBook> => {
		return (await libraryClient().listBooks()).filter(
			(book) => book.id.toString() === id,
		)[0];
	};

	const fetchBookAndAuthors = async (id: string) => {
		book = await getBookMatchingId(id);
		authors = (await libraryClient().listAuthors()).toSorted((a, b) =>
			a.sortable_name.localeCompare(b.sortable_name),
		);
		metadata.set(book);
		selected.set(book.author_list.map(toOption));
		console.log({ authors });
	};

	onMount(async () => {
		await fetchBookAndAuthors(data.id);
	});

	const save = async (event: SubmitEvent) => {
		event.preventDefault();
		console.log("saving");
		const formData = new FormData(event.currentTarget as HTMLFormElement);

		libraryClient().updateBook(book!.id.toString(), {
			title: (formData.get("title") as string | undefined) ?? book.title ?? "",
			author_id_list: $selected?.map((author) => author.value.id) ?? [],
			publication_date: null,
			timestamp: null,
		});
		invalidateAll();
		fetchBookAndAuthors(data.id);
	};
</script>

<div class="safeAreaView">
	<button on:click={() => dialogOpen.update((current) => !current)}>
		{$dialogOpen ? "close" : "open"}
	</button>
	<Dialog.Portal {portalled}>
		<Dialog.Content bind:open={dialogOpen} {overlay} {content} {close}>
			<Dialog.Header>
				<Dialog.Title {title}>Editing book info – {pageTitle}</Dialog.Title>
			</Dialog.Header>
			<form on:submit={save} class="h-fit">
				<div class="flex flex-row w-full gap-4 h-full">
					<div class="flex">
						<div class="flex flex-col gap-10">
							<div class="flex flex-col h-1/2">
								<h2 class="text-xl font-semibold">Cover</h2>
								img controls
							</div>
							<div class="flex flex-col h-1/2">
								<h2 class="text-xl font-semibold">Formats</h2>
								format list & controls
							</div>
						</div>
					</div>
					<div class="flex flex-col w-full">
						<div class="flex flex-row justify-between mb-4">
							<h2 class="text-xl font-semibold">Book info</h2>
							<Button variant="secondary">Download metadata</Button>
						</div>
						<!-- BOOK TITLE ROW -->
						<Row>
							<TextInput
								label="Title"
								value={book?.title}
								id="title"
								name="title"
							/>
							<!-- <Button>Auto →</Button> -->
							<TextInput
								isDisabled
								label="Sort title"
								value={book?.sortable_title || ""}
								id="sortable_title"
								name="sortable_title"
								additionalInfo="Sort fields are set automatically."
							/>
						</Row>

						<!-- AUTHOR ROW -->
						<Row>
							<!-- svelte-ignore a11y-label-has-associated-control - $label contains the 'for' attribute -->
							<div class="flex flex-col w-full">
								<label use:melt={$label}>
									<span class="text-sm font-medium">Author(s)</span>
								</label>
								<div class="flex flex-row space-between w-full gap-8">
									<div class="flex flex-row input-bg">
										{#if $selected}
											{#each $selected as author}
												<Pill
													label={author.value.name}
													onRemove={() => {
														if ($selected === undefined) return;
														$selected = $selected.filter(
															(a) => a.value.id !== author.value.id,
														);
													}}
												/>
											{/each}
										{/if}
									</div>

									<div class="relative w-min">
										<input
											use:melt={$input}
											class="flex h-10 items-center justify-between rounded-lg bg-white
                px-3 pr-12 text-black"
											placeholder="Author name..."
										/>
										<div
											class="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-slate-900"
										>
											{#if $comboOpen}
												<ChevronUpIcon class="square-4" />
											{:else}
												<ChevronDownIcon class="square-4" />
											{/if}
										</div>
									</div>
								</div>
							</div>
							{#if $comboOpen}
								<ul
									class="z-10 flex max-h-[300px] flex-col overflow-hidden rounded-lg bg-white shadow-md text-black"
									use:melt={$menu}
								>
									<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
									<div
										class="flex max-h-fit flex-col gap-0 overflow-y-auto bg-white px-2 py-2 text-black"
										tabindex="0"
									>
										{#each filteredAuthors as author, index (index)}
											<li
												use:melt={$option(toOption(author))}
												class="relative cursor-pointer scroll-my-2 rounded-md py-2 pl-4 pr-4
                border-b border-slate-100 hover:bg-slate-100
              hover:bg-slate-100
              data-[highlighted]:bg-slate-200 data-[highlighted]:text-slate-900
                data-[disabled]:opacity-50"
											>
												{#if $isSelected(author)}
													<div
														class="check absolute left-2 top-1/2 z-10 text-slate-900"
													>
														<CheckIcon class="square-4" style="color: green;" />
													</div>
												{/if}
												<div class="pl-4">
													<span class="font-medium">{author.name}</span>
												</div>
											</li>
										{:else}
											<li
												class="relative cursor-pointer rounded-md py-1 pl-8 pr-4"
											>
												No results found
											</li>
										{/each}
									</div>
								</ul>
							{/if}
						</Row>

						<!-- SERIES & SERIES NUMBER ROW -->
						<Row>
							<TextInput
								label="Series"
								value={"Unsupported"}
								id="series"
								name="series"
							/>
							<TextInput
								label="Series number"
								value={"1"}
								id="series_number"
								name="series_num"
							/>
						</Row>

						<!-- TAGS ROW -->
						<Row>
							<div class="flex flex-row gap-6 items-center w-1/2">
								<div class="flex flex-col w-full flex-1">
									<!-- svelte-ignore a11y-label-has-associated-control -->
									<label>
										<span use:melt={$label} class="text-sm font-medium"
											>Tags</span
										>
									</label>
									<div class="flex flex-row w-full input-bg">
										<div class="flex flex-row space-between w-full gap-8">
											<Pill label="hate crimes r bad" onRemove={() => {}} />
										</div>
									</div>
								</div>
							</div>
							<Button variant="secondary">Manage tags</Button>
						</Row>

						<!-- IDENTIFIERS & LANGUAGES ROW-->
						<div class="flex flex-row gap-6 items-center">
							<p>Identifiers</p>
							<p>Languages</p>
						</div>

						<!-- PUBLISHER & PUBLISH DATE ROW-->
						<div class="flex flex-row gap-6 items-center">
							<p>Publisher</p>
							<p>Publish date</p>
						</div>
						<!-- HTML DESCRIPTION ROW-->
						<div class="flex flex-row gap-6 items-center">
							<p>description</p>
						</div>
					</div>
				</div>
				<Dialog.Footer>
					<Button variant="secondary" on:click={() => dialogOpen.set(false)}
						>Cancel</Button
					>
					<Button type="submit">Save</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
	{#if window.__TAURI__}
		<button on:click={() => history.back()}>X</button>
		<h1>Editing {pageTitle}</h1>

		<form on:submit={save} class="flex flex-col">
			<fieldset>
				<label for="title">Title</label>
				<input type="text" id="title" name="title" value={book?.title} />

				<label for="sortable_title">Sort title</label>
				<input
					disabled
					type="text"
					id="sortable_title"
					name="sortable_title"
					value={book?.sortable_title}
				/>
				<span class="text-label-small">Sort fields are set automatically.</span>
			</fieldset>

			<button type="submit">Save</button>
		</form>
	{:else}
		<p>
			You cannot edit book metadata outside of the Citadel desktop app. For now!
		</p>

		<Button><a href="/">go home</a></Button>
	{/if}
</div>

<style>
	.check {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		translate: 0 calc(-50% + 1px);
	}

	h1 {
		font-size: 1rem;
	}
	.safeAreaView {
		margin-top: 48px;
		height: 100vh;
	}

	.text-label-small {
		font-size: 0.8rem;
		font-style: italic;
		margin-top: 4px;
		margin-left: 4px;
		min-height: 1.18rem;
	}

	.input-bg {
		display: flex;
		height: 2.25rem;
		width: 100%;
		border-radius: 0.375rem;
		border: 1px solid var(--bg-secondary);
		background-color: var(--bg-tertiary);
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
		transition:
			color 0.2s ease-in-out,
			background-color 0.2s ease-in-out,
			border-color 0.2s ease-in-out;
	}
</style>
