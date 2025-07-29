import { SafeMsEdgeTTS } from '$lib/utils/ttsWrapper';
import { json } from '@sveltejs/kit';

export async function GET({ setHeaders }) {
	const tts = new SafeMsEdgeTTS();
	try {
		//cache one year and never revalidate
		setHeaders({
			'cache-control': 'public, max-age=604800, immutable'
		});
		const voices = await tts.getVoices();
		tts.close(); // 清理资源
		return json(voices);
	} catch (error) {
		console.error('Error fetching voices:', error);
		tts.close(); // 确保清理资源
		return json({ error: 'Failed to fetch voices' }, { status: 500 });
	}
}
