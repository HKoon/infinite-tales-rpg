<script lang="ts">
	import '../app.css';
	import discord from '$lib/assets/socials/discord-logo-blue.png';
	import github from '$lib/assets/socials/icone-github-jaune.png';
	import Disclaimer from '$lib/components/Disclaimer.svelte';
	import { goto } from '$app/navigation';
	
	// Import game type images
	import mapD6 from '$lib/assets/game-types/map-d6.svg';
	import dragonDungeon from '$lib/assets/game-types/dragon-dungeon.svg';
	import fateCore from '$lib/assets/game-types/fate-core.svg';
	import callOfCthulhu from '$lib/assets/game-types/call-of-cthulhu.svg';
	import backgroundSvg from '$lib/assets/bckg.svg';
	import logoSvg from '$lib/assets/rollrole.svg';

	let disclaimerOpen = $state(false);
	let showSettings = $state(false);

	const gameTypes = [
		{
			id: 'map-d6',
			title: 'M.A.P\nD6',
			subtitle: 'Rookie',
			image: mapD6,
			available: true
		},
		{
			id: 'dragon-dungeon',
			title: 'DRAGON&\nDUNGEON',
			subtitle: 'Fantasy',
			image: dragonDungeon,
			available: false
		},
		{
			id: 'fate-core',
			title: 'FATE\nCORE',
			subtitle: 'Modern',
			image: fateCore,
			available: false
		},
		{
			id: 'call-of-cthulhu',
			title: 'CALL OF\nCTHULHU',
			subtitle: 'Horror',
			image: callOfCthulhu,
			available: false
		}
	];

	const handleCardClick = (gameType: any) => {
		if (gameType.available) {
			goto('/game/new/tale');
		}
	};
</script>

<svelte:head>
	<title>Roll Role - RPG Game</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	
</svelte:head>

<!-- Main Content -->
<main class="min-h-screen relative overflow-hidden font-jaro">
	<!-- 背景图片 -->
	<div 
		class="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
		style="background-image: url({backgroundSvg})"
	></div>
	
	<!-- 内容层 -->
	<div class="relative z-10">
		<!-- Top Navigation Bar -->
		<nav class="flex justify-between items-center p-6">
			<div class="flex items-center">
				<img src={logoSvg} alt="Roll Role Logo" class="h-12 w-auto mr-4" />
			</div>
			<div class="relative">
				<button
					aria-label="Settings"
					onclick={() => showSettings = !showSettings}
					class="text-white hover:text-red-200 transition-colors duration-200"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						></path>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						></path>
					</svg>
				</button>
				{#if showSettings}
					<div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
						<a href="/game/settings/ai" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">AI Settings</a>
						<a href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Create-your-free-Google-Gemini-API-Key-%F0%9F%94%91" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">API Key Guide</a>
						<a href="https://discord.gg/CUvgRQR77y" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Discord Community</a>
						<a href="https://github.com/JayJayBinks/infinite-tales-rpg" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">GitHub</a>
					</div>
				{/if}
			</div>
		</nav>
		<!-- Main Content Area -->
		<div class="container mx-auto px-6 py-12">
			<div class="text-center mb-12">
				<h1 class="text-5xl font-bold text-white mb-4 font-jaro">Choose Your Adventure</h1>
			</div>

			<!-- Game Type Cards -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
				{#each gameTypes as gameType}
					<div 
	class="flex flex-col rounded-lg overflow-hidden shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 cursor-pointer"
	class:opacity-60={!gameType.available}
	onclick={() => handleCardClick(gameType)}
	onkeydown={(e) => e.key === 'Enter' && handleCardClick(gameType)}
	role="button"
	tabindex="0"
	aria-label={`Select ${gameType.title} game type`}
	style="aspect-ratio: 9 / 16;"
>
	<!-- Image and Overlay Wrapper -->
	<div class="relative flex-grow">
		<!-- Image with rounded corners -->
		<img src={gameType.image} alt={gameType.title} class="w-full h-full object-cover rounded-xl" />
		
		<!-- Black Mask/Gradient -->
		<div class="absolute inset-0 bg-gradient-to-t from-black via-transparent via-50% to-transparent rounded-xl"></div>

		<!-- Red Title -->
		<div class="absolute bottom-16 left-0 right-0 p-4 text-center">
			<span class="text-5xl font-bold text-red-500 leading-tight font-jaro" style="white-space: pre-line;">{gameType.title}</span>
		</div>
	</div>

	<!-- Subtitle Section -->
	<div class="bg-[#FFF7E3] py-3 px-2 text-center -mt-12 relative z-10 rounded-b-xl">
		<span class="text-2xl font-bold text-[#231815] font-jaro">{gameType.subtitle}</span>
	</div>

	<!-- Coming Soon Overlay 
	{#if !gameType.available}
		<div class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg z-20">
			<span class="text-white font-semibold text-2xl font-jaro">Coming Soon</span>
		</div>
	{/if} -->
</div>
				{/each}
			</div>
		</div>
	</div>

	<Disclaimer
		{disclaimerOpen}
		onAgree={() => {
			disclaimerOpen = false;
			goto('game/settings/ai');
		}}
	></Disclaimer>
</main>
