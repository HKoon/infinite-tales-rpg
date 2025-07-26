<script lang="ts">
	import { initialThoughtsState, stringifyPretty, type ThoughtsState } from '$lib/util.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';

	const gameActionsState = useLocalStorage('gameActionsState');
	const npcState = useLocalStorage('npcState', {});
	const characterActionsState = useLocalStorage('characterActionsState', {});
	let thoughtsState = useLocalStorage<ThoughtsState>('thoughtsState', initialThoughtsState);
</script>



	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<div class="card bg-base-100/90 shadow-xl backdrop-blur-sm">
			<div class="card-body">
				<h1 class="card-title text-center text-3xl font-bold">Debug State</h1>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">NPC State</p>
	</summary>
	<output style="white-space: pre-wrap">{stringifyPretty(npcState.value)}</output>
</details>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">Action State</p>
	</summary>
	<output style="white-space: pre-wrap">{stringifyPretty(characterActionsState.value)}</output>
</details>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">Game State</p>
	</summary>
	<output style="white-space: pre-wrap"
		>{stringifyPretty(
			gameActionsState.value ? gameActionsState.value[gameActionsState.value.length - 1] : {}
		)}</output
	>
</details>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">Story Thoughts</p>
	</summary>
	<output style="white-space: pre-wrap">{thoughtsState.value.storyThoughts}</output>
</details>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">Action Thoughts</p>
	</summary>
	<output style="white-space: pre-wrap">{thoughtsState.value.actionsThoughts}</output>
</details>

<details class="menu collapse collapse-arrow menu-vertical mt-7 bg-base-200">
	<summary class="collapse-title text-lg font-bold capitalize">
		<p class="text-center">Character Change Thoughts</p>
	</summary>
	<output style="white-space: pre-wrap">{thoughtsState.value.eventThoughts}</output>
</details>

			</div>
		</div>
	</div>
