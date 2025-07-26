<script lang="ts">
	import { goto } from '$app/navigation';
	import { errorState } from '$lib/state/errorState.svelte';
	import NetworkTroubleshootingModal from '$lib/components/NetworkTroubleshootingModal.svelte';
	let dialog;
	let { onclose } = $props();

	function showTroubleshooting() {
		errorState.showTroubleshooting = true;
	}

	function closeTroubleshooting() {
		errorState.showTroubleshooting = false;
	}
</script>

{#if errorState.showTroubleshooting}
	<NetworkTroubleshootingModal onclose={closeTroubleshooting} />
{/if}

<dialog
	bind:this={dialog}
	{onclose}
	class="modal z-[1000]"
	open
	style="background: rgba(0, 0, 0, 0.3);"
>
	<div class="modal-box flex flex-col">
		<span class="text-center font-bold">
			{errorState.isNetworkError ? '🌐 网络连接错误' : 'Error'}
		</span>
		<span class="mt-2 max-w-sm break-words sm:max-w-md whitespace-pre-line">{errorState.userMessage}</span>
		
		{#if errorState.isNetworkError}
			<div class="mt-4 space-y-2">
				<button
					class="btn btn-warning w-full"
					onclick={showTroubleshooting}
				>
					🔧 故障排除指南
				</button>
				<button
					class="btn btn-success w-full"
					onclick={() => window.location.reload()}
				>
					🔄 刷新页面重试
				</button>
			</div>
		{:else if errorState.exception && errorState.retryable}
			<span class="mt-3 font-bold">
				Please retry the action or reload the page. If the error persists report it in the Discord.
			</span>
		{/if}
		
		<div class="mt-3 space-y-2">
			<button
				class="btn btn-info w-full"
				onclick={() => {
					dialog.close();
					errorState.clear();
					goto('/game/settings/ai');
				}}
			>
				{errorState.isNetworkError ? '⚙️ 检查API设置' : 'Go To Settings'}
			</button>
			<button
				class="btn btn-neutral w-full"
				onclick={() => {
					dialog.close();
					errorState.clear();
				}}
			>
				关闭
			</button>
		</div>
	</div>
</dialog>
