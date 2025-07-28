<script lang="ts">
	import { getTTSUrl } from '$lib/util.svelte';
	import { onDestroy } from 'svelte';

	type Props = { text: string; voice: string; hidden?: boolean };
	let { text, voice }: Props = $props();
	let storyTTSAudioElement: HTMLAudioElement;
	
	// Add error handling for the audio element
	let audioError = $state(false);
	let errorMessage = $state('');
	let retryCount = $state(0);
	const maxRetries = 3;
	
	$effect(() => {
		if (!text) {
			if (storyTTSAudioElement) {
				storyTTSAudioElement.src = '';
			}
			audioError = false;
			errorMessage = '';
			retryCount = 0;
			return;
		}
		
		if (text && storyTTSAudioElement && !voice) {
			audioError = true;
			errorMessage = '未选择TTS语音';
			return;
		}
		
		if (text && storyTTSAudioElement && voice) {
			try {
				storyTTSAudioElement.currentTime = 0;
				storyTTSAudioElement.src = getTTSUrl(text, voice);
				audioError = false;
				errorMessage = '';
			} catch (error) {
				console.error('Error setting TTS audio source:', error);
				audioError = true;
				errorMessage = '设置音频源失败';
			}
		}
	});

	// Add error event handler
	function handleAudioError(event: Event) {
		console.error('TTS Audio error:', event);
		const target = event.target as HTMLAudioElement;
		
		if (target && target.error) {
			switch (target.error.code) {
				case MediaError.MEDIA_ERR_ABORTED:
					errorMessage = '音频播放被中止';
					break;
				case MediaError.MEDIA_ERR_NETWORK:
					errorMessage = '网络错误，无法加载音频';
					break;
				case MediaError.MEDIA_ERR_DECODE:
					errorMessage = '音频解码错误';
					break;
				case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
					errorMessage = '不支持的音频格式';
					break;
				default:
					errorMessage = '音频加载失败';
			}
		} else {
			errorMessage = '音频加载失败';
		}
		
		audioError = true;
		retryCount++;
	}

	// Add retry function
	function retryAudio() {
		if (retryCount < maxRetries && text && voice) {
			audioError = false;
			errorMessage = '';
			if (storyTTSAudioElement) {
				storyTTSAudioElement.src = getTTSUrl(text, voice);
			}
		}
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
	<div class="flex flex-col gap-2 p-2 bg-error/10 rounded">
		<div class="text-error text-sm">{errorMessage}</div>
		{#if retryCount < maxRetries}
			<button 
				class="btn btn-xs btn-outline btn-error" 
				onclick={retryAudio}
			>
				重试 ({retryCount}/{maxRetries})
			</button>
		{:else}
			<div class="text-xs text-gray-500">已达到最大重试次数</div>
		{/if}
	</div>
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
