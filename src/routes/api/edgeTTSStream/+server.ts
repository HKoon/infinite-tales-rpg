import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Simple circuit breaker to prevent repeated failures
let failureCount = 0;
let lastFailureTime = 0;
const FAILURE_THRESHOLD = 5;
const RESET_TIME = 300000; // 5 minutes

function isCircuitOpen() {
	const now = Date.now();
	if (now - lastFailureTime > RESET_TIME) {
		failureCount = 0;
		return false;
	}
	return failureCount >= FAILURE_THRESHOLD;
}

function recordFailure() {
	failureCount++;
	lastFailureTime = Date.now();
}

// 添加重试机制
async function createTTSWithRetry(voice: string, format: any, maxRetries = 3): Promise<MsEdgeTTS> {
	let lastError;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`TTS initialization attempt ${attempt}/${maxRetries}`);
			const tts = new MsEdgeTTS();
			
			// 添加更短的超时时间用于初始化
			const initTimeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('TTS initialization timeout')), 15000);
			});
			
			await Promise.race([
				tts.setMetadata(voice, format),
				initTimeout
			]);
			
			console.log(`TTS initialized successfully on attempt ${attempt}`);
			return tts;
		} catch (error) {
			lastError = error;
			console.warn(`TTS initialization failed on attempt ${attempt}:`, error);
			
			// 如果不是最后一次尝试，等待一段时间再重试
			if (attempt < maxRetries) {
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
				console.log(`Waiting ${delay}ms before retry...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw lastError;
}

// 添加流创建的重试机制
async function createStreamWithRetry(tts: MsEdgeTTS, text: string, maxRetries = 2) {
	let lastError;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`Stream creation attempt ${attempt}/${maxRetries}`);
			
			const streamTimeout = new Promise((_, reject) => {
				setTimeout(() => reject(new Error('Stream creation timeout')), 20000);
			});
			
			const streamResult = await Promise.race([
				tts.toStream(text),
				streamTimeout
			]);
			
			if (!streamResult || !streamResult.audioStream) {
				throw new Error('No audio stream returned');
			}
			
			console.log(`Stream created successfully on attempt ${attempt}`);
			return streamResult;
		} catch (error) {
			lastError = error;
			console.warn(`Stream creation failed on attempt ${attempt}:`, error);
			
			if (attempt < maxRetries) {
				const delay = 1000 * attempt;
				console.log(`Waiting ${delay}ms before stream retry...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw lastError;
}

export async function GET({ url }) {
	// Check circuit breaker
	if (isCircuitOpen()) {
		console.warn('TTS service circuit breaker is open, rejecting request');
		return new Response('TTS service temporarily unavailable', { status: 503 });
	}

	const text = url.searchParams.get('text');
	const voice = url.searchParams.get('voice');

	// Enhanced input validation
	if (!text || text.trim().length === 0) {
		console.warn('TTS request rejected: empty or missing text');
		return new Response('Text parameter is required and cannot be empty', { status: 400 });
	}

	if (!voice || voice.trim().length === 0) {
		console.warn('TTS request rejected: empty or missing voice');
		return new Response('Voice parameter is required and cannot be empty', { status: 400 });
	}

	if (text.length > 5000) {
		console.warn(`TTS request rejected: text too long (${text.length} characters)`);
		return new Response('Text too long (max 5000 characters)', { status: 400 });
	}

	console.log(`TTS request: voice=${voice}, text length=${text.length}`);

	let tts: MsEdgeTTS | null = null;

	try {
		// Use retry mechanism for TTS initialization
		tts = await createTTSWithRetry(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

		// Use retry mechanism for stream creation
		const streamResult = await createStreamWithRetry(tts, text);

		// Additional validation of stream result
		if (!streamResult) {
			throw new Error('Stream creation returned null result');
		}

		if (!streamResult.audioStream) {
			throw new Error('Audio stream is undefined or null');
		}

		console.log('TTS stream created successfully');

		// Convert the audio stream to a ReadableStream
		const readableStream = new ReadableStream({
			start(controller) {
				streamResult.audioStream.on('data', (chunk) => {
					try {
						if (chunk && chunk.audio && chunk.audio.length > 0) {
							controller.enqueue(chunk.audio);
						} else {
							console.warn('Received chunk with undefined or empty audio data');
						}
					} catch (error) {
						console.error('Error processing audio chunk:', error);
						controller.error(error);
					}
				});

				streamResult.audioStream.on('end', () => {
					console.log('TTS audio stream ended successfully');
					controller.close();
				});

				streamResult.audioStream.on('error', (error) => {
					console.error('TTS audio stream error:', error);
					
					// Special handling for audio undefined errors
					if (error.message && error.message.includes('audio')) {
						console.error('Detected audio-related error, this might be the "audio undefined" issue');
						recordFailure();
					}
					
					controller.error(error);
				});
			},
			cancel() {
				console.log('TTS stream cancelled by client');
				if (streamResult.audioStream) {
					streamResult.audioStream.destroy();
				}
			}
		});

		// Reset failure count on successful stream creation
		failureCount = 0;

		return new Response(readableStream, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});
	} catch (error) {
		console.error('TTS error:', error);
		
		// Enhanced error logging
		if (error.message) {
			console.error('Error message:', error.message);
		}
		if (error.stack) {
			console.error('Error stack:', error.stack);
		}
		
		// Special handling for specific error types
		if (error.message && (
			error.message.includes('audio') || 
			error.message.includes('undefined') ||
			error.message.includes('Cannot read properties')
		)) {
			console.error('Detected potential msedge-tts library issue');
			recordFailure();
		}

		// Clean up TTS instance
		if (tts) {
			try {
				// Attempt to clean up the TTS instance
				tts = null;
			} catch (cleanupError) {
				console.warn('Error during TTS cleanup:', cleanupError);
			}
		}

		recordFailure();

		// Return appropriate error response
		if (error.message && error.message.includes('timeout')) {
			return new Response('TTS service timeout', { status: 504 });
		} else if (error.message && error.message.includes('audio')) {
			return new Response('TTS audio processing error', { status: 502 });
		} else {
			return new Response('TTS service error', { status: 500 });
		}
	}
}
