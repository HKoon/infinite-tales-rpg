<script lang="ts">
	import type { Action } from '$lib/ai/agents/gameAgent';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { isEnoughResource } from '../../../routes/game/gameLogic';
	import type { InventoryState } from '$lib/ai/agents/gameAgent';

	let {
		actions = [],
		playerResources = {},
		inventoryState = {},
		isCharacterInCombat = false,
		customActionReceiver = 'Character Action',
		onActionSelected,
		onCustomActionSubmitted,
		onclose
	}: {
		actions: Action[];
		playerResources: any;
		inventoryState: InventoryState;
		isCharacterInCombat?: boolean;
		customActionReceiver: string;
		onActionSelected: (action: Action) => void;
		onCustomActionSubmitted: (text: string) => void;
		onclose: () => void;
	} = $props();

	let customActionInput = $state('');
	let selectedReceiver = $state(customActionReceiver);

	const handleActionClick = (action: Action) => {
		onActionSelected(action);
		onclose();
	};

	const handleCustomActionSubmit = () => {
		if (customActionInput.trim()) {
			onCustomActionSubmitted(customActionInput.trim());
			onclose();
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			onclose();
		} else if (event.key === 'Enter' && event.target === customActionInput) {
			handleCustomActionSubmit();
		}
	};
</script>

<svelte:window on:keydown={handleKeydown} />

<dialog class="modal" open style="background: rgba(0, 0, 0, 0.5);">
	<div class="modal-box max-w-4xl w-full max-h-[80vh] overflow-y-auto">
		<h3 class="font-bold text-lg mb-4 font-jaro">Choose Your Action</h3>
		
		<!-- AI Generated Actions -->
		{#if actions.length > 0}
			<div class="mb-6">
				<h4 class="font-semibold mb-3 text-base-content/80">Available Actions:</h4>
				<div class="space-y-2">
					{#each actions as action}
						<button
							class="btn btn-neutral w-full text-left justify-start"
							class:btn-disabled={!isEnoughResource(action, playerResources, inventoryState)}
							onclick={() => handleActionClick(action)}
						>
							{getTextForActionButton(action)}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mb-6">
				<div class="flex flex-col items-center py-4">
					<span class="text-base-content/60 mb-2">Generating actions...</span>
					<span class="loading loading-dots loading-md"></span>
				</div>
			</div>
		{/if}

		<!-- Custom Action Input -->
		<div class="border-t pt-4">
			<h4 class="font-semibold mb-3 text-base-content/80">Custom Action:</h4>
			<div class="space-y-3">
				<select bind:value={selectedReceiver} class="select select-bordered w-full">
					<option value="Character Action">Character Action</option>
					<option value="Game Command">Game Command</option>
					<option value="GM Question">GM Question</option>
					<option value="Dice Roll">Dice Roll</option>
				</select>
				
				<div class="join w-full">
					<input
						type="text"
						bind:value={customActionInput}
						class="input input-bordered join-item flex-1"
						placeholder={selectedReceiver === 'Character Action'
							? 'What do you want to do?'
							: selectedReceiver === 'GM Question'
								? 'Message to the Game Master'
								: selectedReceiver === 'Dice Roll'
									? 'notation like 1d20, 2d6+3'
									: 'Command without restrictions'}
					/>
					<button
						class="btn btn-neutral join-item"
						onclick={handleCustomActionSubmit}
						disabled={!customActionInput.trim()}
					>
						Submit
					</button>
				</div>
			</div>
		</div>

		<!-- Close Button -->
		<div class="modal-action">
			<button class="btn btn-ghost" onclick={onclose}>Cancel</button>
		</div>
	</div>
</dialog>

<style>
	.btn {
		height: auto;
		padding: 1rem;
		font-family: 'Noto Sans', sans-serif;
	}
	
	.btn.btn-neutral {
		font-family: 'Noto Sans', sans-serif;
	}
	
	h3, h4 {
		font-family: 'Jaro', sans-serif;
	}
</style>