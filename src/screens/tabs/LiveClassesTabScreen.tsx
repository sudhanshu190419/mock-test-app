/**
 * LiveClassesTabScreen
 *
 * Placeholder screen for the Live Classes tab.
 * Will be replaced with the full implementation later.
 *
 * @module screens/tabs/LiveClassesTabScreen
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function LiveClassesTabScreen(): React.JSX.Element {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.content}>
        <Icon name="play-circle" color={colors.disabled} width={48} height={48} />
        <Text style={styles.title}>Live Classes</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[12],
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
