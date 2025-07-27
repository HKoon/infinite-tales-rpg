import type { LLMconfig } from './llm';
import type { AIConfig } from '$lib';

/**
 * 创建LLM配置的辅助函数
 * 根据选择的提供者和存储的配置创建正确的LLM配置
 */
export function createLLMConfig(
	aiConfigState: AIConfig,
	apiKeyState: string,
	aiLanguage: string,
	temperature: number = 2
): LLMconfig {
	const provider = aiConfigState.selectedProvider || 'gemini';
	
	let config: LLMconfig = {
		temperature,
		language: aiLanguage,
		provider: provider
	};

	if (provider === 'openai') {
		config.apiKey = aiConfigState.openaiApiKey;
		config.baseUrl = aiConfigState.openaiBaseUrl || 'https://api.openai.com/v1';
		config.model = aiConfigState.openaiModel || 'gpt-4o';
	} else {
		config.apiKey = apiKeyState;
	}

	return config;
}

/**
 * 检查是否有有效的API密钥
 */
export function hasValidApiKey(aiConfigState: AIConfig, apiKeyState: string): boolean {
	const provider = aiConfigState.selectedProvider || 'gemini';
	
	if (provider === 'openai') {
		return !!aiConfigState.openaiApiKey;
	} else if (provider === 'pollinations') {
		return true; // Pollinations不需要API密钥
	} else {
		return !!apiKeyState;
	}
}