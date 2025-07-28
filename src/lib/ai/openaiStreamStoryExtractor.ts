/**
 * OpenAI流式Story提取器
 * 专门用于从OpenAI的流式JSON输出中实时提取story字段内容
 * 支持复杂的JSON结构，包括嵌套对象和数组
 */
export class OpenAIStreamStoryExtractor {
	private accumulatedText = '';
	private storyStartFound = false;
	private storyContent = '';
	private bracketDepth = 0;
	private inString = false;
	private escapeNext = false;
	private storyFieldComplete = false;
	private lastStoryUpdate = '';

	constructor(
		private storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void
	) {}

	/**
	 * 处理新的文本块
	 */
	processChunk(chunk: string): void {
		this.accumulatedText += chunk;
		
		// 如果story字段已经完成，不再处理
		if (this.storyFieldComplete) {
			return;
		}

		// 逐字符分析
		for (let i = 0; i < chunk.length; i++) {
			const char = chunk[i];
			this.processCharacter(char);
		}
	}

	private processCharacter(char: string): void {
		// 如果story字段已经完成，停止处理
		if (this.storyFieldComplete) {
			return;
		}

		// 处理转义字符
		if (this.escapeNext) {
			if (this.storyStartFound && this.inString) {
				this.storyContent += char;
				this.updateStoryCallback();
			}
			this.escapeNext = false;
			return;
		}

		if (char === '\\') {
			this.escapeNext = true;
			if (this.storyStartFound && this.inString) {
				this.storyContent += char;
				this.updateStoryCallback();
			}
			return;
		}

		// 处理字符串状态
		if (char === '"') {
			if (!this.storyStartFound) {
				// 寻找story字段
				this.checkForStoryField();
			} else if (this.inString) {
				// story字段的字符串结束
				this.inString = false;
				this.completeStoryField();
				return;
			} else {
				// story字段的字符串开始
				this.inString = true;
			}
			return;
		}

		// 如果在story字段的字符串内容中
		if (this.storyStartFound && this.inString) {
			this.storyContent += char;
			this.updateStoryCallback();
			return;
		}

		// 处理括号深度（用于检测字段边界）
		if (char === '{') {
			this.bracketDepth++;
		} else if (char === '}') {
			this.bracketDepth--;
		}
	}

	private checkForStoryField(): void {
		// 更精确的story字段检测，支持多种格式
		const patterns = [
			/"story"\s*:\s*"$/,           // 标准格式: "story": "
			/"story"\s*:\s*$/,            // 等待引号: "story": 
		];

		for (const pattern of patterns) {
			if (pattern.test(this.accumulatedText)) {
				this.storyStartFound = true;
				this.inString = true;
				console.log('🎯 Found story field start in OpenAI stream');
				break;
			}
		}
	}

	private updateStoryCallback(): void {
		// 只发送新增的内容，避免重复
		if (this.storyContent !== this.lastStoryUpdate) {
			const newContent = this.storyContent.slice(this.lastStoryUpdate.length);
			if (newContent) {
				this.storyUpdateCallback(newContent, false);
				this.lastStoryUpdate = this.storyContent;
			}
		}
	}

	private completeStoryField(): void {
		// story字段完成
		this.storyFieldComplete = true;
		// 发送最终的完整内容标记
		this.storyUpdateCallback('', true);
		console.log('✅ Story field extraction completed, total length:', this.storyContent.length);
	}

	/**
	 * 获取当前提取的story内容
	 */
	getCurrentStoryContent(): string {
		return this.storyContent;
	}

	/**
	 * 检查story字段是否已完成
	 */
	isStoryComplete(): boolean {
		return this.storyFieldComplete;
	}

	/**
	 * 重置提取器状态
	 */
	reset(): void {
		this.accumulatedText = '';
		this.storyStartFound = false;
		this.storyContent = '';
		this.bracketDepth = 0;
		this.inString = false;
		this.escapeNext = false;
		this.storyFieldComplete = false;
		this.lastStoryUpdate = '';
	}

	/**
	 * 强制完成（用于流结束时）
	 */
	forceComplete(): string {
		if (this.storyStartFound && !this.storyFieldComplete) {
			this.storyFieldComplete = true;
			this.storyUpdateCallback('', true);
			console.log('🔚 Force completed story extraction, final content length:', this.storyContent.length);
		}
		return this.storyContent;
	}
}

/**
 * 高级正则表达式版本的story提取器
 * 支持复杂JSON结构，包括数组和嵌套对象
 */
export class AdvancedStoryExtractor {
	private accumulatedText = '';
	private lastStoryLength = 0;
	private storyComplete = false;

	constructor(
		private storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void
	) {}

