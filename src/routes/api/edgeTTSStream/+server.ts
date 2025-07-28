import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { StreamManager, generateStreamId } from '$lib/utils/streamManager';

export async function GET({ url }) {
	let tts = null;
	let readable = null;
	let streamId = null;
	
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

		tts = new MsEdgeTTS();
		await tts.setMetadata(data.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

		const streamResult = tts.toStream(data.text);
		readable = streamResult.audioStream;
		const streamManager = StreamManager.getInstance();
		streamId = generateStreamId();

		// Track if the stream has been cancelled
		let isCancelled = false;
		let isCompleted = false;

		// Create a ReadableStream for the audio response
		const stream = new ReadableStream({
			start(controller) {
				streamManager.registerStream(streamId, controller);
				
				readable.on('data', (chunk) => {
					if (isCancelled || isCompleted) {
						return; // Ignore data if stream is cancelled or completed
					}
					if (!streamManager.safeEnqueue(streamId, chunk)) {
						console.warn(`Failed to enqueue chunk for stream ${streamId}`);
					}
				});

				readable.on('end', () => {
					if (isCancelled || isCompleted) {
						return; // Ignore end if already handled
					}
					isCompleted = true;
					if (!streamManager.safeClose(streamId)) {
						console.warn(`Failed to close stream ${streamId}`);
					}
				});

				readable.on('error', (err) => {
					if (isCancelled || isCompleted) {
						return; // Ignore errors if already handled
					}
					console.error('TTS readable stream error:', err);
					isCompleted = true;
					if (!streamManager.safeError(streamId, err)) {
						console.warn(`Failed to propagate error for stream ${streamId}`);
					}
				});
			},
			
			cancel() {
				// Handle stream cancellation
				console.log(`Stream ${streamId} cancelled`);
				isCancelled = true;
				streamManager.markStreamCancelled(streamId);
				
				// Clean up the readable stream
				if (readable) {
					try {
						// Remove all listeners to prevent further events
						readable.removeAllListeners();
						if (typeof readable.destroy === 'function') {
							readable.destroy();
						}
					} catch (error) {
						console.error('Error destroying readable stream:', error);
					}
				}
				
				// Clean up the TTS instance
				if (tts && typeof tts.close === 'function') {
					try {
						tts.close();
					} catch (error) {
						console.error('Error closing TTS instance:', error);
					}
				}
			}
		});

		// Return the stream as the response with the correct content-type for the audio format
		return new Response(stream, {
			headers: {
				'Content-Type': 'audio/mp3', // MIME type for MP3
				'Transfer-Encoding': 'chunked', // Ensure the response is streamed
				'cache-control': 'public, max-age=604800, immutable' //cache one year and never revalidate
			}
		});
	} catch (err) {
		console.error('Error in TTS GET handler:', err);
		
		// Clean up on error
		if (streamId) {
			const streamManager = StreamManager.getInstance();
			streamManager.markStreamClosed(streamId);
		}
		if (readable) {
			try {
				readable.removeAllListeners();
				if (typeof readable.destroy === 'function') {
					readable.destroy();
				}
			} catch (cleanupError) {
				console.error('Error during cleanup:', cleanupError);
			}
		}
		if (tts && typeof tts.close === 'function') {
			try {
				tts.close();
			} catch (cleanupError) {
				console.error('Error closing TTS during cleanup:', cleanupError);
			}
		}
		
		return new Response(JSON.stringify({ error: 'Failed to process TTS', details: err.message }), { 
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
