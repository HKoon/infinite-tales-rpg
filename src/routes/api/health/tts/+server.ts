import { json } from '@sveltejs/kit';
import { MsEdgeTTS } from 'msedge-tts';

export async function GET() {
	try {
		const tts = new MsEdgeTTS();
		
		// Quick health check with timeout
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => reject(new Error('Health check timed out')), 5000); // 5 second timeout
		});
		
		// Try to get voices as a simple health check
		const voices = await Promise.race([
			tts.getVoices(),
			timeoutPromise
		]);
		
		const isHealthy = Array.isArray(voices) && voices.length > 0;
		
		return json({
			status: isHealthy ? 'healthy' : 'unhealthy',
			service: 'TTS',
			voiceCount: isHealthy ? voices.length : 0,
			timestamp: new Date().toISOString()
		}, {
			status: isHealthy ? 200 : 503
		});
		
	} catch (error) {
		console.error('TTS health check failed:', error);
		return json({
			status: 'unhealthy',
			service: 'TTS',
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: new Date().toISOString()
		}, {
			status: 503
		});
	}
}