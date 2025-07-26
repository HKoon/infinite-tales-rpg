import { handleError } from '../util.svelte';
import {
	type Content,
	type GenerateContentResponse,
	type GenerationConfig,
	GoogleGenAI,
	HarmBlockThreshold,
	HarmCategory,
	type Part,
	type SafetySetting
} from '@google/genai';
import { JsonFixingInterceptorAgent } from './agents/jsonFixingInterceptorAgent';
import {
	LLM,
	type LLMconfig,
	type LLMMessage,
	type LLMRequest,
	LANGUAGE_PROMPT
} from '$lib/ai/llm';
import {
	errorState,
	getIsGeminiThinkingOverloaded,
	setIsGeminiFlashExpOverloaded,
	setIsGeminiThinkingOverloaded
} from '$lib/state/errorState.svelte';
import { requestLLMJsonStream } from './jsonStreamHelper';

export const GEMINI_MODELS = {
	FLASH_THINKING_2_5: 'gemini-2.5-flash-preview-05-20',
	FLASH_THINKING_2_0: 'gemini-2.0-flash-thinking-exp-01-21',
	FLASH_2_0: 'gemini-2.0-flash'
};

//Numbe of tokens
export const THINKING_BUDGET = {
	FAST: 256
};

const safetySettings: Array<SafetySetting> = [
	{
		category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_HARASSMENT,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
		threshold: HarmBlockThreshold.BLOCK_NONE
	},
	{
		category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
		threshold: HarmBlockThreshold.BLOCK_NONE
	}
];

export const defaultGeminiJsonConfig: GenerationConfig = {
	temperature: 1,
	responseMimeType: 'text/plain'
};

export const getThoughtsFromResponse = (response: GenerateContentResponse): string => {
	let thoughts = '';
	let responsePart;
	if (response?.candidates?.[0]?.content?.parts?.length || 0 > 0) {
		responsePart = response!.candidates![0].content!.parts![0];
	}
	if (responsePart?.thought) {
		thoughts = responsePart?.text || '';
	}
	return thoughts;
};

export class GeminiProvider extends LLM {
	genAI: GoogleGenAI;
	jsonFixingInterceptorAgent: JsonFixingInterceptorAgent;
	fallbackLLM?: LLM;

	constructor(llmConfig: LLMconfig, fallbackLLM?: LLM) {
		super(llmConfig);
		if (!llmConfig.apiKey) {
			errorState.userMessage = 'Please enter your Google Gemini API Key first in the settings.';
		}
		this.genAI = new GoogleGenAI({ apiKey: this.llmConfig.apiKey || '' });
		this.jsonFixingInterceptorAgent = new JsonFixingInterceptorAgent(this);
		this.fallbackLLM = fallbackLLM;
	}

	getDefaultTemperature(): number {
		return defaultGeminiJsonConfig.temperature as number;
	}

	getMaxTemperature(): number {
		return 2;
	}

