// place files you want to import through the `$lib` alias in this folder.

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
};
