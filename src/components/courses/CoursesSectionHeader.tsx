import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { coursesDark } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface CoursesSectionHeaderProps {
  title: string;
  emoji?: string;
  showSeeAll?: boolean;
  seeAllText?: string;
  onSeeAllPress?: () => void;
}

export default function CoursesSectionHeader({
  title,
  emoji,
  showSeeAll = false,
  seeAllText = 'See All →',
  onSeeAllPress,
}: CoursesSectionHeaderProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        <View style={styles.titleRow}>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.accentBar} />
      </View>
      {showSeeAll && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSeeAllPress}
          style={styles.seeAllButton}
        >
          <Text style={styles.seeAllText}>{seeAllText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    marginTop: spacing[24],
    marginBottom: spacing[12],
  },
  leftContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  emoji: {
    fontSize: 18,
  },
  title: {
    ...typography.sectionTitle,
    color: coursesDark.textOnDark,
    letterSpacing: -0.3,
  },
  accentBar: {
    width: 32,
    height: 3,
    backgroundColor: coursesDark.accentPrimary,
    borderRadius: 2,
    marginLeft: spacing[4],
  },
  seeAllButton: {
    paddingVertical: spacing[4],
  },
  seeAllText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '700',
    color: coursesDark.accentPrimary,
  },
});
