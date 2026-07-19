/**
 * LiveClassesTabScreen
 *
 * Placeholder screen for the Live Classes tab.
 * Will be replaced with the full implementation later.
 *
 * @module screens/tabs/LiveClassesTabScreen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/home/Icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function LiveClassesTabScreen(): React.JSX.Element {
  const handleNotifyPress = () => {
    Alert.alert('Live Classes', 'We will notify you when Live Classes are launched!');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Icon name="video" color={colors.sky.primary} width={40} height={40} />
        </View>
        <Text style={styles.title}>Live Interactive Classes</Text>
        <Text style={styles.subtitle}>
          Interactive live sessions with top educators and real-time doubt solving are coming soon!
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleNotifyPress} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Notify Me</Text>
        </TouchableOpacity>
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
    paddingHorizontal: spacing[32],
    gap: spacing[16],
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.sky.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[8],
  },
  title: {
    ...typography.title,
    color: colors.text.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[8],
  },
  button: {
    backgroundColor: colors.sky.primary,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: 24,
    shadowColor: colors.sky.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '700',
  },
});
