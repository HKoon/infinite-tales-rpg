<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import AIGeneratedImage from '$lib/components/AIGeneratedImage.svelte';
	import type { CharacterStats, SkillsProgression } from '$lib/ai/agents/characterStatsAgent.ts';
	import type { CharacterDescription } from '$lib/ai/agents/characterAgent';
	import type { Story } from '$lib/ai/agents/storyAgent';
	import type { AIConfig } from '$lib';
	import { getRequiredSkillProgression } from '../characterLogic';

	const characterState = useLocalStorage<CharacterDescription>('characterState');
	const characterStatsState = useLocalStorage<CharacterStats>('characterStatsState');
	const skillsProgressionState = useLocalStorage<SkillsProgression>('skillsProgressionState');
	const storyState = useLocalStorage<Story>('storyState');
	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState');
</script>

{#if characterState.value}

			<!-- Character Profile Content -->
			<div class="container mx-auto px-6 py-12">
				<div class="max-w-4xl mx-auto bg-black bg-opacity-70 p-8 rounded-lg">
					<div class="character-profile text-white">
						<h1 class="text-4xl font-bold text-center mb-6 border-b border-gray-600 pb-4 font-jaro">
							{characterState.value.name}
						</h1>
						
						{#if !aiConfigState.value?.disableImagesState}
							<div class="flex justify-center mb-8">
								<div class="w-64 h-64 rounded-lg overflow-hidden">
									<AIGeneratedImage
										storageKey="characterImageState"
										imagePrompt="{storyState.value.general_image_prompt} {characterState.value.appearance}"
									></AIGeneratedImage>
								</div>
							</div>
						{/if}

						<div class="grid md:grid-cols-2 gap-8">
							<!-- Basic Information -->
							<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg">
								<h2 class="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2 text-red-300">
									Basic Information
								</h2>
								<div class="space-y-3">
									<p><strong class="text-red-200">Race:</strong> <span class="text-white">{characterState.value.race}</span></p>
									<p><strong class="text-red-200">Gender:</strong> <span class="text-white">{characterState.value.gender}</span></p>
									<p><strong class="text-red-200">Class:</strong> <span class="text-white">{characterState.value.class}</span></p>
									<p><strong class="text-red-200">Level:</strong> <span class="text-white">{characterStatsState.value.level}</span></p>
									{#each Object.entries(characterStatsState.value.resources || {}) as [resourceKey, resourceValue] (resourceKey)}
										<p class="capitalize">
											<strong class="text-red-200">Max. {resourceKey.replaceAll('_', ' ')}:</strong> <span class="text-white">{resourceValue.max_value}</span>
										</p>
									{/each}
									<p><strong class="text-red-200">Alignment:</strong> <span class="text-white">{characterState.value.alignment}</span></p>
									<p><strong class="text-red-200">Background:</strong> <span class="text-white">{characterState.value.background}</span></p>
								</div>
							</div>

							<!-- Attributes -->
							<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg">
								<h2 class="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2 text-red-300">Attributes</h2>
								<div class="grid grid-cols-2 gap-3">
									{#each Object.entries(characterStatsState.value.attributes || {}) as [attributeName, attributeValue] (attributeName)}
										<div class="bg-gray-700 bg-opacity-50 p-3 rounded text-center">
											<div class="text-red-200 text-sm capitalize">{attributeName.replace(/_/g, ' ')}</div>
											<div class="text-white text-xl font-bold">{attributeValue}</div>
										</div>
									{/each}
								</div>
							</div>
						</div>

						<!-- Character Details -->
						<div class="grid md:grid-cols-3 gap-6 mt-8">
							<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg">
								<h2 class="text-xl font-semibold mb-3 border-b border-gray-600 pb-2 text-red-300">Appearance</h2>
								<p class="text-gray-200">{characterState.value.appearance}</p>
							</div>

							<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg">
								<h2 class="text-xl font-semibold mb-3 border-b border-gray-600 pb-2 text-red-300">Personality</h2>
								<p class="text-gray-200">{characterState.value.personality}</p>
							</div>

							<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg">
								<h2 class="text-xl font-semibold mb-3 border-b border-gray-600 pb-2 text-red-300">Motivation</h2>
								<p class="text-gray-200">{characterState.value.motivation}</p>
							</div>
						</div>

						<!-- Skills -->
						<div class="bg-gray-800 bg-opacity-50 p-6 rounded-lg mt-8">
							<h2 class="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2 text-red-300">Skills</h2>
							<div class="grid md:grid-cols-2 gap-4">
								{#each Object.entries(characterStatsState.value.skills || {}) as [skillName, skillValue] (skillName)}
									<div class="bg-gray-700 bg-opacity-50 p-4 rounded">
										<div class="flex justify-between items-center mb-2">
											<strong class="text-white capitalize">{skillName.replace(/_/g, ' ')}: {skillValue}</strong>
										</div>
										<div class="flex justify-between text-sm text-gray-300 mb-1">
											<span>{skillsProgressionState.value[skillName] || 0}</span>
											<span>{getRequiredSkillProgression(skillName, characterStatsState.value)}</span>
										</div>
										<div class="w-full bg-gray-600 rounded-full h-2">
											<div 
												class="bg-green-500 h-2 rounded-full transition-all duration-300" 
												style="width: {((skillsProgressionState.value[skillName] || 0) / (getRequiredSkillProgression(skillName, characterStatsState.value) || 1)) * 100}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>
{/if}
