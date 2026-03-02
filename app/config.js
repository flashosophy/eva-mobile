const DEFAULT_EVA_CORE_URL = 'https://eva.tail5afb5a.ts.net:3456';

function sanitizeBaseUrl(value, fallback = DEFAULT_EVA_CORE_URL) {
  const raw = String(value || '').trim();
  const base = raw || fallback;
  return base.replace(/\/+$/, '');
}

const EVA_CORE_URL = sanitizeBaseUrl(process.env.EXPO_PUBLIC_EVA_CORE_URL);
const SOCKET_PATH = String(process.env.EXPO_PUBLIC_EVA_CORE_SOCKET_PATH || '/socket.io').trim() || '/socket.io';

export { EVA_CORE_URL, SOCKET_PATH };
