<script lang="ts">
	import { getTTSUrl } from '$lib/util.svelte';
	import { onDestroy } from 'svelte';

	type Props = { text: string; voice: string; hidden?: boolean };
	let { text, voice }: Props = $props();
	let storyTTSAudioElement: HTMLAudioElement;
	
	// Add error handling for the audio element
	let audioError = $state(false);
	
	$effect(() => {
		if (!text) {
			if (storyTTSAudioElement) {
				storyTTSAudioElement.src = '';
			}
			return;
		}
		
		if (text && storyTTSAudioElement) {
			try {
				storyTTSAudioElement.currentTime = 0;
				storyTTSAudioElement.src = getTTSUrl(text, voice);
				audioError = false;
			} catch (error) {
				console.error('Error setting TTS audio source:', error);
				audioError = true;
			}
		}
	});

	// Add error event handler
	function handleAudioError(event: Event) {
		console.error('TTS Audio error:', event);
		audioError = true;
	}

	// Cleanup on component destroy
	onDestroy(() => {
		if (storyTTSAudioElement) {
			try {
				storyTTSAudioElement.pause();
				storyTTSAudioElement.src = '';
			} catch (error) {
				console.error('Error cleaning up TTS audio:', error);
			}
		}
	});
</script>

{#if audioError}
	<div class="text-error text-sm">音频加载失败</div>
{:else}
	<audio 
		preload="none" 
		bind:this={storyTTSAudioElement} 
		controls 
		class="m-auto"
		onerror={handleAudioError}
	>
		The "audio" tag is not supported by your browser.
	</audio>
{/if}
