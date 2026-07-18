/**
 * LiveClassesTabScreen
 *
 * Placeholder screen for the Live Classes tab.
 * Will be replaced with the full Live Classes implementation later.
 *
 * For Phase 1 POC, provides a button to join a LiveKit test room.
 *
 * @module screens/tabs/LiveClassesTabScreen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/home/Icons';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

type LiveTabNavProp = NativeStackNavigationProp<AppStackParamList>;

export default function LiveClassesTabScreen(): React.JSX.Element {
  const navigation = useNavigation<LiveTabNavProp>();

  const handleJoinRoom = () => {
    navigation.navigate('JoinRoom');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.content}>
        <Icon name="play-circle" color={colors.disabled} width={48} height={48} />
        <Text style={styles.title}>Live Classes</Text>
        <Text style={styles.subtitle}>Coming soon</Text>

        {/* LiveKit POC — Phase 1 entry point */}
        <View style={styles.divider} />

        <Text style={styles.pocLabel}>📡 LiveKit POC</Text>
        <Text style={styles.pocDescription}>
          Test audio/video streaming by joining a room with another device.
        </Text>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinRoom}
          activeOpacity={0.8}
        >
          <Text style={styles.joinButtonIcon}>🎥</Text>
          <Text style={styles.joinButtonText}>Join LiveKit Room</Text>
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
    gap: spacing[12],
    paddingHorizontal: spacing[24],
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
  divider: {
    width: '60%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[8],
  },
  pocLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pocDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: '#6C63FF',
    borderRadius: radius.md,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    width: '100%',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  joinButtonIcon: {
    fontSize: 18,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
