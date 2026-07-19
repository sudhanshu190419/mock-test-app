import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/home/Icons';

interface Transaction {
  id: string;
  date: string;
  item: string;
  amount: number;
  status: 'Success' | 'Pending' | 'Failed';
}

const TRANSACTIONS: Transaction[] = [
  { id: 'TXN-123', date: 'Oct 24, 2026', item: 'UPSC Master Pack', amount: 4999, status: 'Success' },
  { id: 'TXN-122', date: 'Sep 10, 2026', item: 'CSIR NET Chemistry PYQ', amount: 1299, status: 'Success' },
  { id: 'TXN-121', date: 'Aug 05, 2026', item: 'SSC CGL Mock Test Series', amount: 599, status: 'Failed' },
  { id: 'TXN-120', date: 'Jul 20, 2026', item: 'Banking Exam Bundle', amount: 2499, status: 'Success' },
];

export default function PaymentHistoryScreen() {
  const navigation = useNavigation();

  const renderItem = ({ item }: { item: Transaction }) => {
    let statusColor: string = colors.success;
    if (item.status === 'Failed') statusColor = colors.error;
    if (item.status === 'Pending') statusColor = colors.warning;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemTitle}>{item.item}</Text>
          <Text style={styles.amount}>₹{item.amount}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.date}>{item.date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={TRANSACTIONS}
        keyExtractor={t => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[20], paddingVertical: spacing[16],
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { padding: spacing[4] },
  headerTitle: { ...typography.subtitle, fontSize: 18 },
  listContent: { padding: spacing[20], gap: spacing[16] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.small,
    gap: spacing[12],
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { ...typography.body, fontWeight: '600', flex: 1, marginRight: spacing[16] },
  amount: { ...typography.subtitle, color: colors.text.primary, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...typography.label, color: colors.text.secondary },
  statusBadge: { paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: radius.sm },
  statusText: { ...typography.labelSmall, fontWeight: '700' },
});
