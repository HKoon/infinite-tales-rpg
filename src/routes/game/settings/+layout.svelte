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

{@render children()}
