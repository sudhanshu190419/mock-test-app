/**
 * TestSubmittedScreen
 *
 * Success screen shown after test submission when results have not yet been
 * released by the institute. Provides navigation back to Home or to My Tests.
 *
 * No score is displayed — the result is not yet available.
 *
 * @module screens/tests/TestSubmittedScreen
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from '../../components/home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import type { AppStackParamList } from '../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════
//  Navigation Params
// ═══════════════════════════════════════════════════════════════════

export interface TestSubmittedParams {
  testId: string;
  attemptId: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Main Screen
// ═══════════════════════════════════════════════════════════════════

interface TestSubmittedScreenProps {
  route: { params: TestSubmittedParams };
  navigation: { goBack: () => void };
}

export default function TestSubmittedScreen({
  route,
}: TestSubmittedScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const handleGoHome = useCallback(() => {
    stackNavigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [stackNavigation]);

  const handleMyTests = useCallback(() => {
    stackNavigation.reset({
      index: 0,
      routes: [
        { name: 'MainTabs' },
        { name: 'MyResults' },
      ],
    });
  }, [stackNavigation]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="badge-check" color="#FFFFFF" width={48} height={48} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Test Submitted Successfully</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your responses have been submitted successfully.{'\n\n'}
          Your institute will release the result after evaluation.{'\n\n'}
          You can view your result once it becomes available.
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoHome}
            activeOpacity={0.85}
            accessibilityLabel="Go to Home"
            accessibilityRole="button"
          >
            <Icon name="home" color="#FFFFFF" width={20} height={20} />
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleMyTests}
            activeOpacity={0.85}
            accessibilityLabel="My Tests"
            accessibilityRole="button"
          >
            <Icon name="clipboard-list" color={colors.primary} width={20} height={20} />
            <Text style={styles.secondaryButtonText}>My Tests</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[32],
    paddingBottom: spacing[48],
  },
  iconContainer: {
    marginBottom: spacing[24],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    ...typography.heading2,
    fontSize: 24,
    fontWeight: '700',
    color: palette.slate800,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing[16],
  },
  description: {
    ...typography.body,
    fontSize: 15,
    color: palette.slate500,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[40],
  },
  buttonContainer: {
    width: '100%',
    gap: spacing[12],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: colors.primary,
    paddingVertical: spacing[16],
    borderRadius: radius.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryButtonText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    backgroundColor: colors.surface,
    paddingVertical: spacing[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  secondaryButtonText: {
    ...typography.button,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
});
