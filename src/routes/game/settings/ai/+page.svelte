<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { handleError, navigate, parseState } from '$lib/util.svelte';
	import { CharacterAgent, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import { initialStoryState, type Story, StoryAgent } from '$lib/ai/agents/storyAgent';
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import { goto } from '$app/navigation';
	import {
		CharacterStatsAgent,
		initialCharacterStatsState
	} from '$lib/ai/agents/characterStatsAgent';
	import { initialCampaignState } from '$lib/ai/agents/campaignAgent';
	import { onMount } from 'svelte';
	import type { AIConfig } from '$lib';
	import type { RelatedStoryHistory } from '$lib/ai/agents/summaryAgent';
	import QuickstartStoryGenerationModal from '$lib/components/interaction_modals/QuickstartStoryGenerationModal.svelte';
	import type { LLM } from '$lib/ai/llm';
	import isPlainObject from 'lodash.isplainobject';
	import {
		initialCharacterTransformState,
		initialEventEvaluationState
	} from '$lib/ai/agents/eventAgent';
	import type { CharacterChangedInto, EventEvaluation } from '$lib/ai/agents/eventAgent';
	import type { PlayerCharactersIdToNamesMap } from '$lib/ai/agents/gameAgent';
	import AiGenerationSettings from '$lib/components/interaction_modals/settings/AiGenerationSettings.svelte';
	import OutputFeaturesModal from '$lib/components/interaction_modals/settings/OutputFeaturesModal.svelte';
	import SystemPromptsModal from '$lib/components/interaction_modals/settings/SystemPromptsModal.svelte';
	import AgentModelSettings from '$lib/components/interaction_modals/settings/AgentModelSettings.svelte';
	import backgroundSvg from '$lib/assets/bckg.svg';
	import logoSvg from '$lib/assets/rollrole.svg';

	let showSettings = $state(false);

	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	const temperatureState = useLocalStorage<number>('temperatureState', 1);
	//TODO migrate all AI settings into this object to avoid too many vars in local storage
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState', {
		disableAudioState: true,
		disableImagesState: false,
		useFallbackLlmState: false,
		selectedProvider: 'gemini'
	});
	let showGenerationSettingsModal = $state<boolean>(false);
	let showOutputFeaturesModal = $state<boolean>(false);
	let showSystemPromptsModal = $state<boolean>(false);
	let showAgentModelSettingsModal = $state<boolean>(false);

	const gameActionsState = useLocalStorage('gameActionsState', []);
	const historyMessagesState = useLocalStorage('historyMessagesState', []);
	const characterState = useLocalStorage('characterState', initialCharacterState);
	const inventoryState = useLocalStorage('inventoryState', {});
	const characterImageState = useLocalStorage('characterImageState');
	const characterStatsState = useLocalStorage('characterStatsState', initialCharacterStatsState);
	const npcState = useLocalStorage('npcState', []);
	const storyState = useLocalStorage('storyState', initialStoryState);
	const isGameEnded = useLocalStorage('isGameEnded', false);
	const rollDifferenceHistoryState = useLocalStorage('rollDifferenceHistoryState', []);
	const campaignState = useLocalStorage('campaignState', initialCampaignState);
	const currentChapterState = useLocalStorage('currentChapterState');
	const characterActionsState = useLocalStorage('characterActionsState');
	const levelUpState = useLocalStorage('levelUpState');
	const customMemoriesState = useLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useLocalStorage<string>('customGMNotesState');
	const skillsProgressionState = useLocalStorage('skillsProgressionState', {});
	const characterTransformState = useLocalStorage<CharacterChangedInto>(
		'characterTransformState',
		initialCharacterTransformState
	);

	const relatedStoryHistoryState = useLocalStorage<RelatedStoryHistory>(
		'relatedStoryHistoryState',
		{ relatedDetails: [] }
	);
	const relatedActionHistoryState = useLocalStorage<string[]>('relatedActionHistoryState', []);
	const eventEvaluationState = useLocalStorage<EventEvaluation>(
		'eventEvaluationState',
		initialEventEvaluationState
	);
	const playerCharactersIdToNamesMapState = useLocalStorage<PlayerCharactersIdToNamesMap>(
		'playerCharactersIdToNamesMapState',
		{}
	);

	let isGeneratingState = $state(false);
	let quickstartModalOpen = $state(false);
	let llm: LLM;
	let storyAgent: StoryAgent | undefined = $state();

	onMount(async () => {
		if (apiKeyState.value) {
			provideLLM();
		}
	});

	const provideLLM = () => {
		const provider = aiConfigState.value?.selectedProvider || 'gemini';
		let config: any = {
			temperature: temperatureState.value,
			language: aiLanguage.value,
			provider: provider
		};

		if (provider === 'openai') {
			config.apiKey = aiConfigState.value?.openaiApiKey;
			config.baseUrl = aiConfigState.value?.openaiBaseUrl || 'https://api.openai.com/v1';
			config.model = aiConfigState.value?.openaiModel || 'gpt-4o';
		} else {
			config.apiKey = apiKeyState.value;
		}

		llm = LLMProvider.provideLLM(config, aiConfigState.value?.useFallbackLlmState);
		storyAgent = new StoryAgent(llm);
	};

	const onQuickstartClicked = () => {
		const provider = aiConfigState.value?.selectedProvider || 'gemini';
		const hasApiKey = provider === 'openai' 
			? aiConfigState.value?.openaiApiKey 
			: apiKeyState.value;
		
		if (hasApiKey) {
			provideLLM();
			quickstartModalOpen = true;
		}
	};

	function clearStates() {
		historyMessagesState.reset();
		gameActionsState.reset();
		characterState.reset();
		characterImageState.reset();
		characterStatsState.reset();
		storyState.reset();
		isGameEnded.reset();
		rollDifferenceHistoryState.reset();
		npcState.reset();
		inventoryState.reset();
		campaignState.reset();
		currentChapterState.reset();
		characterActionsState.reset();
		levelUpState.reset();
		relatedStoryHistoryState.reset();
		relatedActionHistoryState.reset();
		customMemoriesState.reset();
		customGMNotesState.reset();
		characterTransformState.reset();
		skillsProgressionState.reset();
		eventEvaluationState.reset();
		playerCharactersIdToNamesMapState.reset();
	}

	async function onQuickstartNew(story: string | Story | undefined) {
		clearStates();
		isGeneratingState = true;
		let newStoryState;
		try {
			if (story && isPlainObject(story)) {
				newStoryState = story as Story;
			} else {
				const overwriteStory = !story ? {} : { adventure_and_main_event: story as string };
				newStoryState = await storyAgent!.generateRandomStorySettings(overwriteStory);
			}
			if (newStoryState) {
				storyState.value = newStoryState;
				const characterAgent = new CharacterAgent(llm);
				const newCharacterState = await characterAgent.generateCharacterDescription(
					$state.snapshot(storyState.value)
				);
				if (newCharacterState) {
					characterState.value = newCharacterState;
					const characterStatsAgent = new CharacterStatsAgent(llm);
					const newCharacterStatsState = await characterStatsAgent.generateCharacterStats(
						storyState.value,
						characterState.value,
						{
							resources: {
								HP: { max_value: 0, game_ends_when_zero: true },
								MP: { max_value: 0, game_ends_when_zero: false }
							}
						},
						true
					);
					parseState(newCharacterStatsState);
					if (newCharacterStatsState) {
						characterStatsState.value = newCharacterStatsState;
						quickstartModalOpen = false;
						await goto('/game');
					}
				}
			}
			isGeneratingState = false;
		} catch (e) {
			isGeneratingState = false;
			handleError(e);
		}
	}

	function onStartCustom() {
		clearStates();
		navigate('/new/tale');
	}

	function onNewCampaign() {
		clearStates();
		navigate('/new/campaign');
	}
