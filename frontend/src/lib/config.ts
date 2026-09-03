// /frontend/src/lib/config.ts
// Set NEXT_PUBLIC_BACKEND_URL in .env.local to override.
// Example: NEXT_PUBLIC_BACKEND_URL=http://192.168.1.50:8002
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8002';
export const BACKEND_WS  = BACKEND_URL.replace(/^http/, 'ws');
export const DEFAULT_MODEL = process.env.NEXT_PUBLIC_DEFAULT_MODEL ?? 'gemma4-e4b';
