import type { LLMconfig } from './llm';
import type { AIConfig, AgentModelConfig } from '$lib';

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
	} else if (provider === 'gemini') {
		config.apiKey = apiKeyState;
		config.model = 'gemini-1.5-flash';
	} else if (provider === 'pollinations') {
		config.model = 'openai';
	}

	config.tryAutoFixJSONError = true;
	return config;
}

/**
 * 为特定agent创建LLM配置
 * 如果agent有独立配置则使用，否则使用全局配置
 */
export function createAgentLLMConfig(
	agentName: keyof NonNullable<AIConfig['agentConfigs']>,
	aiConfigState: AIConfig,
	apiKeyState: string,
	aiLanguage: string,
	globalTemperature: number = 2
): LLMconfig {
	const agentConfig = aiConfigState.agentConfigs?.[agentName];
	
	// 如果agent配置存在且不使用全局配置
	if (agentConfig && !agentConfig.useGlobalConfig) {
		const provider = agentConfig.provider || aiConfigState.selectedProvider || 'gemini';
		const temperature = agentConfig.temperature ?? globalTemperature;
		
		let config: LLMconfig = {
			temperature,
			language: aiLanguage,
			provider: provider
		};

		if (provider === 'openai') {
			config.apiKey = aiConfigState.openaiApiKey;
			config.baseUrl = aiConfigState.openaiBaseUrl || 'https://api.openai.com/v1';
			config.model = agentConfig.model || aiConfigState.openaiModel || 'gpt-4o';
		} else if (provider === 'gemini') {
			config.apiKey = apiKeyState;
			config.model = agentConfig.model || 'gemini-1.5-flash';
		} else if (provider === 'pollinations') {
			config.model = agentConfig.model || 'openai';
		}

		config.tryAutoFixJSONError = true;
		return config;
	}
	
	// 使用全局配置
	return createLLMConfig(aiConfigState, apiKeyState, aiLanguage, globalTemperature);
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