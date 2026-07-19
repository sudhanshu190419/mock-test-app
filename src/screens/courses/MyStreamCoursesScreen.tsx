/**
 * MyStreamCoursesScreen (Stream-Filtered Catalog Wrapper)
 *
 * Renders `UnifiedCoursesScreen` with "For You ✨" as the initial active tab
 * tailored to the student's selected target exam stream.
 *
 * @module screens/courses/MyStreamCoursesScreen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import UnifiedCoursesScreen from './UnifiedCoursesScreen';

export default function MyStreamCoursesScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <UnifiedCoursesScreen initialTab="For You" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
