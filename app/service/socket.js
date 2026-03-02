import { io } from 'socket.io-client';

import { EVA_CORE_URL, SOCKET_PATH } from '../config';

let _socket = null;
let _token = null;

export function connectSocket(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    throw new Error('Token is required');
  }

  if (_socket && _token === normalizedToken) {
    return _socket;
  }

  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _token = normalizedToken;

  _socket = io(EVA_CORE_URL, {
    path: SOCKET_PATH,
    auth: {
      token: normalizedToken,
      mode: 'eva-core',
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  return _socket;
}

export function getSocket() {
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  _token = null;
}

export function emitWithAck(eventName, payload, timeoutMs = 10000) {
  const socket = getSocket();
  if (!socket || !socket.connected) {
    return Promise.resolve({ error: 'not_connected' });
  }

  return new Promise((resolve) => {
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve({ error: 'timeout' });
    }, timeoutMs);

    socket.emit(eventName, payload, (response) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(response || { success: true });
    });
  });
}
