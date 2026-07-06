/**
 * Toast
 *
 * Premium toast notifications with:
 * - Success toast: green checkmark, slides down, auto-dismiss
 * - Error toast: red icon, shake once, auto-dismiss
 * - Slide-down entrance animation
 * - Runs on UI thread via Reanimated
 *
 * @module components/Toast
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './home/Icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { shadows } from '../theme/shadows';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToastConfig {
  /** Toast message. */
  message: string;
  /** Toast type. */
  type: 'success' | 'error';
  /** Duration before auto-dismiss (ms). Default: 3000. */
  duration?: number;
  /** Optional action label (e.g. "Undo"). */
  action?: string;
  /** Callback when action is pressed. */
  onAction?: () => void;
}

interface ToastContextValue {
  show: (config: ToastConfig) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOAST_HEIGHT = 56;
const ANIMATION_DURATION = 300;
const SHAKE_DURATION = 400;
const DEFAULT_DURATION = 3000;

// ─── Component ───────────────────────────────────────────────────────────────

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<ToastConfig | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values
  const translateY = useSharedValue(-TOAST_HEIGHT - insets.top - 8);
  const shakeOffset = useSharedValue(0);
  const opacity = useSharedValue(0);

  // ── Dismiss helper ──────────────────────────────────────────────
  const hide = useCallback(() => {
    translateY.value = withTiming(-TOAST_HEIGHT - insets.top - 8, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    opacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    // Using setTimeout as worklet fallback
    setTimeout(() => setVisible(false), ANIMATION_DURATION);
  }, [translateY, opacity, insets.top]);

  // ── Show toast ──────────────────────────────────────────────────
  const show = useCallback(
    (toastConfig: ToastConfig) => {
      // Clear any existing timer
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      setConfig(toastConfig);
      setVisible(true);

      // Reset shake
      shakeOffset.value = 0;

      // Entrance animation — slide down from top
      translateY.value = withSequence(
        withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
      );
      opacity.value = withTiming(1, { duration: ANIMATION_DURATION * 0.7 });

      // Error shake — add shake after entrance
      if (toastConfig.type === 'error') {
        shakeOffset.value = withDelay(
          ANIMATION_DURATION,
          withSequence(
            withTiming(-8, { duration: SHAKE_DURATION * 0.15 }),
            withTiming(8, { duration: SHAKE_DURATION * 0.15 }),
            withTiming(-6, { duration: SHAKE_DURATION * 0.15 }),
            withTiming(6, { duration: SHAKE_DURATION * 0.15 }),
            withTiming(0, { duration: SHAKE_DURATION * 0.2 }),
          ),
        );
      }

      // Auto-dismiss
      const dismissMs = toastConfig.duration ?? DEFAULT_DURATION;
      dismissTimer.current = setTimeout(() => {
        hide();
      }, dismissMs);
    },
    [translateY, opacity, shakeOffset, hide, insets.top],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(shakeOffset);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [translateY, opacity, shakeOffset]);

  // ── Animated style ──────────────────────────────────────────────
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: shakeOffset.value },
    ],
    opacity: opacity.value,
  }));

  const isSuccess = config?.type === 'success';
  const isError = config?.type === 'error';

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && config && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + 8,
              backgroundColor: isSuccess ? '#065F46' : '#991B1B',
            },
            animatedStyle,
          ]}
          pointerEvents="box-none"
        >
          {/* Icon */}
          <Icon
            name={isSuccess ? 'badge-check' : 'shield-check'}
            color="#FFFFFF"
            width={20}
            height={20}
          />

          {/* Message */}
          <Text style={styles.message} numberOfLines={2}>
            {config.message}
          </Text>

          {/* Optional action */}
          {config.action && (
            <TouchableOpacity
              onPress={() => {
                config.onAction?.();
                hide();
              }}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>{config.action}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[16],
    right: spacing[16],
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: radius.md,
    minHeight: TOAST_HEIGHT,
    ...shadows.medium,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
