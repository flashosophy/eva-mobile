import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function formatLocation(snapshot) {
  const location = snapshot?.location;
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return 'No fix yet';
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function formatBattery(snapshot) {
  const battery = snapshot?.battery;
  if (!battery || typeof battery.level !== 'number') {
    return '--';
  }

  return `${battery.level}%${battery.charging ? ' charging' : ''}`;
}

function sortChannels(channels = []) {
  return [...channels].sort((a, b) => {
    const aDm = a.kind === 'dm' ? 0 : 1;
    const bDm = b.kind === 'dm' ? 0 : 1;
    if (aDm !== bDm) return aDm - bDm;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export default function ChannelListScreen({
  user,
  channels,
  loading,
  onRefresh,
  onOpenChannel,
  onLogout,
  socketConnected,
  sensorSnapshot,
}) {
  const locationLabel = formatLocation(sensorSnapshot);
  const batteryLabel = formatBattery(sensorSnapshot);
  const orderedChannels = sortChannels(channels);

  return (
    <View style={s.root}>
      <View style={s.headerCard}>
        <View style={s.headerTopRow}>
          <View>
            <Text style={s.title}>Eva Mobile</Text>
            <Text style={s.subtitle}>Signed in as {user?.name || 'Unknown'}</Text>
          </View>

          <Pressable onPress={onLogout} style={s.ghostButton}>
            <Text style={s.ghostButtonText}>Logout</Text>
          </Pressable>
        </View>

        <View style={s.metaRow}>
          <View style={s.badge}>
            <View style={[s.statusDot, { backgroundColor: socketConnected ? '#34d399' : '#f59e0b' }]} />
            <Text style={s.badgeText}>{socketConnected ? 'Live' : 'Reconnecting'}</Text>
          </View>
          <Text style={s.metaText}>Location: {locationLabel}</Text>
          <Text style={s.metaText}>Battery: {batteryLabel}</Text>
        </View>
      </View>

      <View style={s.channelHeaderRow}>
        <Text style={s.sectionTitle}>Channels and DMs</Text>
        <Pressable onPress={onRefresh} style={s.smallButton}>
          <Text style={s.smallButtonText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#22d3ee" />
          <Text style={s.loadingText}>Loading channels...</Text>
        </View>
      ) : (
        <FlatList
          data={orderedChannels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <Pressable style={s.channelRow} onPress={() => onOpenChannel(item)}>
              <View style={s.channelKindPill}>
                <Text style={s.channelKindText}>{item.kind === 'dm' ? 'DM' : 'Channel'}</Text>
              </View>
              <View style={s.channelInfo}>
                <Text style={s.channelName}>{item.name}</Text>
                <Text style={s.channelId}>{item.id}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>No channels available.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090f1d',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  headerCard: {
    borderRadius: 16,
    backgroundColor: '#111a30',
    borderWidth: 1,
    borderColor: '#22324f',
    padding: 14,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 13,
  },
  ghostButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ghostButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaRow: {
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  channelHeaderRow: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  smallButton: {
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallButtonText: {
    color: '#67e8f9',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingWrap: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#93c5fd',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 90,
    gap: 8,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2d46',
    backgroundColor: '#0f1729',
    padding: 12,
  },
  channelKindPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2d4568',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 68,
    alignItems: 'center',
  },
  channelKindText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  channelInfo: {
    flex: 1,
    gap: 3,
  },
  channelName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  channelId: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyState: {
    marginTop: 26,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 13,
  },
});
