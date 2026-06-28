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
import { RefreshControl } from 'react-native';

import {
  useQuestionExplanation,
  useCreateQuestionExplanation,
  useUpdateQuestionExplanation,
  useDeleteQuestionExplanation,
  useUpsertQuestionExplanation,
} from '../../hooks/mockTest/useQuestionExplanations';
import { questionKeys } from '../../hooks/mockTest/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';

export default function QuestionExplanationTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── Parent question ────────────────────────────────────────────────────
  const [questionId, setQuestionId] = useState('');
  const [instituteId, setInstituteId] = useState(user?.instituteId ?? '');
  const {
    data: explanation,
    isLoading: fetchLoading,
    error: fetchError,
    refetch: refetchExplanation,
    isRefetching: isRefreshing,
  } = useQuestionExplanation(questionId || null);

  // ── Create form ────────────────────────────────────────────────────────
  const [explanationText, setExplanationText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [numericalAnswer, setNumericalAnswer] = useState('');
  const [numericalTolerance, setNumericalTolerance] = useState('');

  // ── Update form ────────────────────────────────────────────────────────
  const [updateText, setUpdateText] = useState('');
  const [updateVideoUrl, setUpdateVideoUrl] = useState('');
  const [updateNumericalAnswer, setUpdateNumericalAnswer] = useState('');
  const [updateNumericalTolerance, setUpdateNumericalTolerance] = useState('');

  // ── Debug ───────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = useCreateQuestionExplanation();
  const updateMutation = useUpdateQuestionExplanation();
  const deleteMutation = useDeleteQuestionExplanation();
  const upsertMutation = useUpsertQuestionExplanation();

  // ── Helpers ─────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshExplanation = useCallback(async () => {
    setResult('useQuestionExplanation().refetch()', { status: 'refetching...' });
    const result = await refetchExplanation();
    setResult('useQuestionExplanation().refetch()', { isSuccess: result.isSuccess });
  }, [refetchExplanation, setResult]);

  const resetForm = useCallback(() => {
    setExplanationText('');
    setVideoUrl('');
    setNumericalAnswer('');
    setNumericalTolerance('');
  }, []);

  const resetUpdateForm = useCallback(() => {
    setUpdateText('');
    setUpdateVideoUrl('');
    setUpdateNumericalAnswer('');
    setUpdateNumericalTolerance('');
  }, []);

  const populateUpdateFromExplanation = useCallback(() => {
    if (!explanation) return;
    setUpdateText(explanation.explanationText ?? '');
    setUpdateVideoUrl(explanation.explanationVideoUrl ?? '');
    setUpdateNumericalAnswer(explanation.correctNumericalAnswer != null ? String(explanation.correctNumericalAnswer) : '');
    setUpdateNumericalTolerance(explanation.numericalTolerance != null ? String(explanation.numericalTolerance) : '');
  }, [explanation]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }
    if (!explanationText.trim()) {
      Alert.alert('Validation', 'Explanation text is required.'); return;
    }

    createMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      explanationText: explanationText.trim(),
      videoUrl: videoUrl.trim() || null,
      correctNumericalAnswer: numericalAnswer ? parseFloat(numericalAnswer) : null,
      numericalTolerance: numericalTolerance ? parseFloat(numericalTolerance) : null,
    }, {
      onSuccess: (data) => {
        setResult('useCreateQuestionExplanation()', { success: true, data });
        Alert.alert('Success', 'Explanation created.');
        resetForm();
        refreshExplanation();
      },
      onError: (err) => {
        setResult('useCreateQuestionExplanation()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, explanationText, videoUrl, numericalAnswer, numericalTolerance, resetForm, createMutation, setResult, refreshExplanation]);

  const handleUpdate = useCallback(() => {
    if (!explanation) { Alert.alert('No Data', 'Load an explanation first.'); return; }

    const input: {
      explanationText?: string | null;
      videoUrl?: string | null;
      correctNumericalAnswer?: number | null;
      numericalTolerance?: number | null;
    } = {};

    if (updateText !== explanation.explanationText) input.explanationText = updateText || null;
    if (updateVideoUrl !== explanation.explanationVideoUrl) input.videoUrl = updateVideoUrl || null;
    const numAnswer = updateNumericalAnswer ? parseFloat(updateNumericalAnswer) : null;
    const numTolerance = updateNumericalTolerance ? parseFloat(updateNumericalTolerance) : null;
    if (numAnswer !== explanation.correctNumericalAnswer) input.correctNumericalAnswer = numAnswer;
    if (numTolerance !== explanation.numericalTolerance) input.numericalTolerance = numTolerance;

    updateMutation.mutate({
      questionId: questionId.trim(),
      explanationId: explanation.explanationId,
      input,
    }, {
      onSuccess: (data) => {
        setResult('useUpdateQuestionExplanation()', { success: true, data });
        Alert.alert('Success', 'Explanation updated.');
        refreshExplanation();
      },
      onError: (err) => {
        setResult('useUpdateQuestionExplanation()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [explanation, questionId, updateText, updateVideoUrl, updateNumericalAnswer, updateNumericalTolerance, updateMutation, setResult, refreshExplanation]);

  const handleUpsert = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }

    upsertMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      explanationText: explanationText.trim() || null,
      videoUrl: videoUrl.trim() || null,
      correctNumericalAnswer: numericalAnswer ? parseFloat(numericalAnswer) : null,
      numericalTolerance: numericalTolerance ? parseFloat(numericalTolerance) : null,
    }, {
      onSuccess: (data) => {
        setResult('useUpsertQuestionExplanation()', { success: true, data });
        Alert.alert('Success', 'Explanation upserted.');
        resetForm();
        refreshExplanation();
      },
      onError: (err) => {
        setResult('useUpsertQuestionExplanation()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, explanationText, videoUrl, numericalAnswer, numericalTolerance, resetForm, upsertMutation, setResult, refreshExplanation]);

  const handleDelete = useCallback(() => {
    if (!explanation) { Alert.alert('No Data', 'Load an explanation first.'); return; }

    Alert.alert('Delete Explanation', 'Permanently delete this explanation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate({ questionId: questionId.trim(), explanationId: explanation.explanationId }, {
          onSuccess: () => {
            setResult('useDeleteQuestionExplanation()', { success: true });
            Alert.alert('Deleted', 'Explanation deleted.');
            refreshExplanation();
          },
          onError: (err) => {
            setResult('useDeleteQuestionExplanation()', { success: false, error: err.message });
            Alert.alert('Error', err.message);
          },
        });
      }},
    ]);
  }, [explanation, questionId, deleteMutation, setResult, refreshExplanation]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || upsertMutation.isPending;
  const isLoading = fetchLoading || isMutating;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshExplanation} tintColor="#6C63FF" />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Explanation Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Question ID Section ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Target Question</Text>
          <TextInput style={styles.input} placeholder="Question ID (UUID) *" placeholderTextColor="#999" value={questionId} onChangeText={setQuestionId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Institute ID (UUID) *" placeholderTextColor="#999" value={instituteId} onChangeText={setInstituteId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => { resetUpdateForm(); refreshExplanation(); }} disabled={!questionId.trim() || fetchLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{fetchLoading ? 'Loading...' : '🔄 Load Explanation'}</Text>
          </TouchableOpacity>

          {fetchError && (
            <Text style={[styles.errorText, { marginTop: 8 }]}>{(fetchError as Error).message}</Text>
          )}
        </View>

        {/* ── Current Explanation Display ─────────────────────────────── */}
        {explanation && (
          <View style={[styles.section, { borderLeftWidth: 3, borderLeftColor: '#6C63FF' }]}>
            <Text style={styles.sectionTitle}>📄 Current Explanation</Text>
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>ID: {explanation.explanationId.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Text: {explanation.explanationText ?? '(empty)'}</Text>
              <Text style={styles.debugLabel}>Video URL: {explanation.explanationVideoUrl ?? '(none)'}</Text>
              <Text style={styles.debugLabel}>Numerical Answer: {explanation.correctNumericalAnswer ?? '(none)'}</Text>
              <Text style={styles.debugLabel}>Tolerance: {explanation.numericalTolerance ?? '(none)'}</Text>
              <Text style={styles.debugLabel}>Created: {explanation.createdAt}</Text>
              <Text style={styles.debugLabel}>Updated: {explanation.updatedAt}</Text>
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: '#E3F2FD', marginTop: 8 }]} onPress={populateUpdateFromExplanation} activeOpacity={0.7}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1565C0', textAlign: 'center' }}>📋 Copy to Update Form</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, { backgroundColor: '#FFEBEE', marginTop: 8 }]} onPress={handleDelete} disabled={deleteMutation.isPending} activeOpacity={0.7}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#D32F2F', textAlign: 'center' }}>
                {deleteMutation.isPending ? 'Deleting...' : '🗑️ Delete Explanation'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Create / Upsert Section ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Create / Upsert Explanation</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            Create: requires explanationText. Upsert: checks if exists → updates or creates.
          </Text>

          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Explanation Text * (for Create)" placeholderTextColor="#999" value={explanationText} onChangeText={setExplanationText} multiline />
          <TextInput style={styles.input} placeholder="Video URL" placeholderTextColor="#999" value={videoUrl} onChangeText={setVideoUrl} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Numerical Answer (for numerical questions)" placeholderTextColor="#999" value={numericalAnswer} onChangeText={setNumericalAnswer} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Numerical Tolerance" placeholderTextColor="#999" value={numericalTolerance} onChangeText={setNumericalTolerance} keyboardType="numeric" />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Creating...' : '➕ Create'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#FF6B35' }]} onPress={handleUpsert} disabled={upsertMutation.isPending} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{upsertMutation.isPending ? 'Upserting...' : '🔄 Upsert'}</Text>
            </TouchableOpacity>
          </View>

          {createMutation.isError && <Text style={styles.errorText}>{createMutation.error?.message}</Text>}
          {upsertMutation.isError && <Text style={styles.errorText}>{upsertMutation.error?.message}</Text>}
        </View>

        {/* ── Update Section ──────────────────────────────────────────── */}
        {explanation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Update Explanation</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Explanation Text" placeholderTextColor="#999" value={updateText} onChangeText={setUpdateText} multiline />
            <TextInput style={styles.input} placeholder="Video URL" placeholderTextColor="#999" value={updateVideoUrl} onChangeText={setUpdateVideoUrl} autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Numerical Answer" placeholderTextColor="#999" value={updateNumericalAnswer} onChangeText={setUpdateNumericalAnswer} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Numerical Tolerance" placeholderTextColor="#999" value={updateNumericalTolerance} onChangeText={setUpdateNumericalTolerance} keyboardType="numeric" />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdate} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            if (questionId.trim()) {
              queryClient.invalidateQueries({ queryKey: questionKeys.explanations.list(questionId.trim()) });
            }
            setResult('invalidateQueries', { status: 'invalidated' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{fetchLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Has Explanation:</Text><Text style={styles.debugValue}>{explanation ? 'yes' : 'no'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Has Text:</Text><Text style={styles.debugValue}>{explanation?.explanationText ? 'yes' : 'no'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{questionId && queryClient.getQueryData(questionKeys.explanations.list(questionId)) ? 'cached' : 'empty'}</Text></View>
          <Text style={styles.debugLastOp}>Last Op: {lastOperation || '—'}</Text>

          <Text style={styles.debugResponseLabel}>API Response:</Text>
          <ScrollView horizontal style={styles.debugScroll} contentContainerStyle={{ padding: 10 }}>
            <Text style={styles.debugResponse} selectable>{apiResponse || 'No API calls made yet.'}</Text>
          </ScrollView>
        </View>
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
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
  debugBox: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E8FF' },
});
