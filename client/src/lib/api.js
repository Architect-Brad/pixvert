import { env } from '$env/dynamic/public';

export function apiUrl(path) {
    return `${env.PUBLIC_API_BASE || 'http://localhost:3001'}${path}`;
}
