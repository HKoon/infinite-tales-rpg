import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

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

		let isStreamClosed = false; // Flag to track stream state

		// Create a ReadableStream for the audio response
		const stream = new ReadableStream({
			start(controller) {
				readable.on('data', (chunk) => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					try {
						controller.enqueue(chunk); // Enqueue each chunk as it arrives
					} catch (error) {
						// Handle case where controller is already closed
						console.warn('Failed to enqueue chunk, controller may be closed:', error);
						isStreamClosed = true;
					}
				});

				readable.on('end', () => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					try {
						controller.close(); // Close the stream when the readable stream ends
					} catch (error) {
						console.warn('Failed to close controller, may already be closed:', error);
					}
					isStreamClosed = true; // Mark the stream as closed
				});

				readable.on('error', (err) => {
					if (isStreamClosed) return; // Skip if the stream is already closed
					try {
						controller.error(err); // Propagate errors
					} catch (error) {
						console.warn('Failed to signal error to controller:', error);
					}
					isStreamClosed = true; // Mark the stream as closed
				});
			},
			cancel() {
				// Handle stream cancellation
				isStreamClosed = true;
				if (readable && typeof readable.destroy === 'function') {
					readable.destroy();
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
		console.error('Error in GET handler:', err);
		return new Response(JSON.stringify({ error: 'Failed to process TTS' }), { status: 500 });
	}
}
