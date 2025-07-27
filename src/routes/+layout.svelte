<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Jaro:opsz@6..72&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<script lang="ts">
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { children, data } = $props();
	const deploymentEnv = data.DEPLOYMENT_ENV || 'development';
	
	// Only inject Vercel analytics when actually running on Vercel
	const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
	
	if (deploymentEnv === 'production' && isVercel) {
		injectSpeedInsights();
		inject({ mode: 'production' });
	}
</script>

{@render children()}
