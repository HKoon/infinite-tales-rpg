// place files you want to import through the `$lib` alias in this folder.

export type AgentModelConfig = {
	provider?: 'gemini' | 'openai' | 'pollinations';
	model?: string;
	temperature?: number;
	useGlobalConfig?: boolean; // 如果为true，则使用全局配置
};

export type AIConfig = {
	disableAudioState: boolean;
	disableImagesState: boolean;
	useFallbackLlmState: boolean;
	// OpenAI configuration
	openaiApiKey?: string;
	openaiBaseUrl?: string;
	openaiModel?: string;
	// Provider selection
	selectedProvider?: 'gemini' | 'openai' | 'pollinations';
	// Agent-specific configurations
	agentConfigs?: {
		gameAgent?: AgentModelConfig;
		storyAgent?: AgentModelConfig;
		characterAgent?: AgentModelConfig;
		characterStatsAgent?: AgentModelConfig;
		combatAgent?: AgentModelConfig;
		campaignAgent?: AgentModelConfig;
		actionAgent?: AgentModelConfig;
		summaryAgent?: AgentModelConfig;
		eventAgent?: AgentModelConfig;
	};
};
