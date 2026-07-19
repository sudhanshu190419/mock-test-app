/**
 * CoursesScreen (Global Catalog Wrapper)
 *
 * Renders the unified academic course catalog (`UnifiedCoursesScreen`) directly,
 * featuring Style 1 solid banner cards, dynamic category pills, and full-width layout.
 *
 * @module screens/courses/CoursesScreen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import UnifiedCoursesScreen from './UnifiedCoursesScreen';

export default function CoursesScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <UnifiedCoursesScreen initialTab="All Courses" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
