<script>
	import '../../app.css';
	import { page } from '$app/stores';
	import { errorState } from '$lib/state/errorState.svelte.ts';
	import ErrorModal from '$lib/components/interaction_modals/ErrorModal.svelte';
	import { handleError } from '$lib/util.svelte.ts';
	import { onMount } from 'svelte';
	import { stringifyPretty } from '$lib/util.svelte';
	import backgroundSvg from '$lib/assets/bckg.svg';
	import logoSvg from '$lib/assets/rollrole.svg';
	import { StreamManager } from '$lib/utils/streamManager';

	let showSettings = $state(false);
	let { children } = $props();
	let activeUrl = $state('');
	let hasSubMenu = $state(false);
	$effect(() => {
		activeUrl = $page.url.pathname;
		hasSubMenu = activeUrl.includes('game/settings');
	});

	onMount(() => {
		window.onerror = (event, source, lineno, colno, error) => {
			let text = '';
			if (error.message) {
				text += error.message;
			}
			if (error.stack) {
				text += '\n' + error.stack;
			} else {
				text += '\n' + stringifyPretty({ event, source, lineno, colno, error });
			}
			handleError(text);
			return false;
		};
		window.onunhandledrejection = (a) => {
			let text = '';
			if (a.reason.message) {
				text += a.reason.message;
			}
			if (a.reason.stack) {
				text += '\n' + a.reason.stack;
			} else {
				text += '\n' + a.reason;
			}
			handleError(text);
			return false;
		};

		// Add cleanup for streams on page unload
		const handleBeforeUnload = () => {
			try {
				const streamManager = StreamManager.getInstance();
				streamManager.cleanup();
			} catch (error) {
				console.error('Error cleaning up streams on page unload:', error);
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		window.addEventListener('pagehide', handleBeforeUnload);

		// Cleanup function
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			window.removeEventListener('pagehide', handleBeforeUnload);
		};
	});
</script>

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
			<a href="/" class="flex items-center">
				<img src={logoSvg} alt="Roll Role Logo" class="h-12 w-auto mr-4" />
			</a>
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
					<div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
						<a href="/game/settings/ai" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">AI Settings</a>
						<a href="https://github.com/JayJayBinks/infinite-tales-rpg/wiki/Create-your-free-Google-Gemini-API-Key-%F0%9F%94%91" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">API Key Guide</a>
						<a href="https://discord.gg/CUvgRQR77y" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Discord Community</a>
						<a href="https://github.com/JayJayBinks/infinite-tales-rpg" target="_blank" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">GitHub</a>
					</div>
				{/if}
			</div>
		</nav>

		{#if errorState.userMessage && activeUrl !== '/game'}
			<ErrorModal />
		{/if}

		<nav class="btm-nav ml-auto mr-auto h-[7vh] max-w-7xl overflow-auto bg-base-300 z-50">
			<ul class="menu gap-0 p-0 sm:text-lg">
				<li>
					<a href="/game" class:active={activeUrl === '/game'}>Tale</a>
				</li>
				<li>
					<a href="/game/debugstate" class:active={activeUrl === '/game/debugstate'}>Debug Info</a>
				</li>
				<li>
					<a href="/game/character" class:active={activeUrl === '/game/character'}>Character</a>
				</li>
				<li>
					<a href="/game/settings/ai" class:active={activeUrl.includes('/game/settings')}>Menu</a>
				</li>
			</ul>
		</nav>

		<!--TODO max-h-[85vh] is just a workaround because the mobile browser address bar makes 93vh higher than it should...
		-->
		<main
			class:max-h-[78vh]={hasSubMenu}
			class:lg:max-h-[86vh]={hasSubMenu}
			class:max-h-[85vh]={!hasSubMenu}
			class:lg:max-h-[93vh]={!hasSubMenu}
			class="ml-auto mr-auto max-w-7xl overflow-auto"
		>
			{@render children()}
		</main>
	</div>
</main>
