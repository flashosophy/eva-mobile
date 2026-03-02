import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import ChannelListScreen from './screens/ChannelListScreen';
import ChatScreen from './screens/ChatScreen';
import { getChannels, getCurrentUser, loginWithPassword } from './service/api';
import { startLocationPusher, stopLocationPusher } from './service/location-pusher';
import { connectSocket, disconnectSocket, getSocket } from './service/socket';
import * as Sensors from './service/sensors';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './store/auth';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [auth, setAuth] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);

  const [socketConnected, setSocketConnected] = useState(false);
  const [sensorSnapshot, setSensorSnapshot] = useState(Sensors.getSnapshot());

  const authenticatedUser = auth?.user || null;

  const refreshChannels = useCallback(async (token) => {
    const effectiveToken = String(token || auth?.token || '').trim();
    if (!effectiveToken) return;

    setChannelsLoading(true);
    try {
      const response = await getChannels(effectiveToken);
      setChannels(Array.isArray(response?.channels) ? response.channels : []);
    } catch (err) {
      setChannels([]);
      Alert.alert('Channels unavailable', err.message || 'Could not load channels');
    } finally {
      setChannelsLoading(false);
    }
  }, [auth?.token]);

  const forceLogout = useCallback(async (message = '') => {
    stopLocationPusher();
    disconnectSocket();
    await Sensors.stop().catch(() => {});
    await clearAuthSession();

    setAuth(null);
    setChannels([]);
    setActiveChannel(null);
    setSocketConnected(false);
    setSensorSnapshot(Sensors.getSnapshot());
    setAuthError(message);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const session = await loadAuthSession();
        if (!session?.token) return;

        const meResponse = await getCurrentUser(session.token);
        if (cancelled) return;

        setAuth({
          token: session.token,
          user: meResponse?.user || session.user || null,
        });
      } catch (_) {
        await clearAuthSession();
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!auth?.token) return;

    let didCancel = false;
    let unsubscribeSensors = null;

    async function startRuntime() {
      try {
        await Sensors.start();
      } catch (err) {
        Alert.alert('Location unavailable', err.message || 'Location permission was denied');
      }

      if (didCancel) return;

      setSensorSnapshot(Sensors.getSnapshot());
      unsubscribeSensors = Sensors.subscribeUpdates((_kind, snapshot) => {
        setSensorSnapshot(snapshot);
      });

      const socket = connectSocket(auth.token);

      const handleConnect = () => setSocketConnected(true);
      const handleDisconnect = () => setSocketConnected(false);
      const handleConnectError = async (error) => {
        setSocketConnected(false);
        const message = String(error?.message || '');
        const isAuthIssue = /invalid token|authentication required/i.test(message);
        if (isAuthIssue) {
          await forceLogout('Session expired. Please log in again.');
        }
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('connect_error', handleConnectError);

      if (socket.connected) {
        setSocketConnected(true);
      }

      startLocationPusher();
      await refreshChannels(auth.token);

      const cleanupSocketListeners = () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
      };

      if (didCancel) {
        cleanupSocketListeners();
      }

      return cleanupSocketListeners;
    }

    let cleanupSocketListeners = null;

    startRuntime().then((cleanup) => {
      cleanupSocketListeners = cleanup || null;
    });

    return () => {
      didCancel = true;

      if (unsubscribeSensors) {
        unsubscribeSensors();
      }

      if (cleanupSocketListeners) {
        cleanupSocketListeners();
      }

      stopLocationPusher();
      setSocketConnected(false);
    };
  }, [auth?.token, forceLogout, refreshChannels]);

  const handleLogin = useCallback(async (password) => {
    setLoginLoading(true);
    setAuthError('');

    try {
      const response = await loginWithPassword(password);
      const token = response?.token;
      const user = response?.user || null;

      if (!token) {
        throw new Error('Server did not return a token');
      }

      await saveAuthSession(token, user);
      setAuth({ token, user });
    } catch (err) {
      setAuthError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await forceLogout('');
  }, [forceLogout]);

  const handleOpenChannel = useCallback((channel) => {
    setActiveChannel(channel);
  }, []);

  const handleBackToChannels = useCallback(() => {
    setActiveChannel(null);
    const socket = getSocket();
    if (socket?.connected && auth?.token) {
      refreshChannels(auth.token);
    }
  }, [auth?.token, refreshChannels]);

  const content = useMemo(() => {
    if (booting) {
      return (
        <View style={s.bootWrap}>
          <ActivityIndicator color="#22d3ee" />
          <Text style={s.bootText}>Booting Eva Mobile...</Text>
        </View>
      );
    }

    if (!auth?.token) {
      return (
        <LoginScreen
          onSubmit={handleLogin}
          loading={loginLoading}
          error={authError}
        />
      );
    }

    if (activeChannel) {
      return (
        <ChatScreen
          token={auth.token}
          user={authenticatedUser}
          channel={activeChannel}
          onBack={handleBackToChannels}
        />
      );
    }

    return (
      <ChannelListScreen
        user={authenticatedUser}
        channels={channels}
        loading={channelsLoading}
        onRefresh={() => refreshChannels(auth.token)}
        onOpenChannel={handleOpenChannel}
        onLogout={handleLogout}
        socketConnected={socketConnected}
        sensorSnapshot={sensorSnapshot}
      />
    );
  }, [
    booting,
    auth,
    loginLoading,
    authError,
    activeChannel,
    authenticatedUser,
    channels,
    channelsLoading,
    handleBackToChannels,
    handleLogin,
    handleLogout,
    handleOpenChannel,
    refreshChannels,
    sensorSnapshot,
    socketConnected,
  ]);

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {content}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080f1e',
  },
  bootWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bootText: {
    color: '#93c5fd',
    fontSize: 14,
  },
});
