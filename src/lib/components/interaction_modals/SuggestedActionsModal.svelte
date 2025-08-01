<script lang="ts">
	import { type CharacterStats } from '$lib/ai/agents/characterStatsAgent';
	import { onMount } from 'svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { type CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { LLMMessage } from '$lib/ai/llm';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import { ActionAgent } from '$lib/ai/agents/actionAgent';
	import type {
		Action,
		GameActionState,
		InventoryState,
		ItemWithId,
		ResourcesWithCurrentValue
	} from '$lib/ai/agents/gameAgent';
	import { getTextForActionButton } from '$lib/util.svelte';
	import { isEnoughResource } from '../../../routes/game/gameLogic';
	import LoadingIcon from '$lib/components/LoadingIcon.svelte';
	import type { AIConfig } from '$lib';
	import { createLLMConfig } from '$lib/ai/llmConfigHelper';

	let {
		onclose,
		currentGameActionState,
		resources,
		itemForSuggestActionsState
	}: {
		onclose?;
		currentGameActionState: GameActionState;
		resources: ResourcesWithCurrentValue;
		itemForSuggestActionsState: ItemWithId;
	} = $props();

	const storyState = useLocalStorage<Story>('storyState');
	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const characterStatsState = useLocalStorage<CharacterStats>('characterStatsState');
	const historyMessagesState = useLocalStorage<LLMMessage[]>('historyMessagesState');
	const inventoryState = useLocalStorage<InventoryState>('inventoryState', {});
	const additionalActionInputState = useLocalStorage<string>('additionalActionInputState', '');

	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const temperatureState = useLocalStorage<number>('temperatureState');
	const customSystemInstruction = useLocalStorage<string>('customSystemInstruction');
	const customActionAgentInstruction = useLocalStorage<string>('customActionAgentInstruction');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
	let thoughtsState = $state('');
	let suggestedActions: Array<Action> = $state([]);
	let customActionInput: string = $state('');

	let isGeneratingState = $state(false);
	let actionAgent: ActionAgent;

	onMount(async () => {
		const llmConfig = createLLMConfig(
			aiConfigState.value || { disableAudioState: false, disableImagesState: false, useFallbackLlmState: false, selectedProvider: 'gemini' },
			apiKeyState.value || '',
			aiLanguage.value || '',
			temperatureState.value || 1
		);
		
		const llm = LLMProvider.provideLLM(llmConfig, aiConfigState.value?.useFallbackLlmState);
		actionAgent = new ActionAgent(llm);

		isGeneratingState = true;
		const { thoughts, actions } = await actionAgent.generateActionsForItem(
			itemForSuggestActionsState,
			currentGameActionState,
			historyMessagesState.value,
			storyState.value,
			characterState.value,
			characterStatsState.value,
			inventoryState.value,
			currentGameActionState.is_character_restrained_explanation,
			customSystemInstruction.value,
			customActionAgentInstruction.value,
			true,
			additionalActionInputState.value
		);
		console.log('suggestedActions', actions);
		thoughtsState = thoughts;
		suggestedActions = actions;
		isGeneratingState = false;
	});
</script>

<dialog open class="z-100 modal" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box flex flex-col items-center text-center">
		<span class="m-auto font-bold">Suggested Actions</span>
		<button onclick={() => onclose()} class="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
			>✕</button
		>
		{#if isGeneratingState}
			<div class="mt-2 flex flex-col">
				<span class="m-auto">Generating actions...</span>
				<div class="m-auto">
					<LoadingIcon />
				</div>
			</div>
		{:else}
			<details
				class="collapse collapse-arrow textarea-bordered mt-4 overflow-y-scroll border bg-base-200"
			>
				<summary class="collapse-title capitalize">
					<p>Thoughts</p>
				</summary>
				<p>{thoughtsState}</p>
			</details>
			{#each suggestedActions as action}
				<button
					type="button"
					disabled={!isEnoughResource(action, resources, inventoryState.value)}
					class="components btn btn-neutral no-animation mt-2 w-full"
					onclick={() => onclose(action)}
				>
					{getTextForActionButton(action)}
				</button>
			{/each}
		{/if}
		<div class="mt-4 w-full lg:join">
			<input
				type="text"
				bind:value={customActionInput}
				class="input input-bordered w-full"
				id="user-input"
				placeholder="Custom action for item"
			/>
			<button
				type="submit"
				onclick={() =>
					onclose({
						characterName: characterState.value.name,
						text: 'Use item ' + itemForSuggestActionsState.item_id + ' - ' + customActionInput,
						is_custom_action: true
					})}
				class="btn btn-neutral w-full lg:w-1/4"
				id="submit-button"
				>Submit
			</button>
		</div>
	</div>
</dialog>
