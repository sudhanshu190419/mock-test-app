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
  useQuestions,
  useQuestion,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  usePublishQuestion,
  useArchiveQuestion,
  useRestoreQuestion,
} from '../../hooks/mockTest/useQuestions';
import { questionKeys } from '../../hooks/mockTest/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type {
  Question,
  QuestionFilters,
  QuestionType,
  DifficultyLevel,
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../../types/mockTest';

export default function QuestionTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List query ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<QuestionFilters>({});
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchQuestions,
    isRefetching: isRefreshing,
  } = useQuestions(filters);
  const questions = paginatedData?.data ?? [];

  // ── Create / Update form ──────────────────────────────────────────────
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [marks, setMarks] = useState('4');
  const [negativeMarks, setNegativeMarks] = useState('1');
  const [createdBy, setCreatedBy] = useState('');

  // ── Selection ─────────────────────────────────────────────────────────
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Update form ───────────────────────────────────────────────────────
  const [updateText, setUpdateText] = useState('');
  const [updateMarks, setUpdateMarks] = useState('');
  const [updateNegMarks, setUpdateNegMarks] = useState('');
  const [updateDifficulty, setUpdateDifficulty] = useState<DifficultyLevel>('medium');

  // ── Detail lookup ─────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState('');
  const { data: detailQuestion } = useQuestion(detailId || null);

  // ── Filters ───────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterQuestionType, setFilterQuestionType] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterChapterId, setFilterChapterId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Debug ─────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useCreateQuestion();
  const updateMutation = useUpdateQuestion();
  const deleteMutation = useDeleteQuestion();
  const publishMutation = usePublishQuestion();
  const archiveMutation = useArchiveQuestion();
  const restoreMutation = useRestoreQuestion();

  // ── Helpers ───────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useQuestions().refetch()', { status: 'refetching...' });
    const result = await refetchQuestions();
    setResult('useQuestions().refetch()', { isSuccess: result.isSuccess });
  }, [refetchQuestions, setResult]);

  const resetCreateForm = useCallback(() => {
    setSubjectId('');
    setChapterId('');
    setQuestionText('');
    setQuestionType('mcq');
    setDifficulty('medium');
    setMarks('4');
    setNegativeMarks('1');
    setCreatedBy('');
  }, []);

  const populateUpdateForm = useCallback((q: Question) => {
    setSelectedQuestion(q);
    setUpdateText(q.questionText);
    setUpdateMarks(String(q.marks));
    setUpdateNegMarks(String(q.negativeMarks));
    setUpdateDifficulty(q.difficulty);
    setUpdating(true);
  }, []);

  const resetUpdateForm = useCallback(() => {
    setSelectedQuestion(null);
    setUpdating(false);
    setUpdateText('');
    setUpdateMarks('');
    setUpdateNegMarks('');
    setUpdateDifficulty('medium');
  }, []);

  const applyFilters = useCallback(() => {
    const f: QuestionFilters = {};
    if (filterStatus) f.status = filterStatus as QuestionFilters['status'];
    if (filterDifficulty) f.difficulty = filterDifficulty as DifficultyLevel;
    if (filterQuestionType) f.questionType = filterQuestionType as QuestionType;
    if (filterSubjectId.trim()) f.subjectId = filterSubjectId.trim();
    if (filterChapterId.trim()) f.chapterId = filterChapterId.trim();
    if (filterSearch.trim()) f.search = filterSearch.trim();
    if (user?.instituteId) f.instituteId = user.instituteId;
    setFilters(f);
    setResult('setFilters()', f);
  }, [filterStatus, filterDifficulty, filterQuestionType, filterSubjectId, filterChapterId, filterSearch, user]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    if (!user?.instituteId) {
      Alert.alert('Cannot Create', 'User missing instituteId.'); return;
    }
    if (!subjectId.trim() || !chapterId.trim() || !questionText.trim()) {
      Alert.alert('Validation', 'Subject ID, Chapter ID, and Question Text are required.'); return;
    }

    const input: CreateQuestionInput = {
      instituteId: user.instituteId,
      subjectId: subjectId.trim(),
      chapterId: chapterId.trim(),
      createdBy: createdBy.trim() || user.id || '',
      questionType,
      difficulty,
      questionText: questionText.trim(),
      marks: parseInt(marks, 10) || 4,
      negativeMarks: parseInt(negativeMarks, 10) || 0,
    };

    createMutation.mutate(input, {
      onSuccess: (data) => {
        setResult('useCreateQuestion()', { success: true, data });
        Alert.alert('Success', `Question "${data.questionId.slice(0, 8)}..." created.`);
        resetCreateForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useCreateQuestion()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [user, subjectId, chapterId, questionText, questionType, difficulty, marks, negativeMarks, createdBy, resetCreateForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(() => {
    if (!selectedQuestion) { Alert.alert('Select', 'Select a question first.'); return; }

    const input: UpdateQuestionInput = {};
    if (updateText.trim()) input.questionText = updateText.trim();
    if (updateMarks) input.marks = parseInt(updateMarks, 10) || undefined;
    if (updateNegMarks) input.negativeMarks = parseInt(updateNegMarks, 10) || undefined;
    input.difficulty = updateDifficulty;

    updateMutation.mutate(
      { id: selectedQuestion.questionId, input },
      {
        onSuccess: (data) => {
          setResult('useUpdateQuestion()', { success: true, data });
          Alert.alert('Success', 'Question updated.');
          resetUpdateForm();
          refreshList();
        },
        onError: (err) => {
          setResult('useUpdateQuestion()', { success: false, error: err.message });
          Alert.alert('Error', err.message);
        },
      },
    );
  }, [selectedQuestion, updateText, updateMarks, updateNegMarks, updateDifficulty, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((q: Question) => {
    Alert.alert('Delete Question', `Delete question "${q.questionId.slice(0, 8)}..."?\n\nThis cannot be undone if no FK references exist.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(q.questionId, {
          onSuccess: () => {
            setResult('useDeleteQuestion()', { success: true });
            Alert.alert('Deleted', 'Question deleted.');
            refreshList();
          },
          onError: (err) => {
            setResult('useDeleteQuestion()', { success: false, error: err.message });
            Alert.alert('Delete Failed', err.message);
          },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handlePublish = useCallback((q: Question) => {
    publishMutation.mutate(q.questionId, {
      onSuccess: (d) => { setResult('usePublishQuestion()', d); refreshList(); },
      onError: (e) => { setResult('usePublishQuestion()', e.message); Alert.alert('Error', e.message); },
    });
  }, [publishMutation, setResult, refreshList]);

  const handleArchive = useCallback((q: Question) => {
    archiveMutation.mutate(q.questionId, {
      onSuccess: (d) => { setResult('useArchiveQuestion()', d); refreshList(); },
      onError: (e) => { setResult('useArchiveQuestion()', e.message); Alert.alert('Error', e.message); },
    });
  }, [archiveMutation, setResult, refreshList]);

  const handleRestore = useCallback((q: Question) => {
    restoreMutation.mutate(q.questionId, {
      onSuccess: (d) => { setResult('useRestoreQuestion()', d); refreshList(); },
      onError: (e) => { setResult('useRestoreQuestion()', e.message); Alert.alert('Error', e.message); },
    });
  }, [restoreMutation, setResult, refreshList]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || publishMutation.isPending || archiveMutation.isPending || restoreMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render item ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Question }) => {
    const isSelected = selectedQuestion?.questionId === item.questionId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => isSelected ? resetUpdateForm() : populateUpdateForm(item)}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle} numberOfLines={2}>{item.questionText}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            <Text style={[styles.badge, { backgroundColor: statusColor(item.status).bg, color: statusColor(item.status).fg }]}>{item.status}</Text>
            <Text style={[styles.badge, { backgroundColor: '#E3F2FD', color: '#1565C0' }]}>{item.difficulty}</Text>
            <Text style={[styles.badge, { backgroundColor: '#F3E5F5', color: '#7B1FA2' }]}>{item.questionType}</Text>
            <Text style={[styles.badge, { backgroundColor: '#FFF3E0', color: '#E65100' }]}>{item.marks}m</Text>
          </View>
          <Text style={styles.itemMeta}>v{item.version} · {item.timesAttempted} attempts</Text>
          <Text style={styles.itemId}>ID: {item.questionId.slice(0, 12)}...</Text>
        </View>
        <View style={{ gap: 4, marginLeft: 8 }}>
          {item.status === 'pending_approval' && (
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handlePublish(item)} activeOpacity={0.7}>
              <Text style={[styles.smallBtnText, { color: '#2E7D32' }]}>Pub</Text>
            </TouchableOpacity>
          )}
          {item.status === 'published' && (
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleArchive(item)} activeOpacity={0.7}>
              <Text style={[styles.smallBtnText, { color: '#E65100' }]}>Arc</Text>
            </TouchableOpacity>
          )}
          {item.status === 'archived' && (
            <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleRestore(item)} activeOpacity={0.7}>
              <Text style={[styles.smallBtnText, { color: '#1565C0' }]}>Res</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDelete(item)} activeOpacity={0.7}>
            <Text style={[styles.smallBtnText, { color: '#D32F2F' }]}>Del</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.headerTitle}>🧪 Question Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Create Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{updating ? '✏️ Update Question' : '➕ Create Question'}</Text>

          {updating && selectedQuestion && (
            <Text style={styles.updateHint}>Updating: {selectedQuestion.questionId.slice(0, 12)}... ({selectedQuestion.status})</Text>
          )}

          <TextInput style={styles.input} placeholder="Subject ID (UUID) *" placeholderTextColor="#999" value={subjectId} onChangeText={setSubjectId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Chapter ID (UUID) *" placeholderTextColor="#999" value={chapterId} onChangeText={setChapterId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Created By (UUID)" placeholderTextColor="#999" value={createdBy} onChangeText={setCreatedBy} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Question Text *" placeholderTextColor="#999" value={questionText} onChangeText={setQuestionText} multiline />

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {(['mcq', 'msq', 'numerical', 'true_false'] as QuestionType[]).map((t) => (
                  <TouchableOpacity key={t} style={[styles.chip, questionType === t && styles.chipActive]} onPress={() => setQuestionType(t)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, questionType === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Difficulty</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((d) => (
                  <TouchableOpacity key={d} style={[styles.chip, difficulty === d && styles.chipActive]} onPress={() => setDifficulty(d)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, difficulty === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marks" placeholderTextColor="#999" value={marks} onChangeText={setMarks} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Negative" placeholderTextColor="#999" value={negativeMarks} onChangeText={setNegativeMarks} keyboardType="numeric" />
          </View>

          <View style={styles.buttonRow}>
            {updating && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {!updating ? (
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Creating...' : '➕ Create'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdate} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Update fields (visible when updating) ────────────────── */}
          {updating && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A2E', marginTop: 12, marginBottom: 6 }}>Update Fields</Text>
              <TextInput style={styles.input} placeholder="Question Text" placeholderTextColor="#999" value={updateText} onChangeText={setUpdateText} multiline />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Marks" placeholderTextColor="#999" value={updateMarks} onChangeText={setUpdateMarks} keyboardType="numeric" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Negative" placeholderTextColor="#999" value={updateNegMarks} onChangeText={setUpdateNegMarks} keyboardType="numeric" />
              </View>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Difficulty</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((d) => (
                  <TouchableOpacity key={d} style={[styles.chip, updateDifficulty === d && styles.chipActive]} onPress={() => setUpdateDifficulty(d)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, updateDifficulty === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ── Filters Section ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Filters & Search</Text>
          <TextInput style={styles.input} placeholder="Search text..." placeholderTextColor="#999" value={filterSearch} onChangeText={setFilterSearch} />

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Subject ID" placeholderTextColor="#999" value={filterSubjectId} onChangeText={setFilterSubjectId} autoCapitalize="none" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Chapter ID" placeholderTextColor="#999" value={filterChapterId} onChangeText={setFilterChapterId} autoCapitalize="none" />
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Status</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {['', 'draft', 'pending_approval', 'published', 'archived'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.chip, filterStatus === s && styles.chipActive]} onPress={() => setFilterStatus(s)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s || 'All'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Difficulty</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {['', 'easy', 'medium', 'hard'].map((d) => (
                  <TouchableOpacity key={d} style={[styles.chip, filterDifficulty === d && styles.chipActive]} onPress={() => setFilterDifficulty(d)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, filterDifficulty === d && styles.chipTextActive]}>{d || 'All'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {['', 'mcq', 'msq', 'numerical', 'true_false'].map((t) => (
                  <TouchableOpacity key={t} style={[styles.chip, filterQuestionType === t && styles.chipActive]} onPress={() => setFilterQuestionType(t)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, filterQuestionType === t && styles.chipTextActive]}>{t || 'All'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={applyFilters} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔍 Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {/* ── Detail Lookup ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 View Question by ID</Text>
          <TextInput style={styles.input} placeholder="Question ID (UUID)" placeholderTextColor="#999" value={detailId} onChangeText={setDetailId} autoCapitalize="none" />
          {detailQuestion ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Status: {detailQuestion.status}</Text>
              <Text style={styles.debugLabel}>Type: {detailQuestion.questionType}</Text>
              <Text style={styles.debugLabel}>Difficulty: {detailQuestion.difficulty}</Text>
              <Text style={styles.debugLabel}>Marks: {detailQuestion.marks} / Neg: {detailQuestion.negativeMarks}</Text>
              <Text style={styles.debugLabel}>Version: {detailQuestion.version}</Text>
              <Text style={styles.debugLabel}>Times Attempted: {detailQuestion.timesAttempted}</Text>
              <Text style={styles.debugLabel}>Created By: {detailQuestion.createdBy.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Institute: {detailQuestion.instituteId.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Subject: {detailQuestion.subjectId.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Chapter: {detailQuestion.chapterId.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Approved: {detailQuestion.approvedAt ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Created: {detailQuestion.createdAt}</Text>
            </View>
          ) : detailId ? <Text style={{ color: '#999', fontStyle: 'italic' }}>Loading or not found...</Text> : null}
        </View>

        {/* ── Lifecycle Section (when a question is selected) ─────────── */}
        {selectedQuestion && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Lifecycle</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Current: <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>{selectedQuestion.status}</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handlePublish(selectedQuestion)} disabled={publishMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#2E7D32' }]}>📤 Publish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleArchive(selectedQuestion)} disabled={archiveMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#E65100' }]}>📦 Archive</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleRestore(selectedQuestion)} disabled={restoreMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#1565C0' }]}>♻️ Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── List Section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Questions</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Questions'}</Text>
          </TouchableOpacity>

          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {questions.length > 0 ? (
            <FlatList
              data={questions}
              renderItem={renderItem}
              keyExtractor={(item) => item.questionId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Questions" or adjust filters.</Text>}
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: questionKeys.questions.lists() });
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
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{questions.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedQuestion ? selectedQuestion.questionId.slice(0, 12) : 'none'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute:</Text><Text style={styles.debugValue}>{user?.instituteId ? user.instituteId.slice(0, 12) : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache Status:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(questionKeys.questions.lists()) ? 'cached' : 'empty'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Detail Cache:</Text><Text style={styles.debugValue}>{detailId && queryClient.getQueryData(questionKeys.questions.detail(detailId)) ? 'cached' : (detailId ? 'loading/empty' : '—')}</Text></View>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case 'draft': return { bg: '#F5F5F5', fg: '#666' };
    case 'pending_approval': return { bg: '#FFF8E1', fg: '#F57F17' };
    case 'published': return { bg: '#E8F5E9', fg: '#2E7D32' };
    case 'archived': return { bg: '#FFEBEE', fg: '#C62828' };
    default: return { bg: '#F5F5F5', fg: '#666' };
  }
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
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 4 },
  chipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#FFFFFF' },
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
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  itemMeta: { fontSize: 11, color: '#888', marginTop: 2 },
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
