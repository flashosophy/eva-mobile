import { EVA_CORE_URL } from '../config';

const API_BASE = `${EVA_CORE_URL}/api`;

async function parseResponse(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

async function request(path, { method = 'GET', token = null, body } = {}) {
  const headers = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function loginWithPassword(password) {
  return request('/auth/login', {
    method: 'POST',
    body: { password },
  });
}

export async function getCurrentUser(token) {
  return request('/auth/me', { token });
}

export async function getChannels(token) {
  return request('/channels', { token });
}

export async function getChannelMessages(token, channelId, limit = 80) {
  const safeChannelId = encodeURIComponent(channelId);
  return request(`/channels/${safeChannelId}/messages?limit=${limit}`, { token });
}
