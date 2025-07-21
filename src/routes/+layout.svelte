<script lang="ts">
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	let { children, data } = $props();
	const mode = data.VERCEL_ENV || 'development';
	
	// Only inject Vercel analytics when actually running on Vercel
	// Check for actual Vercel environment, not just production mode
	const isVercel = typeof window !== 'undefined' && 
		(window.location.hostname.includes('vercel.app') || 
		 window.location.hostname.includes('vercel.com') ||
		 data.VERCEL_ENV === 'production' && mode === 'production');
	
	if (isVercel && mode === 'production') {
		injectSpeedInsights();
		inject({ mode: 'production' });
	}
</script>

{@render children()}
