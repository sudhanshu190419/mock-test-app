import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from '../../components/home/Icons';
import { coursesDark, typographyV5 } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimetableScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" color={coursesDark.textOnDark} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timetable</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Icon name="calendar" color={coursesDark.textMutedOnDark} width={48} height={48} />
        <Text style={styles.placeholderText}>Your full schedule will appear here soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: coursesDark.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: coursesDark.textOnDark,
    fontFamily: typographyV5.cardTitleHero.fontFamily,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderText: {
    color: coursesDark.textMutedOnDark,
    fontFamily: typographyV5.metadata.fontFamily,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  }
});
