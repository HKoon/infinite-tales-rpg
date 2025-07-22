import { MsEdgeTTS } from 'msedge-tts';
import { json } from '@sveltejs/kit';

export async function GET({ setHeaders }) {
	try {
		const tts = new MsEdgeTTS();
		
		// Set a timeout for the voices operation
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error('Voices operation timed out')), 10000); // 10 second timeout
		});
		
		const voices = await Promise.race([
			tts.getVoices(),
			timeoutPromise
		]);
		
		//cache one year and never revalidate
		setHeaders({
			'cache-control': 'public, max-age=604800, immutable'
		});
		
		return json(voices);
	} catch (error) {
		console.error('Error fetching TTS voices:', error);
		return json({ error: 'Failed to fetch voices' }, { status: 500 });
	}
}