	processChunk(chunk: string): void {
		if (this.storyComplete) return;

		console.log('AdvancedStoryExtractor: Processing chunk of length:', chunk.length);
		// 将新的chunk添加到累积的文本中
		this.accumulatedText += chunk;

		// 尝试提取JSON对象
		try {
			// 使用更灵活的方式来查找和提取story内容
			let startIndex = this.accumulatedText.indexOf('"story"');
			if (startIndex !== -1) {
				// 找到story字段后的冒号
				let colonIndex = this.accumulatedText.indexOf(':', startIndex);
				if (colonIndex !== -1) {
					// 找到冒号后的第一个引号
					let contentStart = this.accumulatedText.indexOf('"', colonIndex);
					if (contentStart !== -1) {
						contentStart++; // 移过开始引号
						console.log('🎯 Found story field start, beginning stream output');
						
						// 获取当前可用的内容（不需要等待结束引号）
						let currentContent = this.accumulatedText.substring(contentStart);
						
						// 检查是否有结束引号
						let contentEnd = -1;
						let i = 0;
						let isEscaped = false;

						while (i < currentContent.length) {
							if (currentContent[i] === '\\') {
								isEscaped = !isEscaped;
								i++;
								continue;
							}
							
							if (currentContent[i] === '"' && !isEscaped) {
								contentEnd = i;
								break;
							}
							
							if (currentContent[i] !== '\\') {
								isEscaped = false;
							}
							
							i++;
						}

						// 如果找到结束引号，只处理到结束引号的内容
						let storyContent;
						if (contentEnd !== -1) {
							storyContent = currentContent.substring(0, contentEnd);
							this.storyComplete = true;
						} else {
							// 没有找到结束引号，处理所有可用内容
							storyContent = currentContent;
						}
						
						const unescapedContent = this.unescapeJsonString(storyContent);
						
						// 只发送新的内容
						if (unescapedContent.length > this.lastStoryLength) {
							const newContent = unescapedContent.slice(this.lastStoryLength);
							console.log('📤 Sending story chunk:', newContent.substring(0, 50) + (newContent.length > 50 ? '...' : ''));
							this.storyUpdateCallback(newContent, this.storyComplete);
							this.lastStoryLength = unescapedContent.length;
						}

						// 如果已完成，发送完成信号
						if (this.storyComplete) {
							console.log('✅ Story field completed');
						}
					}
				}
			}
		} catch (error) {
			console.warn('Error processing story chunk:', error);
		}
	}

	private unescapeJsonString(str: string): string {
		return str
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\r')
			.replace(/\\t/g, '\t')
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, '\\');
	}

	private isStoryFieldComplete(matchedText: string): boolean {
		// 检查匹配的文本是否以完整的引号结尾
		return matchedText.endsWith('"') && !matchedText.endsWith('\\"');
	}

	forceComplete(): void {
		if (!this.storyComplete) {
			this.storyComplete = true;
			this.storyUpdateCallback('', true);
		}
	}

	reset(): void {
		this.accumulatedText = '';
		this.lastStoryLength = 0;
		this.storyComplete = false;
	}
}

/**
 * 简化版本的story提取器，使用正则表达式方法
 * 适用于较简单的场景
 */
export class SimpleStoryExtractor {
	private accumulatedText = '';
	private lastStoryLength = 0;

	constructor(
		private storyUpdateCallback: (storyChunk: string, isComplete: boolean) => void
	) {}

	processChunk(chunk: string): void {
		this.accumulatedText += chunk;
		this.extractStoryContent();
	}

	private extractStoryContent(): void {
		// 使用正则表达式匹配story字段
		const storyMatch = this.accumulatedText.match(/"story"\s*:\s*"((?:[^"\\]|\\.)*)"/);
		
		if (storyMatch) {
			const currentStory = storyMatch[1]
				.replace(/\\n/g, '\n')
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\');
			
			// 只发送新增的内容
			if (currentStory.length > this.lastStoryLength) {
				const newContent = currentStory.slice(this.lastStoryLength);
				this.storyUpdateCallback(newContent, false);
				this.lastStoryLength = currentStory.length;
			}
		}
	}

	forceComplete(): void {
		// 尝试最终提取
		const storyMatch = this.accumulatedText.match(/"story"\s*:\s*"((?:[^"\\]|\\.)*)"/);
		if (storyMatch) {
			const finalStory = storyMatch[1]
				.replace(/\\n/g, '\n')
				.replace(/\\"/g, '"')
				.replace(/\\\\/g, '\\');
			this.storyUpdateCallback('', true); // 标记完成
		}
	}

	reset(): void {
		this.accumulatedText = '';
		this.lastStoryLength = 0;
	}
}