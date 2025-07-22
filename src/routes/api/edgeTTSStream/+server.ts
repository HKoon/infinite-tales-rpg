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

export async function GET({ url }) {
	// Check circuit breaker
	if (isCircuitOpen()) {
		console.warn('TTS circuit breaker is open, rejecting request');
		return new Response(JSON.stringify({ error: 'TTS service temporarily unavailable' }), { status: 503 });
	}
	
	let tts: MsEdgeTTS | null = null;
	try {
		const text = url.searchParams.get('text') as string;
		if (!text || text === 'undefined') {
			return new Response(JSON.stringify({ error: 'Need to provide text' }), { status: 400 });
		}
		const data = {
			voice: url.searchParams.get('voice') as string,
			text: text.replace(/<\/?[^>]+(>|$)/g, '') // clean HTML
		};
		if (!data.voice || data.voice === 'undefined') {
			// Use a default voice
			data.voice = 'de-DE-SeraphinaMultilingualNeural';
		}

		// Validate text length to prevent excessive resource usage
		if (data.text.length > 5000) {
			return new Response(JSON.stringify({ error: 'Text too long, maximum 5000 characters' }), { status: 400 });
		}

		// Add timeout and better error handling for TTS initialization
		tts = new MsEdgeTTS();
		
		// Set a timeout for the TTS operations to prevent hanging
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error('TTS operation timed out')), 30000); // 30 second timeout
		});
		
		try {
			if (!tts) {
				throw new Error('TTS instance not initialized');
			}
			await Promise.race([
				tts.setMetadata(data.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3),
				timeoutPromise
			]);
		} catch (metadataError) {
			console.error('Failed to set TTS metadata:', metadataError);
			throw new Error('TTS initialization failed');
		}

		let streamResult;
		try {
			if (!tts) {
				throw new Error('TTS instance not initialized');
			}
			streamResult = await Promise.race([
				tts.toStream(data.text),
				timeoutPromise
			]);
		} catch (streamError) {
			console.error('Failed to create TTS stream:', streamError);
			throw new Error('TTS stream creation failed');
		}
		
		if (!streamResult || !streamResult.audioStream) {
			throw new Error('Failed to create TTS stream - no audio stream returned');
		}
		const readable = streamResult.audioStream;

		let isStreamClosed = false; // Flag to track stream state
		let cleanupTimeout; // Timeout for cleanup

		// Create a ReadableStream for the audio response
		const stream = new ReadableStream({
			start(controller) {
				// Set a cleanup timeout to prevent hanging connections
				cleanupTimeout = setTimeout(() => {
					if (!isStreamClosed) {
						console.warn('TTS stream cleanup timeout reached');
						isStreamClosed = true;
						try {
							controller.close();
						} catch (e) {
							console.warn('Error closing controller on timeout:', e);
						}
					}
				}, 60000); // 60 second cleanup timeout
				
				readable.on('data', (chunk) => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					try {
						controller.enqueue(chunk); // Enqueue each chunk as it arrives
					} catch (error) {
						// Handle case where controller is already closed
						console.warn('Failed to enqueue chunk, controller may be closed:', error);
						isStreamClosed = true;
						if (cleanupTimeout) clearTimeout(cleanupTimeout);
					}
				});

				readable.on('end', () => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					try {
						controller.close(); // Close the stream when the readable stream ends
						if (cleanupTimeout) clearTimeout(cleanupTimeout);
					} catch (error) {
						console.warn('Failed to close controller, may already be closed:', error);
					}
					isStreamClosed = true; // Mark the stream as closed
				});

				readable.on('error', (err) => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					console.error('TTS readable stream error:', err);
					try {
						controller.error(err); // Propagate errors
						if (cleanupTimeout) clearTimeout(cleanupTimeout);
					} catch (error) {
						console.warn('Failed to signal error to controller:', error);
					}
					isStreamClosed = true; // Mark the stream as closed
				});
			},
			cancel() {
				// Handle stream cancellation
				isStreamClosed = true;
				if (cleanupTimeout) clearTimeout(cleanupTimeout);
				try {
					if (readable && typeof readable.destroy === 'function') {
						readable.destroy();
					}
					// Clean up TTS instance if possible
					if (tts && typeof (tts as any).close === 'function') {
						(tts as any).close();
					}
				} catch (cleanupError) {
					console.warn('Error during stream cleanup:', cleanupError);
				}
			}
		});

		// Reset failure count on successful stream creation
		failureCount = 0;
		
		// Return the stream as the response with the correct content-type for the audio format
		return new Response(stream, {
			headers: {
				'Content-Type': 'audio/mp3', // MIME type for MP3
				'Transfer-Encoding': 'chunked', // Ensure the response is streamed
				'cache-control': 'public, max-age=604800, immutable' //cache one year and never revalidate
			}
		});
	} catch (err) {
		console.error('Error in GET handler:', err);
		
		// Record failure for circuit breaker
		recordFailure();
		
		// Clean up TTS instance on error
		try {
			if (tts && typeof (tts as any).close === 'function') {
				(tts as any).close();
			}
		} catch (cleanupError) {
			console.warn('Error during TTS cleanup:', cleanupError);
		}
		
		return new Response(JSON.stringify({ error: 'Failed to process TTS' }), { status: 500 });
	}
}
