import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import Icon from '../../components/home/Icons';

type TabType = 'Videos' | 'PDFs' | 'Tests';

export default function DownloadsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabType>('Videos');
  const tabs: TabType[] = ['Videos', 'PDFs', 'Tests'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Downloads</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        <Icon name="download" color={colors.text.secondary} width={48} height={48} />
        <Text style={styles.emptyTitle}>No {activeTab} downloaded</Text>
        <Text style={styles.emptyDesc}>
          Downloaded {activeTab.toLowerCase()} will appear here for offline access.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[20], paddingVertical: spacing[16],
  },
  backButton: { padding: spacing[4] },
  headerTitle: { ...typography.subtitle, fontSize: 18 },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[20],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[12],
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { ...typography.body, color: colors.text.secondary, fontWeight: '500' },
  activeTabText: { color: colors.primary, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[40], gap: spacing[16] },
  emptyTitle: { ...typography.subtitle, color: colors.text.primary },
  emptyDesc: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});