	private async retryWithBackoff<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000
	): Promise<T> {
		let lastError: Error;
		
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error as Error;
				
				// Don't retry for certain types of errors
				if (error instanceof Error) {
					if (error.message.includes('API key not valid') || 
						error.message.includes('429') ||
						error.message.includes('401')) {
						throw error;
					}
				}
				
				// If this is the last attempt, throw the error
				if (attempt === maxRetries) {
					throw lastError;
				}
				
				// Wait before retrying with exponential backoff
				const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
				console.log(`API call failed, retrying in ${delay.toFixed(0)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
				console.log(`Error: ${lastError.message}`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError!;
	}

	private shouldEarlyFallback(modelToUse: string): boolean {
		return this.fallbackLLM !== undefined && this.isThinkingModel(modelToUse) && getIsGeminiThinkingOverloaded();
	}

	private async handleGeminiError(
		e: unknown,
		request: LLMRequest,
		modelToUse: string,
		fallbackMethod: (request: LLMRequest) => Promise<any>
	): Promise<any> {
		if (e instanceof Error) {
			if (e.message.includes('API key not valid')) {
				handleError(e as unknown as string);
				return undefined;
			}
			if (e.message.includes('503') || e.message.includes('500')) {
				if (this.isThinkingModel(modelToUse)) {
					setIsGeminiThinkingOverloaded(true);
				} else {
					setIsGeminiFlashExpOverloaded(true);
				}
				e.message =
					'The Gemini AI is currently overloaded! You can go to the settings and enable the fallback. If you already enabled it and see this, the fallback is also overloaded :(';
			}
			if (e.message.includes('429')) {
				e.message =
					'You have reached the rate limit for the Gemini AI. Please try again in some minutes. If this still appears, the whole daily quota is used up :(';
			}
			// Handle network connection issues and browser extension interference
			if (e.message.includes('Failed to fetch') || 
				e.message.includes('NetworkError') || 
				e.message.includes('TypeError: Failed to fetch') ||
				e.message.includes('fetch failed') ||
				e.message.includes('ERR_NETWORK') ||
				e.message.includes('ERR_INTERNET_DISCONNECTED')) {
				
				console.error('Network error detected:', e.message);
				
				const networkErrorMessage = 
					'网络连接失败！这可能是由于以下原因：\n' +
					'1. 浏览器扩展程序干扰了网络请求（请尝试禁用广告拦截器或其他扩展）\n' +
					'2. 网络连接不稳定\n' +
					'3. 防火墙或代理设置阻止了请求\n' +
					'4. API密钥可能已过期或无效\n' +
					'5. Chrome扩展程序可能正在拦截请求\n\n' +
					'建议解决方案：\n' +
					'- 刷新页面重试\n' +
					'- 检查网络连接\n' +
					'- 暂时禁用浏览器扩展（特别是广告拦截器）\n' +
					'- 尝试使用无痕模式\n' +
					'- 验证API密钥是否正确\n' +
					'- 检查是否有防火墙阻止了请求';
				errorState.setNetworkError(networkErrorMessage);
				return undefined;
			}
			if (this.fallbackLLM) {
				console.log('Fallback LLM for error: ', e.message);
				const fallbackResult = await fallbackMethod(request);
				if (!fallbackResult) {
					handleError(e as unknown as string);
				} else {
					if (this.llmConfig.returnFallbackProperty || request.returnFallbackProperty) {
						if (fallbackResult.content) {
							fallbackResult.content['fallbackUsed'] = true;
						} else {
							fallbackResult['fallbackUsed'] = true;
						}
					}
					return fallbackResult;
				}
			} else {
				handleError(e as unknown as string);
				return undefined;
			}
		}
		handleError(e as string);
		return undefined;
	}

	/**
	 * Fetches a JSON stream, parses it, calls a callback for progressive
	 * updates of the "story" field, and returns the full parsed JSON object.
	 *
	 * @param {LLMRequest} request The LLM request object.
	 * @param {function(storyChunk: string, isComplete: boolean): void} storyUpdateCallback
	 *   A function to be called with updates to the "story" field.
	 *   - storyChunk: The story text parsed so far (or the complete text).
	 *   - isComplete: True if this is the final update for the story, false otherwise.
	 * @returns {Promise<object|null>} A promise that resolves with the fully parsed JSON object,
	 *   or null if parsing fails or the stream is empty/invalid. Rejects on fetch errors.
	 */
	async generateContentStream(
		request: LLMRequest,
		storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void,
		thoughtUpdateCallback?: (thoughtChunk: string, isComplete: boolean) => void
	): Promise<object | undefined> {
		request.stream = true;
		const modelToUse = request.model || this.llmConfig.model || GEMINI_MODELS.FLASH_THINKING_2_5;
		try {
			if (this.shouldEarlyFallback(modelToUse)) {
				throw new Error(
					'Gemini Thinking is overloaded! Fallback early to avoid waiting for the response.'
				);
			}
			// Use retry mechanism for streaming requests as well
			return await this.retryWithBackoff(async () => {
				return await requestLLMJsonStream(request, this, storyUpdateCallback, thoughtUpdateCallback);
			});
		} catch (e) {
			return await this.handleGeminiError(
				e,
				request,
				modelToUse,
				async (req) =>
					await this.fallbackLLM!.generateContentStream(req, storyUpdateCallback, thoughtUpdateCallback)
			);
		}
	}

	isThinkingModel(model: string): boolean {
		return model === GEMINI_MODELS.FLASH_THINKING_2_5;
	}

	supportsThinkingBudget(model: string): boolean {
		return model === GEMINI_MODELS.FLASH_THINKING_2_5;
	}

	supportsReturnThoughts(model: string): boolean {
		return model === GEMINI_MODELS.FLASH_THINKING_2_5 || model === GEMINI_MODELS.FLASH_THINKING_2_0;
	}

	async generateContent(
		request: LLMRequest
	): Promise<{ thoughts: string; content: object } | undefined> {
		if (!this.llmConfig.apiKey) {
			errorState.userMessage = 'Please enter your Google Gemini API Key first in the settings.';
			return;
		}
		const contents = this.buildGeminiContentsFormat(
			request.userMessage,
			request.historyMessages || []
		);
		const systemInstruction = this.buildSystemInstruction(
			request.systemInstruction || this.llmConfig.systemInstruction
		);

		let temperature: number;
		if (request.temperature === 0 || this.llmConfig.temperature === 0) {
			temperature = 0;
		} else {
			temperature = Math.min(
				request.temperature || this.llmConfig.temperature || this.getDefaultTemperature(),
				this.getMaxTemperature()
			);
		}

		const modelToUse = request.model || this.llmConfig.model || GEMINI_MODELS.FLASH_THINKING_2_5;
		if (this.llmConfig.language) {
			const languageInstruction = LANGUAGE_PROMPT + this.llmConfig.language;
			systemInstruction?.parts?.push({ text: languageInstruction });
		}
		let result: GenerateContentResponse;
		try {
			if (this.shouldEarlyFallback(modelToUse)) {
				throw new Error(
					'Gemini Thinking is overloaded! Fallback early to avoid waiting for the response.'
				);
			}
			const config = {
				...this.llmConfig.config,
				...request.config,
				safetySettings,
				systemInstruction,
				temperature
			};
			if (this.supportsThinkingBudget(modelToUse)) {
				config.thinkingConfig = request.thinkingConfig;
			}
			if (this.supportsReturnThoughts(modelToUse)) {
				if (!config.thinkingConfig) {
					config.thinkingConfig = {};
				}
				if (config.thinkingConfig.includeThoughts === undefined) {
					config.thinkingConfig.includeThoughts = true;
				}
			}
			const genAIRequest = {
				model: modelToUse,
				config,
				contents: contents
			};
			if (request.stream) {
				// For streaming requests, also use retry mechanism
				result = await this.retryWithBackoff(async () => {
					return await this.genAI.models.generateContentStream(genAIRequest) as any;
				});
			} else {
				// Use retry mechanism for non-streaming requests
				result = await this.retryWithBackoff(async () => {
					return await this.genAI.models.generateContent(genAIRequest);
				});
			}
		} catch (e) {
			return await this.handleGeminiError(
				e,
				request,
				modelToUse,
				async (req) => await this.fallbackLLM!.generateContent(req)
			);
		}
		try {
			let json: string;
			const thoughts = getThoughtsFromResponse(result);
			if (result.text) {
				json = result.text;
			} else {
				handleError('Gemini did not send a response...');
				return undefined;
			}
			try {
				return {
					thoughts,
					content: JSON.parse(
						json.replaceAll('```json', '').replaceAll('```html', '').replaceAll('```', '').trim()
					)
				};
			} catch (firstError) {
				try {
					console.log('Error parsing JSON: ' + json, firstError);
					console.log('Try json simple fix 1');
					if (
						(firstError as SyntaxError).message.includes('Bad control character in string literal')
					) {
						return { thoughts, content: JSON.parse(json.replaceAll('\\', '')) };
					}
					return { thoughts, content: JSON.parse(json.split('```json')[1].split('```')[0].trim()) };
				} catch (secondError) {
					if (
						(request.tryAutoFixJSONError || request.tryAutoFixJSONError === undefined) &&
						this.llmConfig.tryAutoFixJSONError
					) {
						console.log('Try json fix with llm agent');
						return {
							thoughts: '',
							content: this.jsonFixingInterceptorAgent.fixJSON(
								json,
								(firstError as SyntaxError).message
							)
						};
					}
					handleError(firstError as string);
					return undefined;
				}
			}
		} catch (e) {
			handleError(e as string);
		}
		return undefined;
	}

	buildSystemInstruction(systemInstruction?: Array<string> | string): Content {
		const instruction = { role: 'systemInstruction', parts: [] as Array<Part> };
		if (!systemInstruction) return instruction;
		if (typeof systemInstruction === 'string') {
			instruction.parts.push({ text: systemInstruction });
		} else {
			systemInstruction.forEach((instr) => instruction.parts.push({ text: instr }));
		}
		return instruction;
	}

	buildGeminiContentsFormat(actionText: string, historyMessages: Array<LLMMessage>): Content[] {
		const contents: Content[] = [];
		if (historyMessages) {
			historyMessages.forEach((message) => {
				//TODO why can one of these not be present?
				if (message && message.role && message.content) {
					contents.push({
						role: message.role,
						parts: [{ text: message.content }]
					});
				}
			});
		}
		if (actionText) {
			const message = { role: 'user', content: actionText };
			contents.push({
				role: message.role,
				parts: [{ text: message.content || '' }]
			});
		}
		return contents;
	}
}
