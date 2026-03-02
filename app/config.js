const DEFAULT_EVA_CORE_URL = 'http://eva.tail5afb5a.ts.net:3456';
const DEFAULT_EVA_WEB_URL = 'http://eva.tail5afb5a.ts.net:3456/eva-orchestrator/chat';
const DEFAULT_SOCKET_PATH = '/socket.io';
const APP_VERSION = '1.0.7';

function sanitizeBaseUrl(value, fallback = DEFAULT_EVA_CORE_URL) {
  const raw = String(value || '').trim();
  const base = raw || fallback;
  return base.replace(/\/+$/, '');
}

const EVA_CORE_URL = sanitizeBaseUrl(process.env.EXPO_PUBLIC_EVA_CORE_URL);
const EVA_WEB_URL = sanitizeBaseUrl(process.env.EXPO_PUBLIC_EVA_WEB_URL, DEFAULT_EVA_WEB_URL);
const SOCKET_PATH = String(process.env.EXPO_PUBLIC_EVA_CORE_SOCKET_PATH || DEFAULT_SOCKET_PATH).trim() || DEFAULT_SOCKET_PATH;

export { APP_VERSION, EVA_CORE_URL, EVA_WEB_URL, SOCKET_PATH };
