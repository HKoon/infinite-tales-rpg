import { setupGlobalErrorHandlers } from '$lib/utils/globalErrorHandler';
// 应用 msedge-tts 补丁
import '$lib/utils/msedgeTtsPatch';
import type { Handle } from '@sveltejs/kit';

// 设置全局错误处理器
setupGlobalErrorHandlers();

export const handle: Handle = async ({ event, resolve }) => {
	try {
		const response = await resolve(event);
		return response;
	} catch (error) {
		console.error('🚨 请求处理错误:', error);
		
		// 检查是否是 TTS 相关错误
		if (error instanceof Error && 
			(error.message.includes('msedge-tts') || 
			 error.message.includes('_streams') ||
			 error.message.includes('Cannot read properties of undefined'))) {
			console.error('⚠️  TTS 错误已被捕获，返回错误响应');
			return new Response(
				JSON.stringify({ error: 'TTS service temporarily unavailable' }), 
				{ 
					status: 503,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
		
		// 重新抛出其他错误
		throw error;
	}
};