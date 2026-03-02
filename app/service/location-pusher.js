import { getSnapshot, subscribeUpdates } from './sensors';
import { getSocket } from './socket';

let _started = false;
let _unsubscribeSensors = null;
let _onSocketConnect = null;
let _lastSentAt = 0;

const MIN_PUSH_INTERVAL_MS = 10_000;

function buildPayload(snapshot) {
  const location = snapshot?.location || null;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
    accuracy: location.accuracy ?? null,
    altitude: location.altitude ?? null,
    speed: location.speed ?? null,
    heading: location.heading ?? null,
    ts: location.ts || Date.now(),
    battery: snapshot?.battery?.level ?? null,
  };
}

function pushLatestLocation({ force = false } = {}) {
  const socket = getSocket();
  if (!socket || !socket.connected) return;

  const now = Date.now();
  if (!force && now - _lastSentAt < MIN_PUSH_INTERVAL_MS) return;

  const payload = buildPayload(getSnapshot());
  if (!payload) return;

  socket.emit('location:update', payload);
  _lastSentAt = now;
}

export function startLocationPusher() {
  if (_started) return;
  _started = true;

  _unsubscribeSensors = subscribeUpdates((kind) => {
    if (kind === 'location' || kind === 'battery') {
      pushLatestLocation();
    }
  });

  const socket = getSocket();
  if (socket) {
    _onSocketConnect = () => {
      pushLatestLocation({ force: true });
    };

    socket.on('connect', _onSocketConnect);
    if (socket.connected) {
      pushLatestLocation({ force: true });
    }
  }
}

export function stopLocationPusher() {
  if (!_started) return;
  _started = false;
  _lastSentAt = 0;

  if (_unsubscribeSensors) {
    _unsubscribeSensors();
    _unsubscribeSensors = null;
  }

  const socket = getSocket();
  if (socket && _onSocketConnect) {
    socket.off('connect', _onSocketConnect);
  }
  _onSocketConnect = null;
}