</script>

{#if quickstartModalOpen}
	<QuickstartStoryGenerationModal
		{storyAgent}
		onsubmit={onQuickstartNew}
		onclose={() => (quickstartModalOpen = false)}
	/>
{/if}
{#if isGeneratingState}
	<LoadingModal loadingText="Creating Your New Tale, this may take a minute..." />
{/if}

<!-- Main Content Area -->
<div class="container mx-auto px-6 py-12">
	<div class="text-center mb-12">
		<h1 class="text-5xl font-bold text-white mb-4 font-jaro">AI Settings</h1>
	</div>

	<div class="max-w-2xl mx-auto bg-black bg-opacity-50 p-8 rounded-lg">
		<form class="m-6 flex flex-col items-center text-center">
			<!-- AI Provider Selection -->
			<label class="form-control w-full sm:w-2/3 mb-6">
				<p class="text-lg font-semibold mb-2">AI Provider</p>
				<select 
					bind:value={aiConfigState.value.selectedProvider} 
					class="select select-bordered mt-2"
				>
					<option value="gemini">Google Gemini</option>
					<option value="openai">OpenAI</option>
					<option value="pollinations">Pollinations (Free)</option>
				</select>
				<small class="m-auto mt-2">Choose your preferred AI provider</small>
			</label>

			<!-- Temperature Setting -->
			<label class="form-control w-full sm:w-2/3 mb-6 z-5">
				<p class="text-lg font-semibold mb-2">Temperature: {temperatureState.value.toFixed(2)}</p>
				<input
					type="range"
					min="0"
					max="2"
					step="0.05"
					bind:value={temperatureState.value}
					class="range range-info mt-2"
				/>
				<small class="m-auto mt-2 text-sm text-base-content/70">
					Higher temperature makes the AI more creative, but also errors more likely.
				</small>
			</label>

			<!-- Gemini Configuration -->
			{#if aiConfigState.value.selectedProvider === 'gemini'}
				<label class="form-control w-full sm:w-2/3">
					<p>Google Gemini API Key</p>
					<input
						type="text"
						id="apikey"
						bind:value={apiKeyState.value}
						placeholder="Copy your API Key from Google AI Studio and paste here"
						class="input input-bordered mt-2"
					/>
					<small class="m-auto mt-2"
						>View the
						<a
							target="_blank"
							href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Create-your-free-Google-Gemini-API-Key-%F0%9F%94%91"
							class="link text-blue-400 underline"
						>
							guide to create the API Key</a
						></small
					>
				</label>
			{/if}

			<!-- OpenAI Configuration -->
			{#if aiConfigState.value.selectedProvider === 'openai'}
				<label class="form-control w-full sm:w-2/3 mb-4">
					<p>OpenAI API Key</p>
					<input
						type="password"
						bind:value={aiConfigState.value.openaiApiKey}
						placeholder="sk-..."
						class="input input-bordered mt-2"
					/>
					<small class="m-auto mt-2">
						Get your API key from 
						<a
							target="_blank"
							href="https://platform.openai.com/api-keys"
							class="link text-blue-400 underline"
						>
							OpenAI Platform
						</a>
					</small>
				</label>

				<label class="form-control w-full sm:w-2/3 mb-4">
					<p>Base URL (Optional)</p>
					<input
						type="text"
						bind:value={aiConfigState.value.openaiBaseUrl}
						placeholder="https://api.openai.com/v1"
						class="input input-bordered mt-2"
					/>
					<small class="m-auto mt-2">For OpenAI-compatible APIs (leave default for OpenAI)</small>
				</label>

				<label class="form-control w-full sm:w-2/3 mb-4">
					<p>Model Name</p>
					<input
						type="text"
						bind:value={aiConfigState.value.openaiModel}
						placeholder="gpt-4o"
						class="input input-bordered mt-2"
					/>
					<small class="m-auto mt-2">Enter the model name (e.g., gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022)</small>
				</label>
			{/if}

			<!-- Pollinations Info -->
			{#if aiConfigState.value.selectedProvider === 'pollinations'}
				<div class="alert alert-info w-full sm:w-2/3 mb-4">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<span>Pollinations is free but may have limitations. No API key required.</span>
				</div>
			{/if}

			<!-- Action Buttons -->
			<button class="btn btn-accent m-auto mt-5 w-1/2" onclick={onQuickstartClicked}>
				Quickstart:<br />New Tale
			</button>
			<small class="m-auto mt-2">Let the AI generate a Tale for you</small>
			
			<button
				class="btn btn-neutral m-auto mt-5 w-1/2"
				disabled={!((aiConfigState.value.selectedProvider === 'openai' && aiConfigState.value.openaiApiKey) || 
						   (aiConfigState.value.selectedProvider === 'gemini' && apiKeyState.value) ||
						   (aiConfigState.value.selectedProvider === 'pollinations'))}
				onclick={onStartCustom}
			>
				New Custom Tale
			</button>
			<small class="m-auto mt-2">Customize your Tale with a brief, open-ended plot</small>
			
			<button
				class="btn btn-neutral m-auto mt-5 w-1/2"
				disabled={!((aiConfigState.value.selectedProvider === 'openai' && aiConfigState.value.openaiApiKey) || 
						   (aiConfigState.value.selectedProvider === 'gemini' && apiKeyState.value) ||
						   (aiConfigState.value.selectedProvider === 'pollinations'))}
				onclick={onNewCampaign}
			>
				New Campaign
			</button>
			<small class="m-auto mt-2">Structured Tale with in-detail planned plot</small>
			
			<div class="divider mt-7">Advanced Settings</div>

			{#if showGenerationSettingsModal}
				<AiGenerationSettings onclose={() => (showGenerationSettingsModal = false)} />
			{/if}
			<button
				class="btn btn-neutral m-auto mt-5 w-1/2"
				onclick={() => (showGenerationSettingsModal = true)}
			>
				Generation Settings
			</button>
			{#if showOutputFeaturesModal}
				<OutputFeaturesModal onclose={() => (showOutputFeaturesModal = false)} />
			{/if}
			<button
				class="btn btn-neutral m-auto mt-5 w-1/2"
				onclick={() => (showOutputFeaturesModal = true)}
			>
				Output Features
			</button>
			{#if showSystemPromptsModal}
				<SystemPromptsModal onclose={() => (showSystemPromptsModal = false)} />
			{/if}
			<button class="btn btn-neutral m-auto mt-5 w-1/2" onclick={() => (showSystemPromptsModal = true)}>
				System Prompts
			</button>
			{#if showAgentModelSettingsModal}
				<AgentModelSettings onclose={() => (showAgentModelSettingsModal = false)} />
			{/if}
			<button class="btn btn-neutral m-auto mt-5 w-1/2" onclick={() => (showAgentModelSettingsModal = true)}>
				Agent Model Settings
			</button>
		</form>
	</div>
</div>
