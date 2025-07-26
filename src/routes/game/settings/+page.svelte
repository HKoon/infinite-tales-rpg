<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { navigate } from '$lib/util.svelte';
	import ImportExportSaveGame from '$lib/components/ImportExportSaveGame.svelte';
	import type { Campaign } from '$lib/ai/agents/campaignAgent';
	import GameSettingsModal from '$lib/components/interaction_modals/settings/GameSettingsModal.svelte';
	import AiGameSettingsModal from '$lib/components/interaction_modals/settings/AiGameSettings.svelte';
	import backgroundSvg from '$lib/assets/bckg.svg';
	import logoSvg from '$lib/assets/rollrole.svg';

	let showGameSettingsModal = $state<boolean>(false);
	let showAiGameSettingsModal = $state<boolean>(false);
	let showSettings = $state(false);

	const campaignState = useLocalStorage<Campaign>('campaignState');
	const customMemoriesState = useLocalStorage<string>('customMemoriesState');
	const customGMNotesState = useLocalStorage<string>('customGMNotesState');
	//TODO migrate all settings that can be changed during game here

	const taleSettingsClicked = () => {
		if (campaignState.value?.chapters.length > 0) {
			navigate('/new/campaign');
		} else {
			navigate('/new/tale');
		}
	};
</script>

<svelte:head>
	<title>Roll Role - Game Settings</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	
</svelte:head>

{#if showGameSettingsModal}
	<GameSettingsModal onclose={() => (showGameSettingsModal = false)} />
{/if}
{#if showAiGameSettingsModal}
	<AiGameSettingsModal onclose={() => (showAiGameSettingsModal = false)} />
{/if}

<!-- Main Content Area -->
<div class="container mx-auto px-6 py-12">
	<div class="text-center mb-12">
		<h1 class="text-5xl font-bold text-white mb-4 font-jaro">Game Settings</h1>
	</div>

	<div class="max-w-2xl mx-auto bg-black bg-opacity-50 p-8 rounded-lg">
		<form class="flex flex-col items-center text-center space-y-4">
					<button
						onclick={(e) => { e.preventDefault(); showGameSettingsModal = true; }}
						class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full w-3/4 sm:w-1/2 transition-colors duration-200"
					>
						Game Settings
					</button>
					<button
						onclick={(e) => { e.preventDefault(); showAiGameSettingsModal = true; }}
						class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full w-3/4 sm:w-1/2 transition-colors duration-200"
					>
						AI Settings
					</button>

					<ImportExportSaveGame isSaveGame={true}>
						{#snippet exportButton(onclick)}
							<button {onclick} class="bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 rounded-full w-3/4 sm:w-1/2 transition-colors duration-200">
								Export Save Game
							</button>
						{/snippet}
						{#snippet importButton(onclick)}
							<button {onclick} class="bg-gray-200 hover:bg-gray-300 text-black font-bold py-3 px-6 rounded-full w-3/4 sm:w-1/2 transition-colors duration-200">
								Import Save Game
							</button>
						{/snippet}
					</ImportExportSaveGame>
					
					<button 
						onclick={(e) => { e.preventDefault(); taleSettingsClicked(); }}
						class="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-full w-3/4 sm:w-1/2 transition-colors duration-200"
					>
						View Tale Settings
					</button>
					
					<div class="w-full space-y-4 mt-6">
						<label class="block text-left">
							<span class="text-lg font-medium text-red-100">Custom Tale Memories</span>
							<textarea
								rows={3}
								placeholder="If the AI forgets important events during the Tale, you can enter custom memories here. Added to every action, don't make it too long."
								bind:value={customMemoriesState.value}
								class="mt-2 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
							></textarea>
						</label>
						
						<label class="block text-left">
							<span class="text-lg font-medium text-red-100">Custom GM Notes</span>
							<textarea
								rows={3}
								placeholder="Use for specific/temporary game rules, added to every action, don't make it too long."
								bind:value={customGMNotesState.value}
								class="mt-2 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
							></textarea>
						</label>
					</div>
				</form>
			</div>
		</div>
