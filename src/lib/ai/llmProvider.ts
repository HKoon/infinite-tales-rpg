import { defaultGeminiJsonConfig, GEMINI_MODELS, GeminiProvider } from '$lib/ai/geminiProvider';
import { LLM, type LLMconfig } from '$lib/ai/llm';
import { PollinationsProvider } from '$lib/ai/pollinationsProvider';
import { OpenAIProvider, OPENAI_MODELS } from '$lib/ai/openaiProvider';

export const defaultLLMConfig: LLMconfig = {
	provider: 'gemini',
	temperature: defaultGeminiJsonConfig.temperature,
	config: defaultGeminiJsonConfig,
	tryAutoFixJSONError: true
};

export class LLMProvider {
	static provideLLM(llmConfig: LLMconfig, useFallback: boolean = false): LLM {
		const configToUse: LLMconfig = { ...defaultLLMConfig, ...llmConfig };
		
		if (configToUse.provider === 'openai') {
			return new OpenAIProvider(configToUse);
		} else if (configToUse.provider === 'pollinations') {
			return new PollinationsProvider({ ...configToUse, model: 'openai' });
		} else {
			//fallback to flash-exp if thinking-exp fails
			return new GeminiProvider(
				configToUse,
				new GeminiProvider(
					configToUse,
					!useFallback
						? undefined
						: new GeminiProvider({ ...configToUse, model: GEMINI_MODELS.FLASH_2_0 })
				)
			);
		}
	}
}
