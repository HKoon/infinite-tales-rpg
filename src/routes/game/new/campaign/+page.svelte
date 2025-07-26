<script lang="ts">
	import { onMount } from 'svelte';
	import LoadingModal from '$lib/components/LoadingModal.svelte';
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import { LLMProvider } from '$lib/ai/llmProvider';
	import {
		getRowsForTextarea,
		loadPDF,
		navigate,
		removeEmptyValues,
		stringifyPretty
	} from '$lib/util.svelte';
	import isEqual from 'lodash.isequal';
	import ImportExportSaveGame from '$lib/components/ImportExportSaveGame.svelte';
	import { type CharacterDescription, initialCharacterState } from '$lib/ai/agents/characterAgent';
	import {
		type Campaign,
		CampaignAgent,
		type CampaignChapter,
		getNewChapterObject,
		getNewPlotPointObject,
		initialCampaignState
	} from '$lib/ai/agents/campaignAgent';
	import { type Story } from '$lib/ai/agents/storyAgent';
	import { beforeNavigate } from '$app/navigation';
	import type { AIConfig } from '$lib';
	import backgroundImage from '$lib/assets/bckg.svg';
	import logo from '$lib/assets/logo.jpeg';
	import { showSettings } from '$lib/state/showSettings.svelte';
	let isGeneratingState = $state(false);
	const apiKeyState = useLocalStorage<string>('apiKeyState');
	const aiLanguage = useLocalStorage<string>('aiLanguage');
	let campaignAgent: CampaignAgent;

	const campaignState = useLocalStorage<Campaign>('campaignState', initialCampaignState);
	const storyState = useLocalStorage<Story>('storyState', {} as Story);
	const currentChapterState = useLocalStorage<number>('currentChapterState');
	const textAreaRowsDerived = $derived(getRowsForTextarea(campaignState.value));
	let campaignStateOverwrites = $state({});
	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');

	onMount(() => {
		campaignAgent = new CampaignAgent(
			LLMProvider.provideLLM(
				{
					temperature: 2,
					apiKey: apiKeyState.value,
					language: aiLanguage.value
				},
				aiConfigState.value?.useFallbackLlmState
			)
		);

		beforeNavigate(() => {
			overwriteTaleWithCampaignSettings(getCurrentChapterMapped(), storyState.value);
		});
	});

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
					campaignStateOverwrites = { ...campaignStateOverwrites, gameBook: text };
					await onRandomize();
				};
				reader.readAsArrayBuffer(file);
			}
		});
	}

	function getCharacterDescription() {
		let characterDescription = $state.snapshot(characterState.value);
		if (isEqual(characterDescription, initialCharacterState)) {
			return undefined;
		}
		return characterDescription;
	}

	const onRandomize = async () => {
		isGeneratingState = true;

		const newState = await campaignAgent.generateCampaign(
			$state.snapshot(campaignStateOverwrites),
			getCharacterDescription()
		);
		if (newState) {
			console.log(stringifyPretty(newState));
			campaignState.value = newState;
		}
		isGeneratingState = false;
		return newState;
	};

	const onRandomizeSingle = async (stateValue: string, chapterNumber: string = '') => {
		isGeneratingState = true;
		const currentCampaign = $state.snapshot(campaignState.value);
		if (chapterNumber) {
			currentCampaign[stateValue][chapterNumber] = undefined;
		} else {
			currentCampaign[stateValue] = undefined;
		}
		const filteredOverwrites: Campaign = removeEmptyValues(
			$state.snapshot(campaignStateOverwrites)
		) as Campaign;
		const singleChapterOverwritten =
			filteredOverwrites.chapters && filteredOverwrites.chapters[chapterNumber];
		//TODO not generic
		if (filteredOverwrites.chapters) {
			filteredOverwrites.chapters = Object.entries(
				removeEmptyValues(filteredOverwrites.chapters)
			).map(
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				([_, value]) => value
			);
		}

		let alteredCampaign = { ...currentCampaign, ...filteredOverwrites };
		if (chapterNumber) {
			// TODO only works for chapters section
			const newChapter = await campaignAgent.generateSingleChapter(
				alteredCampaign,
				$state.snapshot(characterState.value),
				Number.parseInt(chapterNumber) + 1,
				singleChapterOverwritten
			);
			campaignState.value[stateValue][chapterNumber] = newChapter;
		} else {
			const newState = await campaignAgent.generateCampaign(
				alteredCampaign,
				$state.snapshot(characterState.value)
			);
			if (newState) {
				console.log(stringifyPretty(newState));
				campaignState.value[stateValue] = newState[stateValue];
			}
		}
		isGeneratingState = false;
	};

	function handleInput(evt, stateValue) {
		campaignStateOverwrites[stateValue] = evt.target.value;
	}

	function isCampaignSet() {
		return campaignState.value?.chapters?.length > 0;
	}

	async function _goto(page: string) {
		if (isEqual(initialCampaignState, campaignState.value)) {
			if (!(await onRandomize())) {
				return;
			}
		}
		navigate('/new/' + page);
	}

	const overwriteTaleWithCampaignSettings = (currentChapter: CampaignChapter, taleState: Story) => {
		if (taleState) {
			taleState.adventure_and_main_event = stringifyPretty(currentChapter);
			taleState.general_image_prompt = campaignState.value.general_image_prompt;
			taleState.character_simple_description = campaignState.value.character_simple_description;
			taleState.world_details = campaignState.value.world_details;
			taleState.game = campaignState.value.game;
			taleState.theme = campaignState.value.theme;
			taleState.tonality = campaignState.value.tonality;
			console.log(stringifyPretty(taleState));
			storyState.value = taleState;
		}
		if (!currentChapterState.value) {
			currentChapterState.value = 1;
		}
	};

	const getCurrentChapterMapped = () => {
		const currentChapterNumber = currentChapterState.value || 1;
		const currentChapter: CampaignChapter = $state.snapshot(
			campaignState.value.chapters[currentChapterNumber - 1]
		);
		//currentChapterNumber is actually next chapter as it starts with 1
		const nextPlotPoint = campaignState.value.chapters[currentChapterNumber]?.plot_points[0];
		if (nextPlotPoint) {
			currentChapter.plot_points.push({
				...nextPlotPoint,
				plotId: currentChapter.plot_points.length + 1
			});
		}
		return currentChapter;
	};
