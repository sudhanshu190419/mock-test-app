import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/home/Icons';

const FAQS = [
  { q: 'How do I access my purchased courses?', a: 'You can access all your purchased courses from the "My Stream" tab or the "Downloads" section if you have saved them offline.' },
  { q: 'Can I change my registered email?', a: 'Currently, you cannot change your registered email directly. Please contact support to initiate an email update request.' },
  { q: 'What is the refund policy?', a: 'We offer a 7-day money-back guarantee for all exam packs. If you are unsatisfied, please write to our support team within 7 days of purchase.' },
  { q: 'Are mock tests accessible offline?', a: 'Mock tests require an active internet connection to submit. However, PDFs of previous year questions can be downloaded and viewed offline.' },
];

export default function HelpSupportModal() {
  const navigation = useNavigation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <TouchableOpacity key={index} style={styles.faqItem} onPress={() => toggleExpand(index)} activeOpacity={0.7}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQ}>{faq.q}</Text>
                  <Icon name={isExpanded ? 'minus' : 'chevron-right'} color={colors.text.secondary} width={20} height={20} />
                </View>
                {isExpanded && <Text style={styles.faqA}>{faq.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactDesc}>Our support team is available 24/7 to assist you with any queries.</Text>
          <TouchableOpacity style={styles.contactButton} activeOpacity={0.8}>
            <Icon name="send" color={colors.surface} width={18} height={18} />
            <Text style={styles.contactButtonText}>Contact Us</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  sectionTitle: { ...typography.subtitle, fontSize: 16 },
  faqList: { gap: spacing[12] },
  faqItem: {
    backgroundColor: colors.surface,
    padding: spacing[16],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing[12] },
  faqQ: { ...typography.body, fontWeight: '600', flex: 1 },
  faqA: { ...typography.body, color: colors.text.secondary, marginTop: spacing[12] },
  contactCard: {
    backgroundColor: colors.primary + '10',
    padding: spacing[20],
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing[12],
    marginTop: spacing[16],
  },
  contactTitle: { ...typography.subtitle, fontSize: 16, color: colors.primary },
  contactDesc: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing[12],
    paddingHorizontal: spacing[24],
    borderRadius: radius.full,
    gap: spacing[8],
    marginTop: spacing[8],
  },
  contactButtonText: { ...typography.button, color: colors.surface },
});
