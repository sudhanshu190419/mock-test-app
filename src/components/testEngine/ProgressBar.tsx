/**
 * ProgressBar
 *
 * Thin horizontal progress bar shown below the test header.
 * Visually indicates how much of the test has been answered.
 *
 * @module components/testEngine/ProgressBar
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

import { colors, palette } from '../../theme/colors';

interface ProgressBarProps {
  /** Progress fraction (0–1). */
  progress: number;
}

const ProgressBar = React.memo(function ProgressBar({
  progress,
}: ProgressBarProps): React.JSX.Element {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View style={styles.track}>
      <View
        style={[styles.fill, { width: `${clampedProgress * 100}%` }]}
        pointerEvents="none"
      />
    </View>
  );
});

export { ProgressBar };

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 3,
    backgroundColor: palette.slate200,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});
