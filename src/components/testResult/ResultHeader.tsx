/**
 * ResultHeader
 *
 * Sticky top header for the Test Result screen.
 * Shows a back button, "Test Results" title, and share action.
 * Supports desktop and mobile typography variants.
 *
 * @module components/testResult/ResultHeader
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

interface ResultHeaderProps {
  /** Back navigation callback. */
  onBackPress: () => void;
  /** Share action callback. */
  onSharePress: () => void;
}

const HEADER_HEIGHT = 56;

const ResultHeader = React.memo(function ResultHeader({
  onBackPress,
  onSharePress,
}: ResultHeaderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const handleBack = useCallback(() => onBackPress(), [onBackPress]);
  const handleShare = useCallback(() => onSharePress(), [onSharePress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBack}
            activeOpacity={0.6}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Icon name="arrow-left" color={colors.primary} width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Test Results</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleShare}
          activeOpacity={0.6}
          accessibilityLabel="Share result"
          accessibilityRole="button"
        >
          <Icon name="download" color={colors.primary} width={22} height={22} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export { ResultHeader, HEADER_HEIGHT };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.surface,
    borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderBottomColor: palette.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing[12],
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 28,
  },
});
