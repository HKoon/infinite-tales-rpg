<script lang="ts">
	let { loadingText = 'GM is thinking...' } = $props();
</script>

<div class="ai-reply-loading">
	<div class="loading-container">
		<div class="typing-indicator">
			<div class="dot"></div>
			<div class="dot"></div>
			<div class="dot"></div>
		</div>
		<span class="loading-text">{loadingText}</span>
	</div>
</div>

<style>
	.ai-reply-loading {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 1rem;
		margin: 1rem auto;
		max-width: fit-content;
		background: hsl(var(--b2));
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
		font-family: 'Noto Sans', sans-serif;
	}

	.loading-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.typing-indicator {
		display: flex;
		gap: 0.25rem;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: hsl(var(--bc) / 0.6);
		animation: typing 1.4s infinite ease-in-out;
	}

	.dot:nth-child(1) {
		animation-delay: 0s;
	}

	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}

	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}

	.loading-text {
		color: hsl(var(--bc) / 0.7);
		font-size: 0.875rem;
		font-style: italic;
	}

	@keyframes typing {
		0%, 60%, 100% {
			transform: translateY(0);
			opacity: 0.4;
		}
		30% {
			transform: translateY(-6px);
			opacity: 1;
		}
	}
</style>