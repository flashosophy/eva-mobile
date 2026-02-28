/**
 * relay.js
 * WebSocket connection to the relay server, acting as the MCP "app" (server) role.
 * Responds to Eva's resource read requests with live sensor data from sensors.js.
 *
 * Protocol: JSON-RPC 2.0 over WebSocket (MCP subset)
 * Role: connects as ?role=app so the relay routes client requests to us
 */

import { getSnapshot } from './sensors';

const RELAY_WS_BASE = 'wss://eva.tail5afb5a.ts.net:8443';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

const RESOURCES = [
  {
    uri: 'jun://location',
    name: 'Location',
    description: 'Current GPS position: lat, lng, accuracy, altitude, speed, heading',
    mimeType: 'application/json',
  },
  {
    uri: 'jun://battery',
    name: 'Battery',
    description: 'Battery level (0-100) and charging state',
    mimeType: 'application/json',
  },
];

let _ws = null;
let _sessionToken = null;
let _reconnectAttempt = 0;
let _closed = false;
let _onStatusChange = null; // (status: 'connecting'|'connected'|'disconnected') => void

export function setStatusCallback(fn) {
  _onStatusChange = fn;
}

export function connect(sessionToken) {
  _sessionToken = sessionToken;
  _closed = false;
  _reconnectAttempt = 0;
  _openSocket();
}

export function disconnect() {
  _closed = true;
  if (_ws) {
    _ws.close(1000, 'user disconnect');
    _ws = null;
  }
}

export function isConnected() {
  return _ws?.readyState === WebSocket.OPEN;
}

// --- Internal ---

function _openSocket() {
  if (_closed || !_sessionToken) return;

  const url = `${RELAY_WS_BASE}/connect/${_sessionToken}?role=app`;
  _notify('connecting');

  const ws = new WebSocket(url);
  _ws = ws;

  ws.onopen = () => {
    _reconnectAttempt = 0;
    _notify('connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      _handleMessage(ws, msg);
    } catch (_) {}
  };

  ws.onerror = () => {
    // onerror always followed by onclose — handle there
  };

  ws.onclose = () => {
    _ws = null;
    _notify('disconnected');
    if (!_closed) {
      _scheduleReconnect();
    }
  };
}

function _scheduleReconnect() {
  const delay = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)];
  _reconnectAttempt++;
  setTimeout(_openSocket, delay);
}

function _notify(status) {
  if (_onStatusChange) _onStatusChange(status);
}

function _handleMessage(ws, msg) {
  // Relay wraps client requests — msg is a JSON-RPC request or notification
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      _reply(ws, id, {
        protocolVersion: '2024-11-05',
        capabilities: { resources: { subscribe: false } },
        serverInfo: { name: 'jun-sense', version: '1.0.0' },
      });
      break;

    case 'initialized':
    case 'notifications/initialized':
      // Client signals it's ready — nothing to do
      break;

    case 'resources/list':
      _reply(ws, id, { resources: RESOURCES });
      break;

    case 'resources/read': {
      const uri = params?.uri;
      const data = _readResource(uri);
      if (data === null) {
        _replyError(ws, id, -32602, `Unknown resource: ${uri}`);
      } else {
        _reply(ws, id, {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data),
            },
          ],
        });
      }
      break;
    }

    default:
      // Unknown method — return method-not-found only if it has an id (request, not notification)
      if (id !== undefined && id !== null) {
        _replyError(ws, id, -32601, `Method not found: ${method}`);
      }
  }
}

function _readResource(uri) {
  const snap = getSnapshot();
  switch (uri) {
    case 'jun://location':
      return snap.location
        ? { ...snap.location, available: true }
        : { available: false, reason: 'No fix yet' };

    case 'jun://battery':
      return snap.battery
        ? { ...snap.battery, available: true }
        : { available: false, reason: 'Not read yet' };

    default:
      return null;
  }
}

function _reply(ws, id, result) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, result }));
}

function _replyError(ws, id, code, message) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }));
}
