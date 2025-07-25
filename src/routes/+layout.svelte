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
