import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon, { type IconName } from '../home/Icons';

interface CoursesEmptyStateProps {
  variant?: 'empty' | 'error';
  title: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
  icon?: IconName;
}

export default function CoursesEmptyState({
  variant = 'empty',
  title,
  description,
  buttonText,
  onButtonPress,
  icon = 'book-open',
}: CoursesEmptyStateProps): React.JSX.Element {
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, [floatAnim]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: floatAnim.value }],
    };
  });

  const isError = variant === 'error';
  const displayIcon = isError ? 'alert-triangle' : icon;
  const iconColor = isError ? coursesDark.categories.law.accent : coursesDark.textMutedOnDark;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Icon name={displayIcon} color={iconColor} width={56} height={56} />
      </Animated.View>
      
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {buttonText && onButtonPress && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onButtonPress}
          style={[styles.button, isError ? styles.errorButton : styles.emptyButton]}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[48],
    paddingHorizontal: spacing[32],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  title: {
    ...typography.sectionTitle,
    color: coursesDark.textOnDark,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: coursesDark.textMutedOnDark,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: spacing[12],
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: coursesDark.accentPrimary,
  },
  errorButton: {
    backgroundColor: coursesDark.categories.law.accent,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
