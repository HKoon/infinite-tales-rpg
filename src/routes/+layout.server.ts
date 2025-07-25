import { env } from '$env/dynamic/private';

export function load() {
	return {
		DEPLOYMENT_ENV: env.VERCEL_ENV || env.ZEABUR_ENV || env.NODE_ENV || 'development'
	};
}
