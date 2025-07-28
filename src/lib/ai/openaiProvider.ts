import { handleError } from '../util.svelte';
import { JsonFixingInterceptorAgent } from './agents/jsonFixingInterceptorAgent';
import {
	LLM,
	type LLMconfig,
	type LLMMessage,
	type LLMRequest,
	LANGUAGE_PROMPT,
	type ContentWithThoughts
} from '$lib/ai/llm';
import { errorState } from '$lib/state/errorState.svelte';
import { OpenAIStreamStoryExtractor, AdvancedStoryExtractor, SimpleStoryExtractor } from './openaiStreamStoryExtractor.js';

export const OPENAI_MODELS = {
	GPT_4O: 'gpt-4o',
	GPT_4O_MINI: 'gpt-4o-mini',
	GPT_4_TURBO: 'gpt-4-turbo',
	GPT_3_5_TURBO: 'gpt-3.5-turbo'
};

export const defaultOpenAIConfig = {
	temperature: 1,
	max_tokens: 4000,
	top_p: 1,
	frequency_penalty: 0,
	presence_penalty: 0
};

interface OpenAIMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
		finish_reason: string;
	}>;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export class OpenAIProvider extends LLM {
	jsonFixingInterceptorAgent: JsonFixingInterceptorAgent;
	fallbackLLM?: LLM;
	baseUrl: string;

	constructor(llmConfig: LLMconfig, fallbackLLM?: LLM) {
		super(llmConfig);
		if (!llmConfig.apiKey) {
			errorState.userMessage = 'Please enter your OpenAI API Key first in the settings.';
		}
		this.baseUrl = llmConfig.baseUrl || 'https://api.openai.com/v1';
		this.jsonFixingInterceptorAgent = new JsonFixingInterceptorAgent(this);
		this.fallbackLLM = fallbackLLM;
	}

	getDefaultTemperature(): number {
		return defaultOpenAIConfig.temperature;
	}

	getMaxTemperature(): number {
		return 2;
	}

	private convertMessages(historyMessages: Array<LLMMessage> = []): Array<OpenAIMessage> {
		return historyMessages.map(msg => ({
			role: msg.role === 'model' ? 'assistant' : 'user',
			content: msg.content
		}));
	}

	private async makeOpenAIRequest(
		messages: Array<OpenAIMessage>,
		temperature: number,
		model: string,
		stream: boolean = false
	): Promise<OpenAIResponse> {
		const requestBody = {
			model,
			messages,
			temperature,
			max_tokens: defaultOpenAIConfig.max_tokens,
			top_p: defaultOpenAIConfig.top_p,
			frequency_penalty: defaultOpenAIConfig.frequency_penalty,
			presence_penalty: defaultOpenAIConfig.presence_penalty,
			stream
		};

		const response = await fetch(`${this.baseUrl}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.llmConfig.apiKey}`
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
		}

		return await response.json();
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
					if (error.message.includes('401') || 
						error.message.includes('403') ||
						error.message.includes('invalid_api_key')) {
						throw error;
					}
				}
				
				// If this is the last attempt, throw the error
				if (attempt === maxRetries) {
					throw lastError;
				}
				
				// Wait before retrying with exponential backoff
				const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
				console.log(`OpenAI API call failed, retrying in ${delay.toFixed(0)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
				console.log(`Error: ${lastError.message}`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
		
		throw lastError!;
	}

	private async handleOpenAIError(
		e: unknown,
		request: LLMRequest,
		fallbackMethod: (request: LLMRequest) => Promise<any>
	): Promise<any> {
		if (e instanceof Error) {
			if (e.message.includes('401') || e.message.includes('invalid_api_key')) {
				e.message = 'Invalid OpenAI API Key. Please check your API key in the settings.';
				handleError(e as unknown as string);
				return undefined;
			}
			if (e.message.includes('429')) {
				e.message = 'OpenAI rate limit exceeded. Please try again later.';
			}
			if (e.message.includes('503') || e.message.includes('500')) {
				e.message = 'OpenAI service is currently unavailable. Please try again later.';
			}
			
			// Handle network connection issues
			if (
				e.message.includes('Failed to fetch') ||
				e.message.includes('NetworkError') ||
				e.message.includes('TypeError: Failed to fetch') ||
				e.message.includes('fetch failed') ||
				e.message.includes('ERR_NETWORK') ||
				e.message.includes('ERR_INTERNET_DISCONNECTED')
			) {
				console.error('Network error detected:', e.message);
				if (!this.fallbackLLM) {
					const networkErrorMessage =
						'网络连接失败！这可能是由于以下原因：\n' +
						'1. **网络连接问题**：请检查您的网络连接是否正常。\n' +
						'2. **浏览器扩展程序**：某些浏览器扩展程序（如广告拦截器或安全插件）可能会干扰网络请求。\n' +
						'3. **防火墙或代理**：公司或个人防火墙/代理设置可能会阻止对 OpenAI API 的访问。\n' +
						'4. **CORS 策略**：如果直接在浏览器中调用，浏览器的同源策略可能会阻止请求。';

					errorState.setNetworkError(networkErrorMessage);
					return undefined;
				} else {
					e.message = 'Network request failed. Attempting to use fallback LLM.';
				}
			}
			
			if (this.fallbackLLM) {
				console.log('Using fallback LLM for error: ', e.message);
				const fallbackResult = await fallbackMethod(request);
				if (!fallbackResult) {
					handleError(e as unknown as string);
				} else {
					if (this.llmConfig.returnFallbackProperty || request.returnFallbackProperty) {
						if (fallbackResult.content) {
							fallbackResult.content['fallbackUsed'] = true;
						}
					}
				}
				return fallbackResult;
			} else {
				handleError(e as unknown as string);
			}
		}
		return undefined;
	}

	async generateContent(request: LLMRequest): Promise<ContentWithThoughts | undefined> {
		try {
			const modelToUse = request.model || this.llmConfig.model || OPENAI_MODELS.GPT_4O;
			const temperatureToUse = request.temperature ?? this.llmConfig.temperature ?? this.getDefaultTemperature();

			// Build messages array
			const messages: Array<OpenAIMessage> = [];
			
			// Add system instruction if provided
			if (request.systemInstruction) {
				const systemContent = Array.isArray(request.systemInstruction) 
					? request.systemInstruction.join('\n') 
					: request.systemInstruction;
				messages.push({
					role: 'system',
					content: systemContent
				});
			}

			// Add history messages
			if (request.historyMessages) {
				messages.push(...this.convertMessages(request.historyMessages));
			}

			// Add language instruction if configured
			let userMessage = request.userMessage;
			if (this.llmConfig.language) {
				userMessage = LANGUAGE_PROMPT + this.llmConfig.language + '\n\n' + userMessage;
			}

			// Add user message
			messages.push({
				role: 'user',
				content: userMessage
			});

			const response = await this.retryWithBackoff(() => 
				this.makeOpenAIRequest(messages, temperatureToUse, modelToUse)
			);

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error('No content received from OpenAI API');
			}

			// Try to parse as JSON if auto-fix is enabled
			let parsedContent: object;
			if (request.tryAutoFixJSONError || this.llmConfig.tryAutoFixJSONError) {
				try {
					parsedContent = JSON.parse(content);
				} catch (jsonError) {
					// Use JSON fixing interceptor
					console.log('Try json fix with llm agent');
					const fixedContent = await this.jsonFixingInterceptorAgent.fixJSON(
						content,
						(jsonError as SyntaxError).message
					);
					if (fixedContent) {
						parsedContent = fixedContent;
					} else {
						throw new Error(`Failed to parse JSON response: ${content}`);
					}
				}
			} else {
				try {
					parsedContent = JSON.parse(content);
				} catch {
					// If not JSON, return as plain text wrapped in object
					parsedContent = { text: content };
				}
			}

			return {
				thoughts: '', // OpenAI doesn't have separate thoughts like Gemini
				content: parsedContent
			};

		} catch (e) {
			return await this.handleOpenAIError(e, request, this.generateContent.bind(this));
		}
	}

	async generateContentStream(
		request: LLMRequest,
		storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void,
		thoughtUpdateCallback?: (thoughtChunk: string, isComplete: boolean) => void
	): Promise<object | undefined> {
		try {
			const modelToUse = request.model || this.llmConfig.model || OPENAI_MODELS.GPT_4O;
			const temperatureToUse = request.temperature ?? this.llmConfig.temperature ?? this.getDefaultTemperature();

			// Build messages array (same as generateContent)
			const messages: Array<OpenAIMessage> = [];
			
			if (request.systemInstruction) {
				const systemContent = Array.isArray(request.systemInstruction) 
					? request.systemInstruction.join('\n') 
					: request.systemInstruction;
				messages.push({
					role: 'system',
					content: systemContent
				});
			}

			if (request.historyMessages) {
				messages.push(...this.convertMessages(request.historyMessages));
			}

			let userMessage = request.userMessage;
			if (this.llmConfig.language) {
				userMessage = LANGUAGE_PROMPT + this.llmConfig.language + '\n\n' + userMessage;
			}

			messages.push({
				role: 'user',
				content: userMessage
			});

			// Make streaming request
			const requestBody = {
				model: modelToUse,
				messages,
				temperature: temperatureToUse,
				max_tokens: defaultOpenAIConfig.max_tokens,
				top_p: defaultOpenAIConfig.top_p,
				frequency_penalty: defaultOpenAIConfig.frequency_penalty,
				presence_penalty: defaultOpenAIConfig.presence_penalty,
				stream: true
			};

			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.llmConfig.apiKey}`
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
			}

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('Failed to get response stream reader');
			}

			let fullContent = '';
			const decoder = new TextDecoder();

			// 创建高级story提取器，支持复杂JSON结构
			const storyExtractor = new AdvancedStoryExtractor(storyUpdateCallback);
			
			console.log('🚀 Starting OpenAI stream with story extraction');

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						// 流结束时强制完成story提取
						storyExtractor.forceComplete();
						break;
					}

					const chunk = decoder.decode(value);
					const lines = chunk.split('\n');

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6);
							if (data === '[DONE]') {
								storyExtractor.forceComplete();
								break;
							}

							try {
								const parsed = JSON.parse(data);
								const content = parsed.choices?.[0]?.delta?.content;
								if (content) {
									fullContent += content;
									// 使用story提取器处理内容，只显示story字段
									storyExtractor.processChunk(content);
								}
							} catch (e) {
								// Ignore parsing errors for individual chunks
								console.warn('Failed to parse OpenAI stream chunk:', e);
							}
						}
					}
				}
			} finally {
				reader.releaseLock();
			}

			console.log('✅ OpenAI stream completed');

			// Try to parse the full content as JSON
			try {
				const parsedJson = JSON.parse(fullContent);
				console.log('📄 Successfully parsed complete JSON from OpenAI stream');
				return parsedJson;
			} catch (jsonError) {
				console.warn('Failed to parse complete JSON, attempting fallback:', jsonError);
				
				// 尝试使用JSON修复代理
				if (this.llmConfig.tryAutoFixJSONError) {
					try {
						console.log('🔧 Attempting JSON repair with interceptor agent');
						const fixedContent = await this.jsonFixingInterceptorAgent.fixJSON(
							fullContent,
							(jsonError as SyntaxError).message
						);
						if (fixedContent) {
							return fixedContent;
						}
					} catch (fixError) {
						console.error('JSON repair failed:', fixError);
					}
				}
				
				// 最后的回退方案
				return { text: fullContent };
			}

		} catch (e) {
			return await this.handleOpenAIError(e, request, 
				(req) => this.generateContentStream(req, storyUpdateCallback, thoughtUpdateCallback)
			);
		}
	}
}