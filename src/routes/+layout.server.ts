import { env } from '$env/dynamic/private';

export function load() {
	// Support both Vercel and other deployment platforms
	const deploymentEnv = env.VERCEL_ENV || env.ZEABUR_ENV || env.NODE_ENV || 'development';
	
	return {
		VERCEL_ENV: deploymentEnv
	};
}
