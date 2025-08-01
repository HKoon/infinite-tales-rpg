<script lang="ts">
	import { onMount } from 'svelte';
	import {
		initialStoryState,
		type Story,
		StoryAgent,
		storyStateForPrompt
	} from '$lib/ai/agents/storyAgent';
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { getRowsForTextarea, navigate, loadPDF } from '$lib/util.svelte';
	import isEqual from 'lodash.isequal';
	import { goto } from '$app/navigation';
	import ImportExportSaveGame from '$lib/components/ImportExportSaveGame.svelte';
	import { type CharacterDescription, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import type { AIConfig } from '$lib';
	import { createLLMConfig } from '$lib/ai/llmConfigHelper';
	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const temperatureState = useLocalStorage<number>('temperatureState', 1);
	let storyAgent: StoryAgent;

	const storyState = useLocalStorage<Story>('storyState', { ...initialStoryState });
	const textAreaRowsDerived = $derived(getRowsForTextarea(storyState.value));
	let storyStateOverwrites = $state({});
	const characterState = useLocalStorage<CharacterDescription>('characterState', {
		...initialCharacterState
	});
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	onMount(() => {
		const llmConfig = createLLMConfig(
			aiConfigState.value || { disableAudioState: false, disableImagesState: false, useFallbackLlmState: false, selectedProvider: 'gemini' },
			apiKeyState.value || '',
			aiLanguage.value || '',
			temperatureState.value
		);
		
		storyAgent = new StoryAgent(
			LLMProvider.provideLLM(llmConfig, aiConfigState.value?.useFallbackLlmState)
		);
	});

	function getCharacterDescription() {
		let characterDescription = $state.snapshot(characterState.value);
		if (isEqual(characterDescription, initialCharacterState)) {
			return undefined;
		}
		return characterDescription;
	}

	const onRandomize = async () => {
		isGeneratingState = true;

		const newState = await storyAgent.generateRandomStorySettings(
			storyStateOverwrites,
			getCharacterDescription()
		);
		if (newState) {
			storyState.value = newState;
		}
		isGeneratingState = false;
	};
	const onRandomizeSingle = async (stateValue) => {
		isGeneratingState = true;
		const currentStory = { ...storyState.value };
		currentStory[stateValue] = undefined;
		const agentInput = { ...currentStory, ...storyStateOverwrites };
		const newState = await storyAgent.generateRandomStorySettings(
			agentInput,
			getCharacterDescription()
		);
		if (newState) {
			storyState.value[stateValue] = newState[stateValue];
		}
		isGeneratingState = false;
	};

	function handleInput(evt, stateValue) {
		storyStateOverwrites[stateValue] = evt.target.value;
	}

	function onUploadClicked() {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'application/pdf';
		fileInput.click();
		fileInput.addEventListener('change', function (event) {
			// @ts-expect-error can never be null
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = async () => {
					const text = await loadPDF(file);
					storyStateOverwrites = { ...storyStateOverwrites, gameBook: text };
					await onRandomize();
				};
				reader.readAsArrayBuffer(file);
			}
		});
	}
</script>

{#if isGeneratingState}
	<LoadingModal />
{/if}

<div class="min-h-screen">
	<div class="container mx-auto px-4 py-8">
		<ul class="steps mt-3 w-full">
			<li class="step step-primary">Tale</li>
			<!--TODO  -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- svelte-ignore a11y_click_events_have_key_events  -->
			<li class="step cursor-pointer" onclick={() => goto('character')}>Character</li>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
			<!-- svelte-ignore a11y_click_events_have_key_events  -->
			<li class="step cursor-pointer" onclick={() => goto('characterStats')}>Stats</li>
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
			<!-- svelte-ignore a11y_click_events_have_key_events  -->
			<li class="step cursor-pointer" onclick={() => goto('character')}>Start</li>
		</ul>
		<form class="m-6 grid items-center gap-2 text-center">
			<p class="text-white">Quickstart: Click on Randomize All to generate a random Tale.</p>
			<p class="text-white">You can also customize any setting and play the Tale suited to your liking.</p>
			<p class="text-white">The custom settings will be considered for the Randomize feature.</p>
			<p class="text-white">You can even create the Character first and the Tale after.</p>
			<p class="text-white">
				Example: Enter 'Call of Cthulhu' as Game and click Randomize All. A random Cthulhu Tale will be
				generated.
			</p>
			<button
				class="btn btn-accent m-auto mt-3 w-3/4 sm:w-1/2"
				disabled={isGeneratingState}
				onclick={onRandomize}
			>
				Randomize All
			</button>
			<button
				type="button"
				class="btn btn-neutral m-auto w-3/4 sm:w-1/2"
				onclick={onUploadClicked}
				disabled={isGeneratingState}
			>
				Generate Tale from PDF
			</button>
			<button
				class="btn btn-neutral m-auto w-3/4 sm:w-1/2"
				onclick={() => {
					storyState.reset();
					storyStateOverwrites = {};
				}}
			>
				Clear All
			</button>
			<ImportExportSaveGame isSaveGame={false}>
				{#snippet exportButton(onclick)}
					<button {onclick} class="btn btn-neutral m-auto w-3/4 sm:w-1/2"> Export Settings </button>
				{/snippet}
				{#snippet importButton(onclick)}
					<button {onclick} class="btn btn-neutral m-auto w-3/4 sm:w-1/2"> Import Settings </button>
				{/snippet}
			</ImportExportSaveGame>
			<button
				class="btn btn-primary m-auto w-3/4 sm:w-1/2"
				onclick={() => {
					navigate('/new/character');
				}}
			>
				Next Step:<br /> Customize Character
			</button>
			{#if storyState.value}
				{#each Object.keys(storyStateForPrompt) as stateValue}
					<label class="form-control mt-3 w-full">
						<div class=" flex-row capitalize text-white">
							{stateValue.replaceAll('_', ' ')}
							{#if storyStateOverwrites[stateValue]}
								<span class="badge badge-accent ml-2">overwritten</span>
							{/if}
						</div>

						<textarea
							bind:value={storyState.value[stateValue]}
							rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
							oninput={(evt) => handleInput(evt, stateValue)}
							placeholder={storyStateForPrompt[stateValue]}
							class="textarea textarea-bordered textarea-md mt-2 w-full bg-black/60 text-white placeholder-gray-400"
						></textarea>
					</label>
					<button
						class="btn btn-accent m-auto mt-2 w-3/4 capitalize sm:w-1/2"
						onclick={() => {
							onRandomizeSingle(stateValue);
						}}
					>
						Randomize {stateValue.replaceAll('_', ' ')}
					</button>
					<button
						class="btn btn-neutral m-auto mt-2 w-3/4 capitalize sm:w-1/2"
						onclick={() => {
							storyState.resetProperty(stateValue);
							delete storyStateOverwrites[stateValue];
						}}
					>
						Clear {stateValue.replaceAll('_', ' ')}
					</button>
				{/each}
				<button
					class="btn btn-primary m-auto mt-2 w-3/4 sm:w-1/2"
					onclick={() => {
						navigate('/new/character');
					}}
				>
					Next Step:<br /> Customize Character
				</button>
			{/if}
		</form>
	</div>
</div>
