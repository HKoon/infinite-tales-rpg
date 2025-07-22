<script lang="ts">
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
	import { browser } from '$app/environment';

	let { children, data } = $props();
	
	// Only inject Vercel analytics when actually running on Vercel
	// data.VERCEL_ENV will only exist if we're actually on Vercel
	const isVercel = !!data.VERCEL_ENV;
	const isProduction = data.VERCEL_ENV === 'production';
	
	if (browser && isVercel && isProduction) {
		injectSpeedInsights();
		inject({ mode: 'production' });
	}
</script>

{@render children()}
