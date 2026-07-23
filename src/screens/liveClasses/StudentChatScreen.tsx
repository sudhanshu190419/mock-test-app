/**
 * StudentChatScreen
 *
 * Premium, modern live chat screen for NEET/JEE students.
 *
 * Provides a private Teacher ↔ Student chat experience within a live class.
 * Students can only see their own conversation — no group chat, no
 * student-to-student messaging.
 *
 * ─── Layout ──────────────────────────────────────────────────────
 *
 *   ┌──────────────────────────────────────────┐
 *   │  ←  [A] Teacher Name            Online   │  ← Header
 *   │      Batch • Live Class Chat             │
 *   ├──────────────────────────────────────────┤
 *   │  ┌───────────────────────────────┐       │
 *   │  │                       Hello!   │ 🟢   │  ← Student bubble
 *   │  │                      10:30 AM  │      │     (right, green)
 *   │  └───────────────────────────────┘       │
 *   │  ┌───────────────────────────────┐       │
 *   │  │  Hi! How can I help?          │       │  ← Teacher bubble
 *   │  │  10:31 AM                     │      │     (left, gray)
 *   │  └───────────────────────────────┘       │
 *   ├──────────────────────────────────────────┤
 *   │  ┌────────────────────┐  ┌──────────┐    │
 *   │  │  Type a message... │  │  📤 Send │    │  ← Composer
 *   │  └────────────────────┘  └──────────┘    │
 *   └──────────────────────────────────────────┘
 *
 * ─── States ─────────────────────────────────────────────────────
 *
 *   • Loading       — Skeleton placeholders
 *   • Empty         — "Ask your teacher a question during this live class."
 *   • Error         — Error message with retry button
 *   • Connected     — Message list with realtime updates
 *
 * @module screens/liveClasses/StudentChatScreen
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import Icon from '../../components/home/Icons';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  subscribeToMessages,
} from '../../services/liveChatService';
import { supabase } from '../../config/supabase';
import type {
  Conversation,
  Message,
} from '../../types/liveChat';

// ═════════════════════════════════════════════════════════════════
//  Design Tokens
// ═════════════════════════════════════════════════════════════════

const C = {
  // Brand
  primary: '#166534',
  primaryLight: '#DCFCE7',
  primarySoft: 'rgba(22, 101, 52, 0.08)',

  // Surfaces
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  headerBg: '#F8FAFC',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  // Chat bubbles
  studentBubble: '#166534',
  studentBubbleText: '#FFFFFF',
  teacherBubble: '#F1F5F9',
  teacherBubbleText: '#0F172A',
  teacherBubbleTime: '#94A3B8',

  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Status
  success: '#16A34A',
  online: '#16A34A',

  // Shadows
  shadowSmall: 'rgba(15, 23, 42, 0.06)',
} as const;

// ═════════════════════════════════════════════════════════════════
//  Types
// ═════════════════════════════════════════════════════════════════

export interface StudentChatScreenParams {
  classId: string;
  className: string;
  teacherName: string;
  batchName: string;
}

type ScreenRouteProp = RouteProp<AppStackParamList, 'StudentChat'>;
type ScreenNavProp = NativeStackNavigationProp<AppStackParamList>;

// ═════════════════════════════════════════════════════════════════
//  Format Timestamp
// ═════════════════════════════════════════════════════════════════

function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const time = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (isToday) return time;

    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${date} ${time}`;
  } catch {
    return '';
  }
}

// ═════════════════════════════════════════════════════════════════
//  Message Bubble Component
// ═════════════════════════════════════════════════════════════════

interface MessageBubbleProps {
  message: Message;
  isStudent: boolean;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isStudent,
}: MessageBubbleProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.bubbleRow,
        isStudent ? styles.bubbleRowStudent : styles.bubbleRowTeacher,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isStudent ? styles.bubbleStudent : styles.bubbleTeacher,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isStudent ? styles.bubbleTextStudent : styles.bubbleTextTeacher,
          ]}
        >
          {message.message}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            isStudent ? styles.bubbleTimeStudent : styles.bubbleTimeTeacher,
          ]}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
});

// ═════════════════════════════════════════════════════════════════
//  Skeleton Loader
// ═════════════════════════════════════════════════════════════════

function ChatSkeleton(): React.JSX.Element {
  return (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4].map((i) => {
        const isRight = i % 2 === 0;
        const SKELETON_WIDTHS = [200, 160, 220, 180];
        const width = SKELETON_WIDTHS[i - 1] ?? 180;
        return (
          <View
            key={i}
            style={[
              styles.skeletonRow,
              isRight ? styles.skeletonRowRight : styles.skeletonRowLeft,
            ]}
          >
            <View
              style={[
                styles.skeletonBubble,
                { width },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Screen Component
// ═════════════════════════════════════════════════════════════════

export default function StudentChatScreen(): React.JSX.Element {
  const navigation = useNavigation<ScreenNavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { classId, className, teacherName, batchName } = route.params;

  // ── State ────────────────────────────────────────────────────────
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const flatListRef = useRef<FlatList<Message>>(null);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // ── Resolve current user's profile ID for bubble alignment ─────
  // We need it to determine which messages are "ours" vs. "teacher's"
  const [myProfileId, setMyProfileId] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Load conversation + messages ─────────────────────────────────
  const loadChat = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get or create the conversation
      const convResult = await getOrCreateConversation(classId);
      if (!convResult.success) {
        setError(convResult.error ?? 'Failed to load conversation.');
        setIsLoading(false);
        return;
      }

      const conv = convResult.data;
      setConversation(conv);
      conversationIdRef.current = conv.conversationId;

      // Resolve the current user's profile ID from auth
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setMyProfileId(userData.user.id);
      }

      // Step 2: Load existing messages
      const msgResult = await getMessages(conv.conversationId, {
        page: 1,
        pageSize: 200,
      });
      if (msgResult.success) {
        setMessages(msgResult.data);
      }

      // Step 3: Subscribe to new messages
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      subscriptionRef.current = subscribeToMessages(
        conv.conversationId,
        (newMessage: Message) => {
          if (!isMountedRef.current) return;
          setMessages((prev) => {
            // Avoid duplicates (in case Realtime fires before our own insert returns)
            if (prev.some((m) => m.messageId === newMessage.messageId)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Auto-scroll to latest
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        },
      );

      setIsLoading(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadChat();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [loadChat]);

  // ── Send message ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !conversationIdRef.current) return;

    setIsSending(true);
    Keyboard.dismiss();

    try {
      const result = await sendMessage({
        conversationId: conversationIdRef.current,
        message: trimmed,
      });

      if (result.success) {
        setInputText('');
        // Optimistically add the message if Realtime doesn't fire it back
        setMessages((prev) => {
          if (prev.some((m) => m.messageId === result.data.messageId)) {
            return prev;
          }
          return [...prev, result.data];
        });

        // Auto-scroll to latest
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        console.warn('[StudentChat] Send failed:', result.error);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send message.';
      console.warn('[StudentChat] Send error:', message);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending]);

  // ── Navigate back ────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ── Retry loading ────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    loadChat();
  }, [loadChat]);

  // ── Derived state ────────────────────────────────────────────────
  const canSend = inputText.trim().length > 0 && !isSending;

  // ── Render message item ──────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isStudent = item.senderProfileId === myProfileId;
      return <MessageBubble message={item} isStudent={isStudent} />;
    },
    [myProfileId],
  );

  const keyExtractor = useCallback(
    (item: Message) => item.messageId,
    [],
  );

  // ═══════════════════════════════════════════════════════════════
  //  Loading State
  // ═══════════════════════════════════════════════════════════════
  if (isLoading && messages.length === 0 && !error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-left" color={C.textPrimary} width={22} height={22} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerSkeletonName} />
            <View style={styles.headerSkeletonSubtitle} />
          </View>
        </View>
        <ChatSkeleton />
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Error State
  // ═══════════════════════════════════════════════════════════════
  if (error && messages.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-left" color={C.textPrimary} width={22} height={22} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{teacherName}</Text>
            <Text style={styles.headerSubtitle}>
              {batchName} • Live Class Chat
            </Text>
          </View>
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <Icon name="alert-triangle" color={C.textTertiary} width={32} height={32} />
          </View>
          <Text style={styles.errorTitle}>Unable to load chat</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Retry loading chat"
          >
            <Icon name="arrow-right" color={C.textInverse} width={16} height={16} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  Main Chat UI
  // ═══════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" color={C.textPrimary} width={22} height={22} />
        </TouchableOpacity>

        {/* Teacher Avatar */}
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {teacherName.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Teacher Info */}
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {teacherName}
            </Text>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {batchName} • Live Class Chat
          </Text>
        </View>
      </View>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {messages.length === 0 && !isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask your teacher a question during this live class.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* ── Loading indicator when adding new messages ──────────── */}
        {isLoading && messages.length > 0 && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        )}

        {/* ── Composer ──────────────────────────────────────────────── */}
        <View style={styles.composerContainer}>
          <View style={styles.composerRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor={C.textTertiary}
                multiline
                maxLength={2000}
                textAlignVertical="center"
                accessibilityLabel="Message input"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.sendButton,
                !canSend && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {isSending ? (
                <ActivityIndicator size="small" color={C.textInverse} />
              ) : (
                <Icon
                  name="send"
                  color={canSend ? C.textInverse : C.textTertiary}
                  width={20}
                  height={20}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════
//  Styles
// ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  keyboardAvoid: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.headerBg,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[8],
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[12],
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textInverse,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.online,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '500',
    color: C.online,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textTertiary,
    marginTop: 1,
    letterSpacing: 0.1,
  },

  // ── Header Skeleton ───────────────────────────────────────────────
  headerSkeletonName: {
    width: 140,
    height: 14,
    borderRadius: 4,
    backgroundColor: C.borderLight,
    marginBottom: 4,
  },
  headerSkeletonSubtitle: {
    width: 100,
    height: 10,
    borderRadius: 4,
    backgroundColor: C.borderLight,
  },

  // ── Message List ──────────────────────────────────────────────────
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    flexGrow: 1,
  },

  // ── Message Bubble ────────────────────────────────────────────────
  bubbleRow: {
    marginBottom: spacing[8],
    flexDirection: 'row',
  },
  bubbleRowStudent: {
    justifyContent: 'flex-end',
  },
  bubbleRowTeacher: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    ...Platform.select({
      ios: {
        shadowColor: C.shadowSmall,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  bubbleStudent: {
    backgroundColor: C.studentBubble,
    borderBottomRightRadius: spacing[4],
  },
  bubbleTeacher: {
    backgroundColor: C.teacherBubble,
    borderBottomLeftRadius: spacing[4],
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  bubbleTextStudent: {
    color: C.studentBubbleText,
  },
  bubbleTextTeacher: {
    color: C.teacherBubbleText,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: spacing[4],
    letterSpacing: 0.2,
  },
  bubbleTimeStudent: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  bubbleTimeTeacher: {
    color: C.teacherBubbleTime,
    textAlign: 'right',
  },

  // ── Composer ──────────────────────────────────────────────────────
  composerContainer: {
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    paddingBottom: Platform.OS === 'ios' ? spacing[24] : spacing[12],
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[8],
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: spacing[12],
    paddingVertical: Platform.OS === 'ios' ? spacing[12] : spacing[8],
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: C.textPrimary,
    lineHeight: 21,
    padding: 0,
    margin: 0,
    ...Platform.select({
      ios: {
        maxHeight: 80,
      },
      android: {
        maxHeight: 80,
      },
    }),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: C.borderLight,
  },

  // ── Skeleton ──────────────────────────────────────────────────────
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[16],
  },
  skeletonRow: {
    marginBottom: spacing[12],
    flexDirection: 'row',
  },
  skeletonRowLeft: {
    justifyContent: 'flex-start',
  },
  skeletonRowRight: {
    justifyContent: 'flex-end',
  },
  skeletonBubble: {
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: C.borderLight,
    opacity: 0.6,
  },

  // ── Loading More ──────────────────────────────────────────────────
  loadingMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },

  // ── Empty State ───────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[32],
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing[16],
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[8],
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Error State ───────────────────────────────────────────────────
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[32],
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[16],
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    marginBottom: spacing[8],
    letterSpacing: -0.3,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing[24],
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    backgroundColor: C.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textInverse,
    letterSpacing: 0.2,
  },
});
