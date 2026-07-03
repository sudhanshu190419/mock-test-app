// DEV ONLY
// Remove after production frontend integration

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import {
  useValidateMockTestReady,
  usePublishMockTestWorkflow,
  useUnpublishMockTest,
} from '../../hooks/mockTest/useMockTestPublish';
import { mockTestKeys } from '../../hooks/mockTest/queryKeys';
import type {
  ValidationReport,
  PublishSummary,
} from '../../services/mockTest/mockTestPublishService';

export default function MockTestPublishTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();

  // ── Test ID ─────────────────────────────────────────────────────────────
  const [testId, setTestId] = useState('');

  // ─── Validation Query (auto-runs when testId is set) ────────────────────
  const {
    data: validationReport,
    isLoading: validationLoading,
    error: validationError,
    refetch: refetchValidation,
  } = useValidateMockTestReady(testId || null);

  // ── Mutations ───────────────────────────────────────────────────────────
  const publishMutation = usePublishMockTestWorkflow();
  const unpublishMutation = useUnpublishMockTest();

  // ── Debug ───────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Helpers ─────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const executePublish = useCallback(() => {
    publishMutation.mutate(testId.trim(), {
      onSuccess: (summary: PublishSummary) => {
        setResult('usePublishMockTestWorkflow()', summary);
        Alert.alert(
          'Published!',
          `${summary.questionCount} questions frozen.\nTotal: ${summary.totalMarks} marks.`,
        );
        refetchValidation();
      },
      onError: (err) => {
        setResult('usePublishMockTestWorkflow()', { success: false, error: err.message });
        Alert.alert('Publish Failed', err.message);
      },
    });
  }, [testId, publishMutation, setResult, refetchValidation]);

  const handleValidate = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID.'); return; }
    setResult('useValidateMockTestReady()', { status: 'validating...' });
    refetchValidation().then((res) => {
      setResult('useValidateMockTestReady()', res.data ?? { isValid: false, errors: ['Failed to validate'] });
    });
  }, [testId, refetchValidation, setResult]);

  const handlePublish = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID.'); return; }

    if (validationReport && !validationReport.isValid) {
      Alert.alert(
        'Validation Failed',
        `Cannot publish. ${validationReport.errors.length} error(s) found.\n\nFix errors first or publish anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Publish Anyway', style: 'destructive', onPress: () => {
            executePublish();
          }},
        ],
      );
    } else {
      executePublish();
    }
  }, [testId, validationReport, setResult]);

  const handleUnpublish = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID.'); return; }

    Alert.alert(
      'Unpublish Test',
      'This will revert the test from "published" to "draft".\n\nOnly allowed if no student attempts exist.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpublish', style: 'destructive', onPress: () => {
          unpublishMutation.mutate(testId.trim(), {
            onSuccess: (data) => {
              setResult('useUnpublishMockTest()', { status: data.status });
              Alert.alert('Unpublished', 'Test reverted to draft.');
              refetchValidation();
            },
            onError: (err) => {
              setResult('useUnpublishMockTest()', { success: false, error: err.message });
              Alert.alert('Unpublish Failed', err.message);
            },
          });
        }},
      ],
    );
  }, [testId, unpublishMutation, setResult, refetchValidation]);

  const isMutating = publishMutation.isPending || unpublishMutation.isPending;

  // ── Render check item ───────────────────────────────────────────────────
  const CheckItem = ({ label, passed, warning }: { label: string; passed: boolean; warning?: boolean }) => (
    <View style={styles.checkItem}>
      <Text style={styles.checkIcon}>
        {warning ? '🟡' : passed ? '🟢' : '🔴'}
      </Text>
      <Text style={[styles.checkLabel, !passed && !warning && styles.checkLabelFailed]}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Mock Test Publish Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Validate, publish, unpublish workflow</Text>
        </View>

        {/* ── Test ID Input ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Mock Test ID</Text>
          <TextInput style={styles.input} placeholder="Test ID (UUID) *" placeholderTextColor="#999" value={testId} onChangeText={setTestId} autoCapitalize="none" />
        </View>

        {/* ── Validation Section ──────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Validate Mock Test Ready</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleValidate}
            disabled={validationLoading || !testId.trim()}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {validationLoading ? 'Validating...' : '🔍 Run Validation'}
            </Text>
          </TouchableOpacity>

          {validationLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {validationError && (
            <Text style={styles.errorText}>{(validationError as Error).message}</Text>
          )}

          {validationReport && (
            <>
              {/* Overall status */}
              <View style={[styles.statusBanner, validationReport.isValid ? styles.statusValid : styles.statusInvalid]}>
                <Text style={styles.statusText}>
                  {validationReport.isValid ? '✅ READY TO PUBLISH' : '❌ NOT READY'}
                </Text>
              </View>

              {/* 11 Validation checks */}
              <Text style={styles.sectionSubtitle}>Validation Checks</Text>
              <CheckItem
                label="Mock test exists"
                passed={validationReport.details.testExists}
              />
              <CheckItem
                label={`Status is draft/pending_approval (current: ${validationReport.details.status})`}
                passed={['draft', 'pending_approval'].includes(validationReport.details.status)}
              />
              <CheckItem
                label={`Has at least one question (count: ${validationReport.details.questionCount})`}
                passed={validationReport.details.hasQuestions}
              />
              <CheckItem
                label="All assigned questions exist"
                passed={validationReport.details.allQuestionsExist}
              />
              <CheckItem
                label="All questions are published"
                passed={validationReport.details.allQuestionsPublished}
              />
              <CheckItem
                label="No duplicate displayOrder"
                passed={validationReport.details.noDuplicateDisplayOrder}
              />
              <CheckItem
                label="No duplicate questions"
                passed={validationReport.details.noDuplicateQuestions}
              />
              <CheckItem
                label="All questions belong to same institute"
                passed={validationReport.details.instituteMatch}
              />
              <CheckItem
                label="Availability dates are valid"
                passed={validationReport.details.validAvailabilityDates}
              />
              <CheckItem
                label="Duration > 0"
                passed={validationReport.details.validDuration}
              />
              <CheckItem
                label="Total marks > 0"
                passed={validationReport.details.validTotalMarks}
              />

              {/* Errors */}
              {validationReport.errors.length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: '#D32F2F', marginTop: 12 }]}>
                    🔴 Errors ({validationReport.errors.length})
                  </Text>
                  {validationReport.errors.map((err, i) => (
                    <Text key={i} style={styles.errorItem}>{err}</Text>
                  ))}
                </>
              )}

              {/* Warnings */}
              {validationReport.warnings.length > 0 && (
                <>
                  <Text style={[styles.sectionSubtitle, { color: '#F57F17', marginTop: 12 }]}>
                    🟡 Warnings ({validationReport.warnings.length})
                  </Text>
                  {validationReport.warnings.map((warn, i) => (
                    <Text key={i} style={styles.warningItem}>{warn}</Text>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* ── Actions Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions</Text>

          {/* Publish Workflow */}
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>📤 Publish Workflow</Text>
            <Text style={styles.actionDescription}>
              Runs validation → generates snapshots → publishes.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.publishButton]}
              onPress={handlePublish}
              disabled={publishMutation.isPending || !testId.trim()}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {publishMutation.isPending ? 'Publishing...' : '📤 Publish Workflow'}
              </Text>
            </TouchableOpacity>

            {publishMutation.data && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Publish Summary</Text>
                <Text style={styles.summaryItem}>Test ID: {publishMutation.data.testId.slice(0, 12)}...</Text>
                <Text style={styles.summaryItem}>Previous Status: {publishMutation.data.previousStatus}</Text>
                <Text style={styles.summaryItem}>New Status: {publishMutation.data.newStatus}</Text>
                <Text style={styles.summaryItem}>Published At: {publishMutation.data.publishedAt}</Text>
                <Text style={styles.summaryItem}>Questions Frozen: {publishMutation.data.questionCount}</Text>
                <Text style={styles.summaryItem}>Total Marks: {publishMutation.data.totalMarks}</Text>
              </View>
            )}
          </View>

          {/* Unpublish */}
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>⏪ Unpublish</Text>
            <Text style={styles.actionDescription}>
              Reverts published → draft. Only allowed when no attempts exist.
            </Text>
            <TouchableOpacity
              style={[styles.button, styles.unpublishButton]}
              onPress={handleUnpublish}
              disabled={unpublishMutation.isPending || !testId.trim()}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {unpublishMutation.isPending ? 'Unpublishing...' : '⏪ Unpublish Test'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Snapshot Placeholder Status */}
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>📸 Snapshot Generation</Text>
            <Text style={styles.actionDescription}>
              Snapshots are generated during the publish workflow.
            </Text>
            <View style={styles.statusRow}>
              <Text style={styles.checkIcon}>🟡</Text>
              <Text style={{ fontSize: 12, color: '#F57F17', fontWeight: '600', flex: 1 }}>
                Architecture reserved — snapshot generation is not yet implemented.
                The publish workflow calls this step but it returns a placeholder.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: mockTestKeys.publish.validations() });
            queryClient.invalidateQueries({ queryKey: mockTestKeys.publish.summaries() });
            queryClient.invalidateQueries({ queryKey: mockTestKeys.mockTests.lists() });
            setResult('invalidateQueries', { status: 'invalidated publish + mock test caches' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Test ID:</Text><Text style={styles.debugValue}>{testId ? `${testId.slice(0, 12)}...` : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Validation Status:</Text><Text style={styles.debugValue}>{validationReport ? (validationReport.isValid ? 'ready' : 'failing') : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Errors:</Text><Text style={styles.debugValue}>{validationReport?.errors.length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Warnings:</Text><Text style={styles.debugValue}>{validationReport?.warnings.length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Publishing:</Text><Text style={styles.debugValue}>{publishMutation.isPending ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Unpublishing:</Text><Text style={styles.debugValue}>{unpublishMutation.isPending ? 'true' : 'false'}</Text></View>
          <Text style={styles.debugLastOp}>Last Op: {lastOperation || '—'}</Text>

          <Text style={styles.debugResponseLabel}>API Response:</Text>
          <ScrollView horizontal style={styles.debugScroll} contentContainerStyle={{ padding: 10 }}>
            <Text style={styles.debugResponse} selectable>{apiResponse || 'No API calls made yet.'}</Text>
          </ScrollView>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1A1A2E', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#FF6B6B', fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  sectionSubtitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginTop: 8, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  publishButton: { backgroundColor: '#2E7D32', marginTop: 8 },
  unpublishButton: { backgroundColor: '#E65100', marginTop: 8 },
  statusBanner: { borderRadius: 8, padding: 12, marginBottom: 10, alignItems: 'center' },
  statusValid: { backgroundColor: '#E8F5E9' },
  statusInvalid: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  checkIcon: { fontSize: 14, marginRight: 8 },
  checkLabel: { fontSize: 13, color: '#333', flex: 1 },
  checkLabelFailed: { color: '#D32F2F', fontWeight: '600' },
  errorItem: { fontSize: 12, color: '#D32F2F', paddingVertical: 3, paddingLeft: 8, fontFamily: 'monospace' },
  warningItem: { fontSize: 12, color: '#F57F17', paddingVertical: 3, paddingLeft: 8, fontFamily: 'monospace' },
  actionCard: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8E8FF' },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  actionDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  summaryBox: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#C8E6C9' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 6 },
  summaryItem: { fontSize: 11, color: '#1A1A2E', fontFamily: 'monospace', paddingVertical: 1 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
});
