/**
 * AnimatedPressable
 *
 * A TouchableOpacity replacement with premium press feedback:
 * - Scale to 0.97 on press-in
 * - Opacity to 0.9 on press-in
 * - Smooth spring-back on release
 * - Runs on UI thread via Reanimated
 *
 * @module components/AnimatedPressable
 */

import React, { useCallback, type ReactNode } from 'react';
import {
  TouchableOpacity,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '../hooks/useAnimations';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnimatedPressableProps
  extends Omit<TouchableOpacityProps, 'style'> {
  /** Optional animated style override. */
  style?: StyleProp<ViewStyle>;
  /** Content to render. */
  children: ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

const AnimatedPressable = React.memo(function AnimatedPressable({
  onPressIn,
  onPressOut,
  style,
  children,
  activeOpacity = 1, // We handle opacity via Reanimated
  ...rest
}: AnimatedPressableProps): React.JSX.Element {
  const { pressStyle, handlePressIn, handlePressOut } = useAnimatedPress();

  const handleLocalPressIn = useCallback(
    (e: any) => {
      handlePressIn();
      onPressIn?.(e);
    },
    [handlePressIn, onPressIn],
  );

  const handleLocalPressOut = useCallback(
    (e: any) => {
      handlePressOut();
      onPressOut?.(e);
    },
    [handlePressOut, onPressOut],
  );

  return (
    <Animated.View style={[pressStyle, style]}>
      <TouchableOpacity
        onPressIn={handleLocalPressIn}
        onPressOut={handleLocalPressOut}
        activeOpacity={activeOpacity}
        {...rest}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
});

export default AnimatedPressable;
