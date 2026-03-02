import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getChannelMessages } from '../service/api';
import { emitWithAck, getSocket } from '../service/socket';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dedupeAppend(existingMessages, nextMessage) {
  const existingIndex = existingMessages.findIndex((entry) => entry.id === nextMessage.id);
  if (existingIndex === -1) {
    return [...existingMessages, nextMessage];
  }

  const copy = [...existingMessages];
  copy[existingIndex] = {
    ...copy[existingIndex],
    ...nextMessage,
  };
  return copy;
}

function MessageBubble({ message, selfUserId }) {
  const isSelf = message?.author?.id === selfUserId;
  const isSystem = message?.type === 'system';
  const isStreaming = message?.isStreaming === true;

  return (
    <View style={[s.messageWrap, isSelf && s.messageWrapSelf]}>
      <View style={[
        s.messageBubble,
        isSelf && s.messageBubbleSelf,
        isSystem && s.messageBubbleSystem,
        isStreaming && s.messageBubbleStreaming,
      ]}>
        <View style={s.messageMetaRow}>
          <Text style={s.messageAuthor}>{message?.author?.name || 'Unknown'}</Text>
          <Text style={s.messageTime}>{formatTime(message?.createdAt || Date.now())}</Text>
        </View>
        <Text style={s.messageText}>{String(message?.content || '')}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen({ token, user, channel, onBack }) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState('');
  const [messages, setMessages] = useState([]);
  const [streamingMessages, setStreamingMessages] = useState({});
  const listRef = useRef(null);
  const streamRemovalTimers = useRef(new Map());

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      setLoading(true);
      try {
        const response = await getChannelMessages(token, channel.id, 100);
        if (!cancelled) {
          setMessages(Array.isArray(response?.messages) ? response.messages : []);
        }
      } catch (_) {
        if (!cancelled) {
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [token, channel.id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('channel:join', { channelId: channel.id });

    const handleMessageNew = (message) => {
      if (message?.channelId !== channel.id) return;

      setMessages((prev) => dedupeAppend(prev, message));

      setStreamingMessages((prev) => {
        if (!prev[message.id]) return prev;
        const copy = { ...prev };
        delete copy[message.id];
        return copy;
      });
    };

    const handleStreaming = (payload) => {
      if (payload?.channelId !== channel.id) return;
      const messageId = String(payload?.messageId || '').trim();
      if (!messageId) return;

      const previousTimer = streamRemovalTimers.current.get(messageId);
      if (previousTimer) {
        clearTimeout(previousTimer);
        streamRemovalTimers.current.delete(messageId);
      }

      if (payload.isStreaming === false) {
        const removalTimer = setTimeout(() => {
          setStreamingMessages((prev) => {
            if (!prev[messageId]) return prev;
            const copy = { ...prev };
            delete copy[messageId];
            return copy;
          });
          streamRemovalTimers.current.delete(messageId);
        }, 1500);

        streamRemovalTimers.current.set(messageId, removalTimer);
      }

      setStreamingMessages((prev) => ({
        ...prev,
        [messageId]: {
          id: `stream-${messageId}`,
          channelId: channel.id,
          content: String(payload?.content || 'thinking...'),
          createdAt: Date.now(),
          isStreaming: true,
          type: 'text',
          author: {
            id: messageId,
            name: 'Agent',
            type: 'agent',
          },
        },
      }));
    };

    socket.on('message:new', handleMessageNew);
    socket.on('message:streaming', handleStreaming);

    return () => {
      socket.emit('channel:leave', { channelId: channel.id });
      socket.off('message:new', handleMessageNew);
      socket.off('message:streaming', handleStreaming);

      for (const timerId of streamRemovalTimers.current.values()) {
        clearTimeout(timerId);
      }
      streamRemovalTimers.current.clear();
    };
  }, [channel.id]);

  const combinedMessages = useMemo(() => {
    const activeStreaming = Object.values(streamingMessages);
    return [...messages, ...activeStreaming];
  }, [messages, streamingMessages]);

  const handleSend = async () => {
    const trimmed = composer.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const response = await emitWithAck('message:send', {
      channelId: channel.id,
      content: trimmed,
      type: 'text',
    });

    if (!response?.error) {
      setComposer('');
    }

    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backButton}>
          <Text style={s.backButtonText}>Back</Text>
        </Pressable>
        <View style={s.headerMeta}>
          <Text style={s.channelName}>{channel.name}</Text>
          <Text style={s.channelId}>{channel.id}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#22d3ee" />
          <Text style={s.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={combinedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => <MessageBubble message={item} selfUserId={user?.id} />}
          onContentSizeChange={() => {
            listRef.current?.scrollToEnd({ animated: true });
          }}
        />
      )}

      <View style={s.composerBar}>
        <TextInput
          style={s.composerInput}
          value={composer}
          onChangeText={setComposer}
          placeholder="Write a message"
          placeholderTextColor="#64748b"
          multiline
        />
        <Pressable
          onPress={handleSend}
          style={[s.sendButton, (sending || composer.trim().length === 0) && s.sendButtonDisabled]}
          disabled={sending || composer.trim().length === 0}
        >
          <Text style={s.sendButtonText}>{sending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#080f1e',
    paddingTop: 52,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1d2a43',
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerMeta: {
    flex: 1,
  },
  channelName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 18,
  },
  channelId: {
    color: '#64748b',
    fontSize: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#93c5fd',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 22,
    gap: 8,
  },
  messageWrap: {
    alignItems: 'flex-start',
  },
  messageWrapSelf: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '90%',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#14213d',
    borderWidth: 1,
    borderColor: '#22365a',
    gap: 6,
  },
  messageBubbleSelf: {
    backgroundColor: '#163e63',
    borderColor: '#1f5e96',
  },
  messageBubbleSystem: {
    backgroundColor: '#111827',
    borderColor: '#374151',
  },
  messageBubbleStreaming: {
    borderStyle: 'dashed',
    borderColor: '#22d3ee',
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  messageAuthor: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '700',
  },
  messageTime: {
    color: '#94a3b8',
    fontSize: 11,
  },
  messageText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 21,
  },
  composerBar: {
    borderTopWidth: 1,
    borderTopColor: '#1d2a43',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#0b1326',
  },
  composerInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 130,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendButton: {
    minWidth: 64,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22d3ee',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
});
