import { env } from '$env/dynamic/private';

export function load() {
	// Only pass through actual VERCEL_ENV if it exists
	// Don't create a fallback that might confuse Vercel detection
	const result: { VERCEL_ENV?: string; DEPLOYMENT_ENV: string } = {
		DEPLOYMENT_ENV: env.VERCEL_ENV || env.ZEABUR_ENV || env.NODE_ENV || 'development'
	};
	
	// Only include VERCEL_ENV if it's actually set by Vercel
	if (env.VERCEL_ENV) {
		result.VERCEL_ENV = env.VERCEL_ENV;
	}
	
	return result;
}
