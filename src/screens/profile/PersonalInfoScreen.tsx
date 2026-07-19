import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import Icon from '../../components/home/Icons';

export default function PersonalInfoScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('Guest Student');
  const [phone, setPhone] = useState('+91 9876543210');
  const [email, setEmail] = useState('guest@mockprep.com');
  const [institute, setInstitute] = useState('EduMastery Institute');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" color={colors.text.primary} width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Info</Text>
        <View style={{ width: 24 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Enter your phone number"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Institute/School</Text>
            <TextInput
              style={styles.input}
              value={institute}
              onChangeText={setInstitute}
              placeholder="Enter your institute name"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
        </ScrollView>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  scrollContent: { padding: spacing[20], gap: spacing[24] },
  inputGroup: { gap: spacing[8] },
  label: { ...typography.label, color: colors.text.secondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    ...shadows.small,
  },
  bottomBar: {
    padding: spacing[20],
    paddingBottom: spacing[24],
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.medium,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing[16],
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  saveButtonText: { ...typography.button, color: colors.surface },
});
