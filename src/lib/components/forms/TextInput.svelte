<script lang="ts">
	import type { Writable } from "svelte/store";
	import { Input } from "../ui/input";

	export let label: string;
	export let value: string;
	export let name: string;
	export let id: string;
	export let isDisabled: boolean = false;
	export let additionalInfo: string = "";
</script>

<div class="flex flex-col flex-1">
	<label for={id}>{label}</label>
	<Input type="text" disabled={isDisabled} {value} {id} {name} />
	<span class="text-label-small">{additionalInfo}</span>
</div>

<style>
	.text-label-small {
		font-size: 0.8rem;
		font-style: italic;
		margin-top: 4px;
		margin-left: 4px;
		min-height: 1.18rem;
	}
</style>
