// DEV ONLY
// Remove after production frontend integration

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshControl } from 'react-native';

import {
  useQuestionOptions,
  useCreateQuestionOption,
  useUpdateQuestionOption,
  useDeleteQuestionOption,
  useReplaceQuestionOptions,
  useReorderQuestionOptions,
} from '../../hooks/mockTest/useQuestionOptions';
import { questionKeys } from '../../hooks/mockTest/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { QuestionOption, QuestionType } from '../../types/mockTest';

export default function QuestionOptionTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── Parent question ────────────────────────────────────────────────────
  const [questionId, setQuestionId] = useState('');
  const [instituteId, setInstituteId] = useState(user?.instituteId ?? '');
  const {
    data: options,
    isLoading: listLoading,
    error: listError,
    refetch: refetchOptions,
    isRefetching: isRefreshing,
  } = useQuestionOptions(questionId || null);

  // ── Create form ────────────────────────────────────────────────────────
  const [optionText, setOptionText] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [orderSequence, setOrderSequence] = useState('1');

  // ── Replace form ───────────────────────────────────────────────────────
  const [replaceOptionsText, setReplaceOptionsText] = useState('');
  const [replaceQuestionType, setReplaceQuestionType] = useState<QuestionType>('mcq');

  // ── Reorder form ────────────────────────────────────────────────────────
  const [reorderData, setReorderData] = useState('');

  // ── Selection ───────────────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null);

  // ── Update form ─────────────────────────────────────────────────────────
  const [updateText, setUpdateText] = useState('');
  const [updateIsCorrect, setUpdateIsCorrect] = useState(false);
  const [updateDisplayOrder, setUpdateDisplayOrder] = useState('');

  // ── Debug ───────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ───────────────────────────────────────────────────────────
  const createMutation = useCreateQuestionOption();
  const updateMutation = useUpdateQuestionOption();
  const deleteMutation = useDeleteQuestionOption();
  const replaceMutation = useReplaceQuestionOptions();
  const reorderMutation = useReorderQuestionOptions();

  // ── Helpers ─────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useQuestionOptions().refetch()', { status: 'refetching...' });
    const result = await refetchOptions();
    setResult('useQuestionOptions().refetch()', { isSuccess: result.isSuccess });
  }, [refetchOptions, setResult]);

  const resetCreateForm = useCallback(() => {
    setOptionText('');
    setIsCorrect(false);
    setOrderSequence('1');
  }, []);

  const resetUpdateForm = useCallback(() => {
    setSelectedOption(null);
    setUpdateText('');
    setUpdateIsCorrect(false);
    setUpdateDisplayOrder('');
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }
    if (!optionText.trim()) {
      Alert.alert('Validation', 'Option text is required.'); return;
    }

    createMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      optionText: optionText.trim(),
      isCorrect,
      orderSequence: parseInt(orderSequence, 10) || 1,
    }, {
      onSuccess: (data) => {
        setResult('useCreateQuestionOption()', { success: true, data });
        resetCreateForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useCreateQuestionOption()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, optionText, isCorrect, orderSequence, resetCreateForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(() => {
    if (!selectedOption) { Alert.alert('Select', 'Select an option first.'); return; }

    const input: { optionText?: string; isCorrect?: boolean; displayOrder?: number } = {};
    if (updateText.trim()) input.optionText = updateText.trim();
    input.isCorrect = updateIsCorrect;
    if (updateDisplayOrder) input.displayOrder = parseInt(updateDisplayOrder, 10) || undefined;

    updateMutation.mutate({
      questionId: selectedOption.questionId,
      optionId: selectedOption.optionId,
      input,
    }, {
      onSuccess: (data) => {
        setResult('useUpdateQuestionOption()', { success: true, data });
        resetUpdateForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useUpdateQuestionOption()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [selectedOption, updateText, updateIsCorrect, updateDisplayOrder, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((opt: QuestionOption) => {
    Alert.alert('Delete Option', `Delete option "${opt.optionText.slice(0, 30)}..."?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate({ questionId: opt.questionId, optionId: opt.optionId }, {
          onSuccess: () => {
            setResult('useDeleteQuestionOption()', { success: true });
            refreshList();
          },
          onError: (err) => {
            setResult('useDeleteQuestionOption()', { success: false, error: err.message });
            Alert.alert('Error', err.message);
          },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handleReplace = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }

    // Parse options: one per line, format: "text|isCorrect|order"
    // Or simple: each line is option text, first line with leading * is correct
    const lines = replaceOptionsText.trim().split('\n').filter((l) => l.trim());
    const entries = lines.map((line, i) => {
      const trimmed = line.trim();
      const isCorrectOption = trimmed.startsWith('*');
      const text = isCorrectOption ? trimmed.slice(1).trim() : trimmed;
      return {
        optionText: text,
        isCorrect: isCorrectOption,
        orderSequence: i + 1,
      };
    });

    if (entries.length < 2) {
      Alert.alert('Validation', 'At least 2 options required (one per line). Mark correct with leading *'); return;
    }

    replaceMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      options: entries,
      questionType: replaceQuestionType,
    }, {
      onSuccess: (data) => {
        setResult('useReplaceQuestionOptions()', { success: true, count: data.length, data });
        Alert.alert('Success', `${data.length} options replaced.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useReplaceQuestionOptions()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, replaceOptionsText, replaceQuestionType, replaceMutation, setResult, refreshList]);

  const handleReorder = useCallback(() => {
    if (!questionId.trim()) { Alert.alert('Validation', 'Question ID is required.'); return; }

    // Parse: one per line, format: "optionId|displayOrder"
    const lines = reorderData.trim().split('\n').filter((l) => l.trim());
    const items = lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      return { optionId: parts[0], displayOrder: parseInt(parts[1], 10) || 1 };
    });

    if (items.length === 0) {
      Alert.alert('Validation', 'At least one reorder item required (optionId|displayOrder per line).'); return;
    }

    reorderMutation.mutate({ questionId: questionId.trim(), items }, {
      onSuccess: () => {
        setResult('useReorderQuestionOptions()', { success: true, items });
        Alert.alert('Success', `${items.length} options reordered.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useReorderQuestionOptions()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, reorderData, reorderMutation, setResult, refreshList]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || replaceMutation.isPending || reorderMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render item ─────────────────────────────────────────────────────────
  const renderOptionItem = ({ item }: { item: QuestionOption }) => {
    const isSelected = selectedOption?.optionId === item.optionId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => {
          if (isSelected) resetUpdateForm();
          else {
            setSelectedOption(item);
            setUpdateText(item.optionText);
            setUpdateIsCorrect(item.isCorrect);
            setUpdateDisplayOrder(String(item.orderSequence));
          }
        }}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemOptionText}>{item.optionText}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <Text style={[styles.badge, item.isCorrect ? styles.correctBadge : styles.wrongBadge]}>
              {item.isCorrect ? '✅ Correct' : '❌ Wrong'}
            </Text>
            <Text style={styles.itemOrder}>Order: {item.orderSequence}</Text>
          </View>
          <Text style={styles.itemId}>ID: {item.optionId.slice(0, 12)}...</Text>
        </View>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Text style={[styles.smallBtnText, { color: '#D32F2F' }]}>Del</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshList} tintColor="#6C63FF" />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Options Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Question ID Section ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Target Question</Text>
          <TextInput style={styles.input} placeholder="Question ID (UUID) *" placeholderTextColor="#999" value={questionId} onChangeText={setQuestionId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Institute ID (UUID) *" placeholderTextColor="#999" value={instituteId} onChangeText={setInstituteId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={!questionId.trim() || listLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Options'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Create Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Create Option</Text>
          <TextInput style={styles.input} placeholder="Option Text *" placeholderTextColor="#999" value={optionText} onChangeText={setOptionText} multiline />
          <TextInput style={styles.input} placeholder="Order Sequence (1-based) *" placeholderTextColor="#999" value={orderSequence} onChangeText={setOrderSequence} keyboardType="numeric" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Correct Answer</Text>
            <TouchableOpacity style={[styles.toggleButton, isCorrect && styles.toggleActive]} onPress={() => setIsCorrect(!isCorrect)} activeOpacity={0.7}>
              <Text style={[styles.toggleText, isCorrect && styles.toggleTextActive]}>{isCorrect ? 'YES' : 'NO'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Creating...' : '➕ Create Option'}</Text>
          </TouchableOpacity>

          {createMutation.isError && <Text style={styles.errorText}>{createMutation.error?.message}</Text>}
        </View>

        {/* ── Update Section ──────────────────────────────────────────── */}
        {selectedOption && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Update Option</Text>
            <Text style={styles.updateHint}>Selected: {selectedOption.optionId.slice(0, 12)}...</Text>
            <TextInput style={styles.input} placeholder="Option Text" placeholderTextColor="#999" value={updateText} onChangeText={setUpdateText} multiline />
            <TextInput style={styles.input} placeholder="Display Order" placeholderTextColor="#999" value={updateDisplayOrder} onChangeText={setUpdateDisplayOrder} keyboardType="numeric" />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Correct Answer</Text>
              <TouchableOpacity style={[styles.toggleButton, updateIsCorrect && styles.toggleActive]} onPress={() => setUpdateIsCorrect(!updateIsCorrect)} activeOpacity={0.7}>
                <Text style={[styles.toggleText, updateIsCorrect && styles.toggleTextActive]}>{updateIsCorrect ? 'YES' : 'NO'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdate} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Replace Section ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Replace Options</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            One option per line. Prefix correct answer(s) with *. Example:
          </Text>
          <Text style={{ fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginBottom: 8, backgroundColor: '#F5F5F5', padding: 8, borderRadius: 6 }}>
            *Newton's First Law{'\n'}Newton's Second Law{'\n'}Newton's Third Law{'\n'}Law of Gravitation
          </Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Options..." placeholderTextColor="#999" value={replaceOptionsText} onChangeText={setReplaceOptionsText} multiline />

          <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Question Type:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {(['mcq', 'msq', 'true_false'] as QuestionType[]).map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, replaceQuestionType === t && styles.chipActive]} onPress={() => setReplaceQuestionType(t)} activeOpacity={0.7}>
                <Text style={[styles.chipText, replaceQuestionType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, styles.primaryButton, { backgroundColor: '#FF6B35' }]} onPress={handleReplace} disabled={replaceMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{replaceMutation.isPending ? 'Replacing...' : '🔄 Replace All Options'}</Text>
          </TouchableOpacity>

          {replaceMutation.isError && <Text style={styles.errorText}>{replaceMutation.error?.message}</Text>}
        </View>

        {/* ── Reorder Section ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔀 Reorder Options</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            One per line: optionId|displayOrder
          </Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="uuid-a|2\nuuid-b|1\nuuid-c|3" placeholderTextColor="#999" value={reorderData} onChangeText={setReorderData} multiline />
          <TouchableOpacity style={[styles.button, styles.primaryButton, { backgroundColor: '#7B1FA2' }]} onPress={handleReorder} disabled={reorderMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{reorderMutation.isPending ? 'Reordering...' : '🔀 Reorder'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── List Section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Options List</Text>
          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {options && options.length > 0 ? (
            <FlatList
              data={options}
              renderItem={renderOptionItem}
              keyExtractor={(item) => item.optionId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            !listLoading && <Text style={styles.emptyText}>Load options by entering a Question ID above.</Text>
          )}
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            if (questionId.trim()) {
              queryClient.invalidateQueries({ queryKey: questionKeys.options.list(questionId.trim()) });
            }
            setResult('invalidateQueries', { status: 'invalidated' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Options:</Text><Text style={styles.debugValue}>{options?.length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedOption ? selectedOption.optionId.slice(0, 12) : 'none'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Correct Count:</Text><Text style={styles.debugValue}>{options?.filter((o) => o.isCorrect).length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{questionId && queryClient.getQueryData(questionKeys.options.list(questionId)) ? 'cached' : 'empty'}</Text></View>
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
  updateHint: { fontSize: 12, color: '#6C63FF', fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  chipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#FFFFFF' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  toggleButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  toggleActive: { backgroundColor: '#E8F5E9' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#C62828' },
  toggleTextActive: { color: '#2E7D32' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, minWidth: 40, alignItems: 'center' },
  smallBtnText: { fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemOptionText: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  correctBadge: { backgroundColor: '#E8F5E9', color: '#2E7D32' },
  wrongBadge: { backgroundColor: '#FFEBEE', color: '#C62828' },
  itemOrder: { fontSize: 11, color: '#888' },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
});
