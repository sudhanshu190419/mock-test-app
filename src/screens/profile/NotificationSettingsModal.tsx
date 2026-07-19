import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export default function NotificationSettingsModal() {
  const navigation = useNavigation();
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [testReminders, setTestReminders] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [appUpdates, setAppUpdates] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Done</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Course Updates</Text>
            <Text style={styles.settingDesc}>New lectures and materials</Text>
          </View>
          <Switch value={courseUpdates} onValueChange={setCourseUpdates} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Test Reminders</Text>
            <Text style={styles.settingDesc}>Upcoming mocks and deadlines</Text>
          </View>
          <Switch value={testReminders} onValueChange={setTestReminders} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Promotional Offers</Text>
            <Text style={styles.settingDesc}>Discounts and new packs</Text>
          </View>
          <Switch value={promotions} onValueChange={setPromotions} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>App Updates</Text>
            <Text style={styles.settingDesc}>New features and improvements</Text>
          </View>
          <Switch value={appUpdates} onValueChange={setAppUpdates} trackColor={{ true: colors.primary }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[20], paddingVertical: spacing[20],
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...typography.subtitle, fontSize: 18 },
  closeText: { ...typography.button, color: colors.primary },
  content: { padding: spacing[20], gap: spacing[24] },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingInfo: { flex: 1, paddingRight: spacing[16], gap: spacing[4] },
  settingTitle: { ...typography.body, fontWeight: '600' },
  settingDesc: { ...typography.label, color: colors.text.secondary },
});
