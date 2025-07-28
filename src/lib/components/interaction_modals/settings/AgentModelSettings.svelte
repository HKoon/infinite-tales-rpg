<script lang="ts">
	import { useLocalStorage } from '$lib/state/useLocalStorage.svelte';
	import type { AIConfig, AgentModelConfig } from '$lib';
	import { OPENAI_MODELS } from '$lib/ai/openaiProvider';
	import { GEMINI_MODELS } from '$lib/ai/geminiProvider';

	let { onclose }: { onclose?: () => void } = $props();

	const aiConfigState = useLocalStorage<AIConfig>('aiConfigState', {
		disableAudioState: false,
		disableImagesState: false,
		useFallbackLlmState: false,
		selectedProvider: 'gemini'
	});

	// 确保agentConfigs存在
	if (!aiConfigState.value.agentConfigs) {
		aiConfigState.value.agentConfigs = {};
	}

	const agentNames = [
		{ key: 'gameAgent', name: '游戏代理 (Game Agent)', description: '处理主要游戏逻辑和故事进展' },
		{ key: 'storyAgent', name: '故事代理 (Story Agent)', description: '生成故事设定和背景' },
		{ key: 'characterAgent', name: '角色代理 (Character Agent)', description: '生成和管理角色描述' },
		{ key: 'characterStatsAgent', name: '角色属性代理 (Character Stats Agent)', description: '管理角色属性和等级' },
		{ key: 'combatAgent', name: '战斗代理 (Combat Agent)', description: '处理战斗逻辑和NPC行动' },
		{ key: 'campaignAgent', name: '战役代理 (Campaign Agent)', description: '管理长期剧情和章节' },
		{ key: 'actionAgent', name: '行动代理 (Action Agent)', description: '生成可选行动建议' },
		{ key: 'summaryAgent', name: '总结代理 (Summary Agent)', description: '管理故事记忆和总结' },
		{ key: 'eventAgent', name: '事件代理 (Event Agent)', description: '处理特殊事件和角色变化' }
	] as const;

	function getAgentConfig(agentKey: string): AgentModelConfig {
		const config = aiConfigState.value.agentConfigs?.[agentKey as keyof NonNullable<AIConfig['agentConfigs']>];
		return config || { useGlobalConfig: true };
	}

	function updateAgentConfig(agentKey: string, config: AgentModelConfig) {
		if (!aiConfigState.value.agentConfigs) {
			aiConfigState.value.agentConfigs = {};
		}
		aiConfigState.value.agentConfigs[agentKey as keyof NonNullable<AIConfig['agentConfigs']>] = config;
		aiConfigState.value = { ...aiConfigState.value };
	}

	function getAvailableModels(provider: string): string[] {
		switch (provider) {
			case 'openai':
				return OPENAI_MODELS;
			case 'gemini':
				return GEMINI_MODELS;
			case 'pollinations':
				return ['openai', 'claude-3.5-sonnet', 'llama-3.1-70b'];
			default:
				return [];
		}
	}
</script>

<dialog open class="modal z-50" style="background: rgba(0, 0, 0, 0.3);">
	<div class="modal-box max-w-4xl flex flex-col">
		<h3 class="text-lg font-bold mb-4">Agent模型配置</h3>
		<p class="text-sm text-base-content/70 mb-6">
			为每个Agent配置独立的AI模型。如果启用"使用全局配置"，则该Agent将使用主设置页面的配置。
		</p>

		<div class="overflow-y-auto max-h-96 space-y-6">
			{#each agentNames as agent}
				{@const config = getAgentConfig(agent.key)}
				<div class="border border-base-300 rounded-lg p-4">
					<div class="flex items-center justify-between mb-3">
						<div>
							<h4 class="font-semibold">{agent.name}</h4>
							<p class="text-xs text-base-content/60">{agent.description}</p>
						</div>
						<label class="flex items-center gap-2">
							<span class="text-sm">使用全局配置</span>
							<input
								type="checkbox"
								class="toggle toggle-sm"
								checked={config.useGlobalConfig}
								onchange={(e) => {
									updateAgentConfig(agent.key, {
										...config,
										useGlobalConfig: e.currentTarget.checked
									});
								}}
							/>
						</label>
					</div>

					{#if !config.useGlobalConfig}
						<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
							<!-- Provider Selection -->
							<label class="form-control">
								<span class="label-text text-sm">AI提供者</span>
								<select
									class="select select-bordered select-sm"
									value={config.provider || aiConfigState.value.selectedProvider || 'gemini'}
									onchange={(e) => {
										updateAgentConfig(agent.key, {
											...config,
											provider: e.currentTarget.value as 'gemini' | 'openai' | 'pollinations'
										});
									}}
								>
									<option value="gemini">Google Gemini</option>
									<option value="openai">OpenAI</option>
									<option value="pollinations">Pollinations</option>
								</select>
							</label>

							<!-- Model Selection -->
							<label class="form-control">
								<span class="label-text text-sm">模型</span>
								<select
									class="select select-bordered select-sm"
									value={config.model || ''}
									onchange={(e) => {
										updateAgentConfig(agent.key, {
											...config,
											model: e.currentTarget.value
										});
									}}
								>
									<option value="">默认模型</option>
									{#each getAvailableModels(config.provider || aiConfigState.value.selectedProvider || 'gemini') as model}
										<option value={model}>{model}</option>
									{/each}
								</select>
							</label>

							<!-- Temperature -->
							<label class="form-control">
								<span class="label-text text-sm">
									Temperature: {(config.temperature ?? 1).toFixed(2)}
								</span>
								<input
									type="range"
									min="0"
									max="2"
									step="0.05"
									class="range range-sm"
									value={config.temperature ?? 1}
									oninput={(e) => {
										updateAgentConfig(agent.key, {
											...config,
											temperature: parseFloat(e.currentTarget.value)
										});
									}}
								/>
							</label>
						</div>
					{:else}
						<div class="text-sm text-base-content/50 italic">
							使用全局配置: {aiConfigState.value.selectedProvider || 'gemini'} - {aiConfigState.value.openaiModel || 'gemini-1.5-flash'}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<div class="modal-action mt-6">
			<button class="btn btn-primary" onclick={onclose}>保存设置</button>
		</div>
	</div>
</dialog>