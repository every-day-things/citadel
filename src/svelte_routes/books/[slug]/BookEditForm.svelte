<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import Row from "$lib/components/forms/Row.svelte";
	import TextInput from "$lib/components/forms/TextInput.svelte";
	import { Button } from "$lib/components/ui/button";
	import { createCombobox, melt } from "@melt-ui/svelte";
	import CheckIcon from "virtual:icons/f7/checkmark-alt";
	import ChevronUpIcon from "virtual:icons/f7/chevron-down";
	import ChevronDownIcon from "virtual:icons/f7/chevron-up";
	import type { LibraryAuthor, LibraryBook } from "../../../bindings";
	import Pill from "./Pill.svelte";
	import { onMount } from "svelte";
	import { libraryClient } from "../../../stores/library";
	import { writable } from "svelte/store";
	import { filterAuthorsByTerm, toComboboxOption } from "./BookEditForm";

	export let book: LibraryBook;
	export let onClose: () => void;
	let metadata = writable<LibraryBook>({} as LibraryBook);
	let authors: LibraryAuthor[] = [];

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
		? filterAuthorsByTerm(authors, $inputValue)
		: authors;

	const save = async (event: SubmitEvent) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget as HTMLFormElement);

		await libraryClient().updateBook(book!.id.toString(), {
			title: (formData.get("title") as string | undefined) ?? book.title ?? "",
			author_id_list: $selected?.map((author) => author.value.id) ?? [],
			publication_date: null,
			timestamp: null,
		});
		invalidateAll();
		fetchBookAndAuthors();
	};

	const fetchBookAndAuthors = async () => {
		authors = (await libraryClient().listAuthors()).toSorted((a, b) =>
			a.sortable_name.localeCompare(b.sortable_name),
		);
		metadata.set(book);
		selected.set(book.author_list.map(toComboboxOption));
	};

	onMount(async () => {
		await fetchBookAndAuthors();
	});
</script>

{#if window.__TAURI__}
	<form on:submit={save} class="h-fit">
		<div class="flex flex-row w-full gap-4 h-full">
			<div class="flex flex-col w-full">
				<div class="flex flex-row justify-between mb-4">
					<h2 class="text-xl font-semibold">Book info</h2>
				</div>
				<Row>
					<TextInput
						label="Title"
						value={$metadata?.title}
						id="title"
						name="title"
					/>
					<TextInput
						isDisabled
						label="Sort title"
						value={$metadata?.sortable_title || ""}
						id="sortable_title"
						name="sortable_title"
						additionalInfo="Sort fields are set automatically."
					/>
				</Row>

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
										use:melt={$option(toComboboxOption(author))}
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
									<li class="relative cursor-pointer rounded-md py-1 pl-8 pr-4">
										No results found
									</li>
								{/each}
							</div>
						</ul>
					{/if}
				</Row>
			</div>
		</div>
		<Button variant="secondary" on:click={onClose}>Cancel</Button>
		<Button type="submit">Save</Button>
	</form>
{:else}
	<p>
		You cannot edit book metadata outside of the Citadel desktop app. For now!
	</p>
	<Button><a href="/">go home</a></Button>
{/if}

<style>
	.check {
		position: absolute;
		left: 0.5rem;
		top: 50%;
		translate: 0 calc(-50% + 1px);
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