</script>

<div
	class="min-h-screen bg-cover bg-center bg-no-repeat"
	style="background-image: url({backgroundImage})"
>
	<!-- Navigation Bar -->
	<div class="navbar bg-base-100/90 backdrop-blur-sm">
		<div class="navbar-start">
			<div class="dropdown">
				<div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						d="M4 6h16M4 12h8m-8 6h16"
					/>
				</svg>
			</div>
			<ul
				class="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow"
			>
				<li><a href="/game">Game</a></li>
				<li><a href="/game/character">Character</a></li>
				<li><a href="/game/settings">Settings</a></li>
			</ul>
			</div>
			<a href="/" class="btn btn-ghost text-xl">
				<img src={logo} alt="Logo" class="h-8 w-8" />
				Infinite Tales
			</a>
		</div>
		<div class="navbar-center hidden lg:flex">
			<ul class="menu menu-horizontal px-1">
				<li><a href="/game">Game</a></li>
				<li><a href="/game/character">Character</a></li>
				<li><a href="/game/settings">Settings</a></li>
			</ul>
		</div>
		<div class="navbar-end">
			<button
				aria-label="Settings"
				class="btn btn-ghost"
				onclick={() => ($showSettings = !$showSettings)}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Main Content -->
	<div class="container mx-auto px-4 py-8">
		<div class="card bg-base-100/90 shadow-xl backdrop-blur-sm">
			<div class="card-body">
				<h1 class="card-title text-center text-3xl font-bold">Campaign Setup</h1>

{#if isGeneratingState}
	<LoadingModal loadingText="Generating Campaign, this may take a while..." />
{/if}
<ul class="steps mt-3 w-full">
	<li class="step step-primary">Campaign</li>
	<!--TODO  -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('character')}>Character</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('characterStats')}>Stats</li>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions  -->
	<!-- svelte-ignore a11y_click_events_have_key_events  -->
	<li class="step cursor-pointer" onclick={() => _goto('character')}>Start</li>
