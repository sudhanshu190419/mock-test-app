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
  useMockTestQuestions,
  useMockTestQuestion,
  useAddQuestionToMockTest,
  useUpdateMockTestQuestion,
  useRemoveQuestionFromMockTest,
  useAddQuestionsToMockTest,
  useReplaceMockTestQuestions,
  useReorderMockTestQuestions,
} from '../../hooks/mockTest/useMockTestQuestions';
import { mockTestKeys } from '../../hooks/mockTest/queryKeys';
import type { MockTestQuestion } from '../../types/mockTest';
import type {
  QuestionAssignment,
  ReorderItem,
} from '../../services/mockTest/mockTestQuestionService';

export default function MockTestQuestionTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();

  // ── Test ID ─────────────────────────────────────────────────────────────
  const [testId, setTestId] = useState('');

  // ── List query ──────────────────────────────────────────────────────────
  const {
    data: questions,
    isLoading: listLoading,
    error: listError,
    refetch: refetchQuestions,
    isRefetching: isRefreshing,
  } = useMockTestQuestions(testId || null);
  const questionList = questions ?? [];

  // ── Add single question form ───────────────────────────────────────────
  const [addQuestionId, setAddQuestionId] = useState('');
  const [addOrderSeq, setAddOrderSeq] = useState('1');
  const [addMarks, setAddMarks] = useState('');
  const [addNegOverride, setAddNegOverride] = useState('');
  const [addSection, setAddSection] = useState('');

  // ── Bulk add / replace ─────────────────────────────────────────────────
  const [bulkJson, setBulkJson] = useState('');

  // ── Reorder ────────────────────────────────────────────────────────────
  const [reorderJson, setReorderJson] = useState('');

  // ── Detail lookup ──────────────────────────────────────────────────────
  const [detailQuestionId, setDetailQuestionId] = useState('');
  const { data: detailAssignment } = useMockTestQuestion(
    testId || null,
    detailQuestionId || null,
  );

  // ── Update section / marks / order ─────────────────────────────────────
  const [selectedAssignment, setSelectedAssignment] = useState<MockTestQuestion | null>(null);
  const [updateOrder, setUpdateOrder] = useState('');
  const [updateSection, setUpdateSection] = useState('');
  const [updateMarksOverride, setUpdateMarksOverride] = useState('');
  const [updateNegOverride, setUpdateNegOverride] = useState('');

  // ── Debug ───────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ───────────────────────────────────────────────────────────
  const addMutation = useAddQuestionToMockTest();
  const updateMutation = useUpdateMockTestQuestion();
  const removeMutation = useRemoveQuestionFromMockTest();
  const bulkAddMutation = useAddQuestionsToMockTest();
  const replaceMutation = useReplaceMockTestQuestions();
  const reorderMutation = useReorderMockTestQuestions();

  // ── Helpers ─────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useMockTestQuestions().refetch()', { status: 'refetching...' });
    const result = await refetchQuestions();
    setResult('useMockTestQuestions().refetch()', { isSuccess: result.isSuccess, count: result.data?.length ?? 0 });
  }, [refetchQuestions, setResult]);

  const clearForms = useCallback(() => {
    setAddQuestionId(''); setAddOrderSeq('1'); setAddMarks(''); setAddNegOverride(''); setAddSection('');
    setBulkJson(''); setReorderJson(''); setDetailQuestionId('');
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleAddQuestion = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID first.'); return; }
    if (!addQuestionId.trim()) { Alert.alert('Validation', 'Question ID is required.'); return; }

    addMutation.mutate({
      testId: testId.trim(),
      questionId: addQuestionId.trim(),
      orderSequence: parseInt(addOrderSeq, 10) || 1,
      marks: addMarks.trim() ? parseInt(addMarks, 10) : undefined,
      negativeMarksOverride: addNegOverride.trim() ? parseInt(addNegOverride, 10) : null,
      sectionName: addSection.trim() || null,
    }, {
      onSuccess: (data) => {
        setResult('useAddQuestionToMockTest()', { success: true, questionId: data.questionId });
        Alert.alert('Success', 'Question added to test.');
        refreshList();
      },
      onError: (err) => {
        setResult('useAddQuestionToMockTest()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [testId, addQuestionId, addOrderSeq, addMarks, addNegOverride, addSection, addMutation, setResult, refreshList]);

  const handleUpdateAssignment = useCallback(() => {
    if (!selectedAssignment || !testId.trim()) { Alert.alert('Select', 'Select an assignment from the list first.'); return; }

    updateMutation.mutate({
      testId: testId.trim(),
      questionId: selectedAssignment.questionId,
      orderSequence: updateOrder.trim() ? parseInt(updateOrder, 10) : undefined,
      section: updateSection !== undefined ? (updateSection.trim() || null) : undefined,
      marksOverride: updateMarksOverride.trim() ? parseInt(updateMarksOverride, 10) : undefined,
      negativeMarksOverride: updateNegOverride.trim() ? parseInt(updateNegOverride, 10) : null,
    }, {
      onSuccess: (data) => {
        setResult('useUpdateMockTestQuestion()', { success: true, orderSequence: data.orderSequence });
        Alert.alert('Success', 'Assignment updated.');
        refreshList();
      },
      onError: (err) => {
        setResult('useUpdateMockTestQuestion()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [selectedAssignment, testId, updateOrder, updateSection, updateMarksOverride, updateNegOverride, updateMutation, setResult, refreshList]);

  const handleRemoveQuestion = useCallback((assignment: MockTestQuestion) => {
    if (!testId.trim()) return;
    Alert.alert('Remove Question', `Remove question "${assignment.questionId.slice(0, 12)}..." from the test?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        removeMutation.mutate(
          { testId: testId.trim(), questionId: assignment.questionId },
          {
            onSuccess: () => {
              setResult('useRemoveQuestionFromMockTest()', { success: true });
              Alert.alert('Removed', 'Question removed from test.');
              refreshList();
            },
            onError: (err) => {
              setResult('useRemoveQuestionFromMockTest()', { success: false, error: err.message });
              Alert.alert('Error', err.message);
            },
          },
        );
      }},
    ]);
  }, [testId, removeMutation, setResult, refreshList]);

  const handleBulkAdd = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID first.'); return; }
    if (!bulkJson.trim()) { Alert.alert('Validation', 'Enter JSON array of assignments.'); return; }

    let assignments: QuestionAssignment[];
    try {
      assignments = JSON.parse(bulkJson.trim());
      if (!Array.isArray(assignments)) throw new Error('Must be an array.');
    } catch (e) {
      Alert.alert('Invalid JSON', (e as Error).message);
      return;
    }

    bulkAddMutation.mutate({ testId: testId.trim(), assignments }, {
      onSuccess: (data) => {
        setResult('useAddQuestionsToMockTest()', { success: true, count: data.length });
        Alert.alert('Success', `${data.length} questions added.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useAddQuestionsToMockTest()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [testId, bulkJson, bulkAddMutation, setResult, refreshList]);

  const handleReplace = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID first.'); return; }
    if (!bulkJson.trim()) { Alert.alert('Validation', 'Enter JSON array of assignments.'); return; }

    let assignments: QuestionAssignment[];
    try {
      assignments = JSON.parse(bulkJson.trim());
      if (!Array.isArray(assignments)) throw new Error('Must be an array.');
    } catch (e) {
      Alert.alert('Invalid JSON', (e as Error).message);
      return;
    }

    replaceMutation.mutate({ testId: testId.trim(), assignments }, {
      onSuccess: (data) => {
        setResult('useReplaceMockTestQuestions()', { success: true, count: data.length });
        Alert.alert('Success', `Replaced with ${data.length} questions.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useReplaceMockTestQuestions()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [testId, bulkJson, replaceMutation, setResult, refreshList]);

  const handleReorder = useCallback(() => {
    if (!testId.trim()) { Alert.alert('Validation', 'Enter a Test ID first.'); return; }
    if (!reorderJson.trim()) { Alert.alert('Validation', 'Enter JSON array of reorder items.'); return; }

    let items: ReorderItem[];
    try {
      items = JSON.parse(reorderJson.trim());
      if (!Array.isArray(items)) throw new Error('Must be an array.');
    } catch (e) {
      Alert.alert('Invalid JSON', (e as Error).message);
      return;
    }

    reorderMutation.mutate({ testId: testId.trim(), items }, {
      onSuccess: (data) => {
        setResult('useReorderMockTestQuestions()', { success: true, count: data.length });
        Alert.alert('Success', 'Questions reordered.');
        refreshList();
      },
      onError: (err) => {
        setResult('useReorderMockTestQuestions()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [testId, reorderJson, reorderMutation, setResult, refreshList]);

  const isMutating = addMutation.isPending || updateMutation.isPending || removeMutation.isPending
    || bulkAddMutation.isPending || replaceMutation.isPending || reorderMutation.isPending;

  // ── Select assignment for update ───────────────────────────────────────
  const selectForUpdate = useCallback((assignment: MockTestQuestion) => {
    setSelectedAssignment(assignment);
    setUpdateOrder(String(assignment.orderSequence));
    setUpdateSection(assignment.sectionName ?? '');
    setUpdateMarksOverride(String(assignment.marks));
    setUpdateNegOverride(assignment.negativeMarksOverride != null ? String(assignment.negativeMarksOverride) : '');
  }, []);

  // ── Render item ─────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: MockTestQuestion }) => {
    const isSelected = selectedAssignment?.questionId === item.questionId && selectedAssignment?.testId === item.testId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => selectForUpdate(item)}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.badge, { backgroundColor: '#6C63FF', color: '#FFF' }]}>#{item.orderSequence}</Text>
            <Text style={styles.itemTitle}>Q: {item.questionId.slice(0, 12)}...</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {item.sectionName && (
              <Text style={[styles.badge, { backgroundColor: '#FFF3E0', color: '#E65100' }]}>{item.sectionName}</Text>
            )}
            <Text style={[styles.badge, { backgroundColor: '#E8F5E9', color: '#2E7D32' }]}>{item.marks}m</Text>
            {item.negativeMarksOverride != null && (
              <Text style={[styles.badge, { backgroundColor: '#FFEBEE', color: '#C62828' }]}>-{item.negativeMarksOverride}</Text>
            )}
            {item.questionSnapshot ? (
              <Text style={[styles.badge, { backgroundColor: '#E3F2FD', color: '#1565C0' }]}>snap</Text>
            ) : (
              <Text style={[styles.badge, { backgroundColor: '#F5F5F5', color: '#999' }]}>no snap</Text>
            )}
          </View>
          <Text style={styles.itemId}>Test: {item.testId.slice(0, 12)}... · Added: {item.addedAt.slice(0, 10)}</Text>
        </View>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleRemoveQuestion(item)} activeOpacity={0.7}>
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
          <Text style={styles.headerTitle}>🧪 Mock Test Question Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Assign, update, remove, reorder questions</Text>
        </View>

        {/* ── Test ID Input ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Mock Test ID</Text>
          <TextInput style={styles.input} placeholder="Test ID (UUID) *" placeholderTextColor="#999" value={testId} onChangeText={setTestId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={listLoading || !testId.trim()} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Questions'}</Text>
          </TouchableOpacity>
          {questions && (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Total Assigned:</Text>
              <Text style={styles.debugValue}>{questionList.length}</Text>
            </View>
          )}
        </View>

        {/* ── Add Single Question ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Add Single Question</Text>
          <TextInput style={styles.input} placeholder="Question ID (UUID) *" placeholderTextColor="#999" value={addQuestionId} onChangeText={setAddQuestionId} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Display Order" placeholderTextColor="#999" value={addOrderSeq} onChangeText={setAddOrderSeq} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marks (optional)" placeholderTextColor="#999" value={addMarks} onChangeText={setAddMarks} keyboardType="numeric" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Neg. Override" placeholderTextColor="#999" value={addNegOverride} onChangeText={setAddNegOverride} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Section" placeholderTextColor="#999" value={addSection} onChangeText={setAddSection} autoCapitalize="none" />
          </View>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleAddQuestion} disabled={addMutation.isPending || !testId.trim()} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{addMutation.isPending ? 'Adding...' : '➕ Add Question'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Update Assignment ───────────────────────────────────────── */}
        {selectedAssignment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Update Assignment</Text>
            <Text style={styles.updateHint}>Q: {selectedAssignment.questionId.slice(0, 12)}... (order: {selectedAssignment.orderSequence})</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Display Order" placeholderTextColor="#999" value={updateOrder} onChangeText={setUpdateOrder} keyboardType="numeric" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Section" placeholderTextColor="#999" value={updateSection} onChangeText={setUpdateSection} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marks Override" placeholderTextColor="#999" value={updateMarksOverride} onChangeText={setUpdateMarksOverride} keyboardType="numeric" />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Neg. Override" placeholderTextColor="#999" value={updateNegOverride} onChangeText={setUpdateNegOverride} keyboardType="numeric" />
            </View>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateAssignment} disabled={updateMutation.isPending} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bulk Operations ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Bulk Operations</Text>

          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 }}>
            Bulk Add / Replace (JSON)
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 80, fontFamily: 'monospace', fontSize: 11 }]}
            placeholder='[{"questionId":"uuid","orderSequence":1,"marks":4}]'
            placeholderTextColor="#999"
            value={bulkJson}
            onChangeText={setBulkJson}
            multiline
            autoCapitalize="none"
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleBulkAdd} disabled={bulkAddMutation.isPending || !testId.trim()} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{bulkAddMutation.isPending ? 'Adding...' : '📥 Bulk Add'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#FF9800' }]} onPress={handleReplace} disabled={replaceMutation.isPending || !testId.trim()} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{replaceMutation.isPending ? 'Replacing...' : '🔄 Replace'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 12, marginBottom: 4 }}>
            Reorder (JSON)
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 60, fontFamily: 'monospace', fontSize: 11 }]}
            placeholder='[{"assignmentId":"testId::qId","displayOrder":1}]'
            placeholderTextColor="#999"
            value={reorderJson}
            onChangeText={setReorderJson}
            multiline
            autoCapitalize="none"
          />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleReorder} disabled={reorderMutation.isPending || !testId.trim()} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{reorderMutation.isPending ? 'Reordering...' : '🔀 Reorder'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Detail Lookup ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 View Assignment by ID</Text>
          <TextInput style={styles.input} placeholder="Question ID" placeholderTextColor="#999" value={detailQuestionId} onChangeText={setDetailQuestionId} autoCapitalize="none" />
          {detailAssignment ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Order: #{detailAssignment.orderSequence}</Text>
              <Text style={styles.debugLabel}>Marks: {detailAssignment.marks}</Text>
              <Text style={styles.debugLabel}>Neg. Override: {detailAssignment.negativeMarksOverride ?? '(test default)'}</Text>
              <Text style={styles.debugLabel}>Section: {detailAssignment.sectionName ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Snapshot: {detailAssignment.questionSnapshot ? 'exists' : 'null'}</Text>
              <Text style={styles.debugLabel}>Added At: {detailAssignment.addedAt}</Text>
            </View>
          ) : detailQuestionId ? <Text style={{ color: '#999', fontStyle: 'italic' }}>Loading or not found...</Text> : null}
        </View>

        {/* ── Question List ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Assigned Questions</Text>

          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {questionList.length > 0 ? (
            <FlatList
              data={questionList}
              renderItem={renderItem}
              keyExtractor={(item) => `${item.testId}::${item.questionId}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : !listLoading && <Text style={styles.emptyText}>Load questions for a test above.</Text>}
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: mockTestKeys.mockTestQuestions.lists() });
            queryClient.invalidateQueries({ queryKey: mockTestKeys.mockTests.lists() });
            setResult('invalidateQueries', { status: 'invalidated' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Test ID:</Text><Text style={styles.debugValue}>{testId ? `${testId.slice(0, 12)}...` : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{questionList.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedAssignment ? selectedAssignment.questionId.slice(0, 12) : 'none'}</Text></View>
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
  updateHint: { fontSize: 12, color: '#6C63FF', fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, minWidth: 40, alignItems: 'center' },
  smallBtnText: { fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
  debugBox: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E8FF' },
});
