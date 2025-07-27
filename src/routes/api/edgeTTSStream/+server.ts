import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { StreamManager, generateStreamId } from '$lib/utils/streamManager';

export async function GET({ url }) {
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

		const tts = new MsEdgeTTS();
		await tts.setMetadata(data.voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

		const readable = tts.toStream(data.text).audioStream;
		const streamManager = StreamManager.getInstance();
		const streamId = generateStreamId();

		// Create a ReadableStream for the audio response
		const stream = new ReadableStream({
			start(controller) {
				streamManager.registerStream(streamId, controller);
				
				readable.on('data', (chunk) => {
					if (!streamManager.safeEnqueue(streamId, chunk)) {
						console.warn(`Failed to enqueue chunk for stream ${streamId}`);
					}
				});

				readable.on('end', () => {
					if (!streamManager.safeClose(streamId)) {
						console.warn(`Failed to close stream ${streamId}`);
					}
				});

				readable.on('error', (err) => {
					console.error('TTS readable stream error:', err);
					if (!streamManager.safeError(streamId, err)) {
						console.warn(`Failed to propagate error for stream ${streamId}`);
					}
				});
			},
			
			cancel() {
				// Handle stream cancellation
				console.log(`Stream ${streamId} cancelled`);
				streamManager.markStreamClosed(streamId);
				if (readable && typeof readable.destroy === 'function') {
					try {
						readable.destroy();
					} catch (error) {
						console.error('Error destroying readable stream:', error);
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
		return new Response(JSON.stringify({ error: 'Failed to process TTS', details: err.message }), { 
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
}
