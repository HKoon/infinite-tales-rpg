<script>
	import logo from '$lib/assets/rollrole.svg';
	import { page } from '$app/stores';
	import discord from '$lib/assets/socials/discord-logo-blue.png';
	import github from '$lib/assets/socials/icone-github-jaune.png';

	let { children } = $props();
	let activeUrl = $state('');
	$effect(() => {
		activeUrl = $page.url.pathname;
	});
</script>
<nav class="btm-nav bottom-[6vh] ml-auto mr-auto h-[7vh] max-w-7xl overflow-auto bg-base-300">
	<ul class="menu gap-0 p-0 sm:text-lg">
		<li>
			<a href="/game/settings/" class:active={activeUrl === '/game/settings'}>Tale Settings</a>
		</li>
		<li>
			<a href="/game/settings/ai" class:active={activeUrl === '/game/settings/ai'}>AI Settings</a>
		</li>
	</ul>
</nav>

{@render children()}