</ul>
<form class="m-6 grid items-center gap-2 text-center">
	<button
		class="btn btn-accent m-auto mt-3 w-3/4 sm:w-1/2"
		disabled={isGeneratingState}
		onclick={onRandomize}
	>
		Randomize All
	</button>
	<button class="btn btn-neutral m-auto w-3/4 sm:w-1/2" onclick={onUploadClicked}>
		Generate Campaign from PDF
	</button>
	<button
		class="btn btn-neutral m-auto w-3/4 sm:w-1/2"
		onclick={() => {
			campaignState.reset();
			storyState.reset();
			campaignStateOverwrites = {};
		}}
	>
		Clear All
	</button>
	<ImportExportSaveGame isSaveGame={false}>
		{#snippet exportButton(onclick)}
			<button {onclick} class="btn btn-neutral m-auto w-3/4 sm:w-1/2"> Export Settings</button>
		{/snippet}
		{#snippet importButton(onclick)}
			<button {onclick} class="btn btn-neutral m-auto w-3/4 sm:w-1/2"> Import Settings</button>
		{/snippet}
	</ImportExportSaveGame>
	<button
		class="btn btn-primary m-auto w-3/4 sm:w-1/2"
		disabled={!isCampaignSet()}
		onclick={() => _goto('character')}
	>
		Next Step:<br /> Customize Character
	</button>
	<p>The Campaign mode is currently in alpha, bugs are still expected.</p>
	<p>Please report any bugs in the Discord!</p>
	<p>Watch out for:</p>
	<ul>
		<li>Consistency with plot points and GM notes.</li>
		<li>Transition between chapters.</li>
		<li>Consistency with decisions that deviate from the planned plot.</li>
	</ul>
	{#if campaignState.value}
		{#each Object.keys(initialCampaignState) as stateValue}
			{#if stateValue === 'chapters'}
				<!-- TODO refactor or leave for now?-->
				<label class="form-control mt-3 w-full">
					<details open class="collapse collapse-arrow border border-base-300 bg-base-200">
						<summary class="collapse-title capitalize">{stateValue.replaceAll('_', ' ')}</summary>
						<div class="collapse-content">
							{#each Object.keys(campaignState.value[stateValue]) as chapterNumber}
								<label class="form-control mt-3 w-full">
									<details class="collapse collapse-arrow textarea-bordered border bg-base-200">
										{#each Object.keys(campaignState.value[stateValue][chapterNumber]) as chapterProperty (chapterProperty)}
											{#if chapterProperty === 'plot_points'}
												<details class="collapse collapse-arrow border border-base-300 bg-base-200">
													<summary class="collapse-title capitalize"
														>{chapterProperty.replaceAll('_', ' ')}</summary
													>
													<div class="collapse-content">
														{#each Object.keys(campaignState.value[stateValue][chapterNumber][chapterProperty]) as plotPoint}
															<label class="form-control mt-3 w-full">
																<details
																	class="collapse collapse-arrow textarea-bordered border bg-base-200"
																>
																	{#each Object.keys(campaignState.value[stateValue][chapterNumber][chapterProperty][plotPoint]) as plotPointProperty (plotPointProperty)}
																		{#if plotPointProperty === 'location'}
																			<summary class="collapse-title capitalize">
																				<div class="m-auto w-full sm:col-span-2">
																					<p
																						class="content-center overflow-hidden overflow-ellipsis"
																					>
																						{`${campaignState.value[stateValue][chapterNumber][chapterProperty][plotPoint][plotPointProperty] || 'Enter A Name'}`}
																					</p>
																					<button
																						class="components btn btn-error no-animation btn-sm m-auto mt-2"
																						onclick={(evt) => {
																							evt.preventDefault();
																							campaignState.value[stateValue][chapterNumber][
																								chapterProperty
																							].splice(Number.parseInt(plotPoint), 1);
																							if (
																								campaignStateOverwrites[stateValue] &&
																								campaignStateOverwrites[stateValue][chapterNumber][
																									chapterProperty
																								][plotPoint]
																							) {
																								delete campaignStateOverwrites[stateValue][
																									chapterNumber
																								][chapterProperty][plotPoint];
																							}
																							campaignState.value[stateValue][chapterNumber][
																								chapterProperty
																							] = campaignState.value[stateValue][chapterNumber][
																								chapterProperty
																							].map((plotPoint, i) => ({
																								...plotPoint,
																								plotId: i + 1
																							}));
																						}}
																					>
																						Delete
																					</button>
																				</div>
																			</summary>
																		{/if}
																		{#if plotPointProperty !== 'plotId'}
																			<div class="collapse-content">
																				<label class="form-control mt-3 w-full">
																					<div class="capitalize">
																						{plotPointProperty.replaceAll('_', ' ')}
																						{#if campaignStateOverwrites[stateValue] && campaignStateOverwrites[stateValue][chapterNumber] && campaignStateOverwrites[stateValue][chapterNumber][chapterProperty] && campaignStateOverwrites[stateValue][chapterNumber][chapterProperty][plotPoint] && campaignStateOverwrites[stateValue][chapterNumber][chapterProperty][plotPoint][plotPointProperty]}
																							<span class="badge badge-accent ml-2"
																								>overwritten</span
																							>
																						{/if}
																					</div>
																					<textarea
																						bind:value={campaignState.value[stateValue][
																							chapterNumber
																						][chapterProperty][plotPoint][plotPointProperty]}
																						rows={(
																							campaignState.value[stateValue][chapterNumber][
																								chapterProperty
																							][plotPoint][plotPointProperty] + ''
																						).length > 60
																							? 4
																							: 2}
																						oninput={(evt) => {
																							if (!campaignStateOverwrites[stateValue]) {
																								campaignStateOverwrites[stateValue] = {};
																							}
																							if (
																								!campaignStateOverwrites[stateValue][chapterNumber]
																							) {
																								campaignStateOverwrites[stateValue][chapterNumber] =
																									{};
																							}
																							if (
																								!campaignStateOverwrites[stateValue][chapterNumber][
																									chapterProperty
																								]
																							) {
																								campaignStateOverwrites[stateValue][chapterNumber][
																									chapterProperty
																								] = {};
																							}
																							if (
																								!campaignStateOverwrites[stateValue][chapterNumber][
																									chapterProperty
																								][plotPoint]
																							) {
																								campaignStateOverwrites[stateValue][chapterNumber][
																									chapterProperty
																								][plotPoint] = {};
																							}
																							campaignStateOverwrites[stateValue][chapterNumber][
																								chapterProperty
																							][plotPoint][plotPointProperty] = evt.target?.value;
																						}}
																						class="textarea textarea-bordered textarea-md mt-2 w-full"
																					>
																					</textarea>
																				</label>
																			</div>
																		{/if}
																	{/each}
																</details>
															</label>
														{/each}
													</div>
												</details>
												<!-- Plot Points -->
												<button
													class="btn btn-neutral m-auto mt-2 w-3/4 capitalize sm:w-1/2"
													onclick={() => {
														campaignState.value[stateValue][chapterNumber][chapterProperty].push(
															getNewPlotPointObject(
																campaignState.value[stateValue][chapterNumber][chapterProperty]
																	.length + 1
															)
														);
													}}
												>
													Add Plot Point
												</button>
											{:else}
												{#if chapterProperty === 'title'}
													<summary class="collapse-title capitalize">
														<div class="m-auto w-full sm:col-span-2">
															<p class="content-center overflow-hidden overflow-ellipsis">
																{isNaN(parseInt(chapterNumber))
																	? chapterNumber.replaceAll('_', ' ')
																	: `${campaignState.value[stateValue][chapterNumber][chapterProperty] || 'Enter A Name'}`}
															</p>
															<button
																class="components btn btn-error no-animation btn-sm m-auto mt-2"
																onclick={(evt) => {
																	evt.preventDefault();
																	campaignState.value[stateValue].splice(
																		Number.parseInt(chapterNumber),
																		1
																	);
																	if (
																		campaignStateOverwrites[stateValue] &&
																		campaignStateOverwrites[stateValue][chapterNumber]
																	) {
																		delete campaignStateOverwrites[stateValue][chapterNumber];
																	}
																	campaignState.value[stateValue] = campaignState.value[
																		stateValue
																	].map((chapter, i) => ({ ...chapter, chapterId: i + 1 }));
																}}
															>
																Delete
															</button>
														</div>
													</summary>
												{/if}
												{#if chapterProperty !== 'chapterId'}
													<div class="collapse-content">
														<label class="form-control mt-3 w-full">
															<div class="capitalize">
																{chapterProperty.replaceAll('_', ' ')}
																{#if campaignStateOverwrites[stateValue] && campaignStateOverwrites[stateValue][chapterNumber] && campaignStateOverwrites[stateValue][chapterNumber][chapterProperty]}
																	<span class="badge badge-accent ml-2">overwritten</span>
																{/if}
															</div>
															<textarea
																bind:value={campaignState.value[stateValue][chapterNumber][
																	chapterProperty
																]}
																rows={campaignState.value[stateValue][chapterNumber][
																	chapterProperty
																]?.length > 30
																	? 2
																	: 1}
																oninput={(evt) => {
																	if (!campaignStateOverwrites[stateValue]) {
																		campaignStateOverwrites[stateValue] = {};
																	}
																	if (!campaignStateOverwrites[stateValue][chapterNumber]) {
																		campaignStateOverwrites[stateValue][chapterNumber] = {};
																	}
																	campaignStateOverwrites[stateValue][chapterNumber][
																		chapterProperty
																	] = evt.target?.value;
																}}
																class="textarea textarea-bordered textarea-md mt-2 w-full"
															>
															</textarea>
														</label>
													</div>
												{/if}
											{/if}
										{/each}
										<button
											class="btn btn-accent m-5 m-auto mb-2 mt-2 w-3/4 sm:w-1/2"
											onclick={() => {
												onRandomizeSingle(stateValue, chapterNumber);
											}}
										>
											Randomize Whole Chapter
										</button>
									</details>
								</label>
							{/each}
							<!-- Chapters -->
						</div>
						<button
							class="btn btn-neutral m-auto mt-2 w-3/4 capitalize sm:w-1/2"
							onclick={() => {
								campaignState.value[stateValue].push(
									getNewChapterObject(campaignState.value[stateValue].length + 1)
								);
							}}
						>
							Add Chapter
						</button>
						<button
							class="btn btn-accent m-5 m-auto mb-2 mt-2 w-3/4 sm:w-1/2"
							onclick={() => {
								onRandomizeSingle(stateValue);
							}}
						>
							Randomize All Chapters
						</button>
					</details>
				</label>
			{:else}
				<label class="form-control mt-3 w-full">
					<div class=" flex-row capitalize">
						{stateValue.replaceAll('_', ' ')}
						{#if campaignStateOverwrites[stateValue]}
							<span class="badge badge-accent ml-2">overwritten</span>
						{/if}
					</div>

					<textarea
						bind:value={campaignState.value[stateValue]}
						rows={textAreaRowsDerived ? textAreaRowsDerived[stateValue] : 2}
						oninput={(evt) => handleInput(evt, stateValue)}
						placeholder={initialCampaignState[stateValue]}
						class="textarea textarea-bordered textarea-md mt-2 w-full"
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
						campaignState.resetProperty(stateValue);
						delete campaignStateOverwrites[stateValue];
					}}
				>
					Clear {stateValue.replaceAll('_', ' ')}
				</button>
			{/if}
		{/each}
		<button
			class="btn btn-primary m-auto mt-2 w-3/4 sm:w-1/2"
			disabled={!isCampaignSet()}
			onclick={() => _goto('character')}
		>
			Next Step:<br /> Customize Character
		</button>
	{/if}
</form>
			</div>
		</div>
	</div>
</div>
