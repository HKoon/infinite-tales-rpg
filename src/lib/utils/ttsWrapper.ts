/**
 * MsEdgeTTS 包装器，用于处理流取消和错误防护
 * 解决 msedge-tts 包中 _streams[requestId] 未定义的问题
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';

export class SafeMsEdgeTTS {
	private tts: MsEdgeTTS;
	private isDestroyed = false;
	private activeStreams = new Map<string, { audioStream: any; createdAt: number }>();
	private cleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.tts = new MsEdgeTTS();
		
		// 启动定期清理
		this.startCleanupInterval();
	}

	/**
	 * 启动定期清理过期流
	 */
	private startCleanupInterval() {
		this.cleanupInterval = setInterval(() => {
			this.cleanupExpiredStreams();
		}, 10000); // 每10秒清理一次
	}

	/**
	 * 清理过期的流（超过5分钟的流）
	 */
	private cleanupExpiredStreams() {
		const now = Date.now();
		const maxAge = 5 * 60 * 1000; // 5分钟
		
		for (const [requestId, streamInfo] of this.activeStreams.entries()) {
			if (now - streamInfo.createdAt > maxAge) {
				console.warn(`清理过期流: ${requestId}`);
				try {
					streamInfo.audioStream.destroy();
				} catch (error) {
					console.error(`清理过期流时出错:`, error);
				}
				this.activeStreams.delete(requestId);
			}
		}
	}

	async setMetadata(voiceName: string, outputFormat: any, metadataOptions?: any) {
		if (this.isDestroyed) {
			throw new Error('TTS instance has been destroyed');
		}
		return await this.tts.setMetadata(voiceName, outputFormat, metadataOptions);
	}

	toStream(input: string, options?: any): { audioStream: Readable; metadataStream: Readable | null; requestId: string } {
		if (this.isDestroyed) {
			throw new Error('TTS instance has been destroyed');
		}

		try {
				const result = this.tts.toStream(input, options);
				const requestId = result.requestId;
				
				// 跟踪活动流
				this.activeStreams.set(requestId, {
					audioStream: result.audioStream,
					createdAt: Date.now()
				});

			// 包装原始音频流以添加错误处理
			const originalAudioStream = result.audioStream;
			const self = this; // 保存 this 引用
			const wrappedAudioStream = new Readable({
				read() {
					// 不需要实现，数据由原始流推送
				},
				destroy(error, callback) {
					try {
						// 清理时从活动流中移除
						self.activeStreams.delete(requestId);
						
						// 调用原始流的销毁方法
						if (originalAudioStream && typeof originalAudioStream.destroy === 'function') {
							try {
								originalAudioStream.destroy();
							} catch (destroyError) {
								console.warn('Error destroying original audio stream:', destroyError);
							}
						}
						
						callback(error);
					} catch (destroyError) {
						console.error(`销毁流时出错 (${requestId}):`, destroyError);
						// 确保清理跟踪，即使销毁失败
						self.activeStreams.delete(requestId);
						callback(error || destroyError);
					}
				}
			});

			// 转发原始流的事件到包装流
			originalAudioStream.on('data', (chunk) => {
					if (!this.isDestroyed && this.activeStreams.has(requestId)) {
						try {
							wrappedAudioStream.push(chunk);
						} catch (error) {
							console.warn('Error pushing data to wrapped stream:', error);
						}
					}
				});

			originalAudioStream.on('end', () => {
					if (!this.isDestroyed && this.activeStreams.has(requestId)) {
						try {
							wrappedAudioStream.push(null); // 结束流
						} catch (error) {
							console.warn('Error ending wrapped stream:', error);
						}
					}
					this.activeStreams.delete(requestId);
				});

			originalAudioStream.on('error', (error) => {
					console.error('Original audio stream error:', error);
					if (!this.isDestroyed && this.activeStreams.has(requestId)) {
						try {
							wrappedAudioStream.destroy(error);
						} catch (destroyError) {
							console.warn('Error destroying wrapped stream on error:', destroyError);
						}
					}
					this.activeStreams.delete(requestId);
				});

			// 当包装流被销毁时，清理原始流
			wrappedAudioStream.on('close', () => {
				this.activeStreams.delete(requestId);
				if (originalAudioStream && typeof originalAudioStream.destroy === 'function') {
					try {
						originalAudioStream.destroy();
					} catch (error) {
						console.warn('Error destroying original stream on close:', error);
					}
				}
			});

			// 添加超时保护
				setTimeout(() => {
					if (this.activeStreams.has(requestId)) {
						console.warn(`流 ${requestId} 超时，强制清理`);
						this.activeStreams.delete(requestId);
						try {
							wrappedAudioStream.destroy();
						} catch (error) {
							console.error(`强制销毁流时出错:`, error);
						}
					}
				}, 30000); // 30秒超时

			return {
				audioStream: wrappedAudioStream,
				metadataStream: result.metadataStream,
				requestId: requestId
			};
		} catch (error) {
			console.error('创建 TTS 流时出错:', error);
			throw new Error(`TTS 流创建失败: ${error instanceof Error ? error.message : '未知错误'}`);
		}
	}

	close() {
		this.isDestroyed = true;
		
		// 停止清理定时器
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		
		// 清理所有活动流
		for (const [requestId, streamInfo] of this.activeStreams.entries()) {
			console.log(`Cleaning up active stream: ${requestId}`);
			try {
				streamInfo.audioStream.destroy();
			} catch (error) {
				console.error(`Error destroying stream ${requestId}:`, error);
			}
		}
		this.activeStreams.clear();

		// 关闭底层 TTS 实例
		if (this.tts && typeof this.tts.close === 'function') {
			try {
				this.tts.close();
			} catch (error) {
				console.warn('Error closing underlying TTS instance:', error);
			}
		}
	}

	async getVoices() {
		if (this.isDestroyed) {
			throw new Error('TTS instance has been destroyed');
		}
		return await this.tts.getVoices();
	}

	isActive(): boolean {
		return !this.isDestroyed;
	}

	getActiveStreamCount(): number {
		return this.activeStreams.size;
	}
}