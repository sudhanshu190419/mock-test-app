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
  useMockTests,
  useMockTest,
  useCreateMockTest,
  useUpdateMockTest,
  useDeleteMockTest,
  usePublishMockTest,
  useArchiveMockTest,
  useRestoreMockTest,
} from '../../hooks/mockTest/useMockTests';
import { mockTestKeys } from '../../hooks/mockTest/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { MockTest, CreateMockTestInput, UpdateMockTestInput } from '../../types/mockTest';
import type {
  MockTestServiceFilters,
  MockTestServiceSortOptions,
} from '../../services/mockTest/mockTestService';

export default function MockTestTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List query ────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<MockTestServiceFilters>({});
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchMockTests,
    isRefetching: isRefreshing,
  } = useMockTests(filters);
  const mockTests = paginatedData?.data ?? [];

  // ── Create form ───────────────────────────────────────────────────────
  const [streamId, setStreamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState('60');
  const [subjectId, setSubjectId] = useState('');
  const [passingMarks, setPassingMarks] = useState('');
  const [negativeMarking, setNegativeMarking] = useState('0');
  const [attemptLimit, setAttemptLimit] = useState('');
  const [testType, setTestType] = useState('practice');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');

  // ── Selection ─────────────────────────────────────────────────────────
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Detail lookup ─────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState('');
  const { data: detailTest } = useMockTest(detailId || null);

  // ── Filters ───────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStreamId, setFilterStreamId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');

  // ── Sort ──────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Debug ─────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ─────────────────────────────────────────────────────────
  const createMutation = useCreateMockTest();
  const updateMutation = useUpdateMockTest();
  const deleteMutation = useDeleteMockTest();
  const publishMutation = usePublishMockTest();
  const archiveMutation = useArchiveMockTest();
  const restoreMutation = useRestoreMockTest();

  // ── Helpers ───────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useMockTests().refetch()', { status: 'refetching...' });
    const result = await refetchMockTests();
    setResult('useMockTests().refetch()', { isSuccess: result.isSuccess, count: result.data?.data?.length ?? 0 });
  }, [refetchMockTests, setResult]);

  const resetForm = useCallback(() => {
    setStreamId(''); setTitle(''); setDescription(''); setDurationMin('60');
    setSubjectId(''); setPassingMarks(''); setNegativeMarking('0');
    setAttemptLimit(''); setTestType('practice'); setAvailableFrom(''); setAvailableUntil('');
  }, []);

  const populateUpdateForm = useCallback((test: MockTest) => {
    setSelectedTest(test);
    setStreamId(test.streamId); setTitle(test.title); setDescription(test.description ?? '');
    setDurationMin(String(test.durationMin)); setSubjectId(test.subjectId ?? '');
    setPassingMarks(test.passingMarks != null ? String(test.passingMarks) : '');
    setNegativeMarking(String(test.negativeMarking));
    setAttemptLimit(test.attemptLimit != null ? String(test.attemptLimit) : '');
    setTestType(test.testType); setAvailableFrom(test.availableFrom ?? ''); setAvailableUntil(test.availableUntil ?? '');
    setUpdating(true);
  }, []);

  const resetUpdateForm = useCallback(() => {
    setSelectedTest(null); setUpdating(false); resetForm();
  }, [resetForm]);

  const applyFilters = useCallback(() => {
    const f: MockTestServiceFilters = {};
    if (filterStatus) f.status = filterStatus as MockTestServiceFilters['status'];
    if (filterStreamId.trim()) f.streamId = filterStreamId.trim();
    if (filterSubjectId.trim()) f.subjectId = filterSubjectId.trim();
    if (filterBatchId.trim()) f.batchId = filterBatchId.trim();
    if (filterSearch.trim()) f.search = filterSearch.trim();
    if (filterCreatedBy.trim()) f.createdBy = filterCreatedBy.trim();
    if (user?.instituteId) f.instituteId = user.instituteId;
    setFilters(f);
    setResult('setFilters()', f);
  }, [filterStatus, filterStreamId, filterSubjectId, filterBatchId, filterSearch, filterCreatedBy, user]);

  const applySort = useCallback(() => {
    const s: MockTestServiceSortOptions = {
      sortBy: sortBy as MockTestServiceSortOptions['sortBy'],
      sortDirection: sortDir,
    };
    // Re-trigger query by setting filters again with same filters + new sort
    // We use a sort state to trigger re-fetch
    setResult('applySort()', s);
    refreshList();
  }, [sortBy, sortDir, refreshList, setResult]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    if (!user?.instituteId) {
      Alert.alert('Cannot Create', 'User missing instituteId.'); return;
    }
    if (!streamId.trim() || !title.trim()) {
      Alert.alert('Validation', 'Stream ID and Title are required.'); return;
    }

    const input: CreateMockTestInput = {
      instituteId: user.instituteId,
      teacherId: user.id || '',
      streamId: streamId.trim(),
      title: title.trim(),
      description: description.trim() || null,
      durationMin: parseInt(durationMin, 10) || 60,
      subjectId: subjectId.trim() || null,
      passingMarks: passingMarks.trim() ? parseInt(passingMarks, 10) : null,
      negativeMarking: parseInt(negativeMarking, 10) || 0,
      attemptLimit: attemptLimit.trim() ? parseInt(attemptLimit, 10) : null,
      testType: testType || 'practice',
      availableFrom: availableFrom.trim() || null,
      availableUntil: availableUntil.trim() || null,
    };

    createMutation.mutate(input, {
      onSuccess: (data) => {
        setResult('useCreateMockTest()', { success: true, testId: data.testId });
        Alert.alert('Success', `Mock Test "${data.title}" created.`);
        resetForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useCreateMockTest()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [user, streamId, title, description, durationMin, subjectId, passingMarks, negativeMarking, attemptLimit, testType, availableFrom, availableUntil, resetForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(() => {
    if (!selectedTest) { Alert.alert('Select', 'Select a test first.'); return; }

    const input: UpdateMockTestInput = {};
    if (title.trim()) input.title = title.trim();
    if (description !== undefined) input.description = description.trim() || null;
    if (durationMin) input.durationMin = parseInt(durationMin, 10);
    if (passingMarks !== undefined) input.passingMarks = passingMarks.trim() ? parseInt(passingMarks, 10) : null;
    if (negativeMarking) input.negativeMarking = parseInt(negativeMarking, 10);
    if (attemptLimit !== undefined) input.attemptLimit = attemptLimit.trim() ? parseInt(attemptLimit, 10) : null;
    if (testType) input.testType = testType;
    if (availableFrom !== undefined) input.availableFrom = availableFrom.trim() || null;
    if (availableUntil !== undefined) input.availableUntil = availableUntil.trim() || null;

    updateMutation.mutate(
      { id: selectedTest.testId, input },
      {
        onSuccess: (data) => {
          setResult('useUpdateMockTest()', { success: true, data });
          Alert.alert('Success', 'Mock test updated.');
          resetUpdateForm();
          refreshList();
        },
        onError: (err) => {
          setResult('useUpdateMockTest()', { success: false, error: err.message });
          Alert.alert('Error', err.message);
        },
      },
    );
  }, [selectedTest, title, description, durationMin, passingMarks, negativeMarking, attemptLimit, testType, availableFrom, availableUntil, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((test: MockTest) => {
    Alert.alert('Delete Mock Test', `Delete "${test.title}"?\n\nThis cannot be undone if no FK references exist.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(test.testId, {
          onSuccess: () => {
            setResult('useDeleteMockTest()', { success: true });
            Alert.alert('Deleted', 'Mock test deleted.');
            refreshList();
          },
          onError: (err) => {
            setResult('useDeleteMockTest()', { success: false, error: err.message });
            Alert.alert('Delete Failed', err.message);
          },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handlePublish = useCallback((test: MockTest) => {
    publishMutation.mutate(test.testId, {
      onSuccess: (d) => { setResult('usePublishMockTest()', { status: d.status }); refreshList(); },
      onError: (e) => { setResult('usePublishMockTest()', e.message); Alert.alert('Error', e.message); },
    });
  }, [publishMutation, setResult, refreshList]);

  const handleArchive = useCallback((test: MockTest) => {
    archiveMutation.mutate(test.testId, {
      onSuccess: (d) => { setResult('useArchiveMockTest()', { status: d.status }); refreshList(); },
      onError: (e) => { setResult('useArchiveMockTest()', e.message); Alert.alert('Error', e.message); },
    });
  }, [archiveMutation, setResult, refreshList]);

  const handleRestore = useCallback((test: MockTest) => {
    restoreMutation.mutate(test.testId, {
      onSuccess: (d) => { setResult('useRestoreMockTest()', { status: d.status }); refreshList(); },
      onError: (e) => { setResult('useRestoreMockTest()', e.message); Alert.alert('Error', e.message); },
    });
  }, [restoreMutation, setResult, refreshList]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || publishMutation.isPending || archiveMutation.isPending || restoreMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render item ───────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: MockTest }) => {
    const isSelected = selectedTest?.testId === item.testId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => isSelected ? resetUpdateForm() : populateUpdateForm(item)}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            <Text style={[styles.badge, { backgroundColor: statusColor(item.status).bg, color: statusColor(item.status).fg }]}>{item.status}</Text>
            <Text style={[styles.badge, { backgroundColor: '#E3F2FD', color: '#1565C0' }]}>{item.testType}</Text>
            <Text style={[styles.badge, { backgroundColor: '#FFF3E0', color: '#E65100' }]}>{item.durationMin}m</Text>
            <Text style={[styles.badge, { backgroundColor: '#F3E5F5', color: '#7B1FA2' }]}>{item.totalMarks}m</Text>
          </View>
          <Text style={styles.itemMeta}>Created: {item.createdAt.slice(0, 10)}</Text>
          <Text style={styles.itemId}>ID: {item.testId.slice(0, 12)}...</Text>
          {item.subjectId && <Text style={styles.itemId}>Subject: {item.subjectId.slice(0, 12)}...</Text>}
          {item.availableFrom && <Text style={styles.itemId}>From: {item.availableFrom.slice(0, 10)}</Text>}
          {item.availableUntil && <Text style={styles.itemId}>Until: {item.availableUntil.slice(0, 10)}</Text>}
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
          <Text style={styles.headerTitle}>🧪 Mock Test Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — CRUD, lifecycle, filters, search</Text>
        </View>

        {/* ── Create / Update Section ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{updating ? '✏️ Update Mock Test' : '➕ Create Mock Test'}</Text>
          {updating && selectedTest && (
            <Text style={styles.updateHint}>Updating: {selectedTest.title} ({selectedTest.status})</Text>
          )}

          {user?.instituteId ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValue} selectable>{user.instituteId}</Text>
            </View>
          ) : <Text style={{ color: '#D32F2F', fontSize: 12, marginBottom: 8 }}>⚠️ No institute ID available</Text>}

          <TextInput style={styles.input} placeholder="Title *" placeholderTextColor="#999" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#999" value={description} onChangeText={setDescription} multiline />
          <TextInput style={styles.input} placeholder="Stream ID (UUID) *" placeholderTextColor="#999" value={streamId} onChangeText={setStreamId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Subject ID (UUID, optional)" placeholderTextColor="#999" value={subjectId} onChangeText={setSubjectId} autoCapitalize="none" />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Duration (min)" placeholderTextColor="#999" value={durationMin} onChangeText={setDurationMin} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Neg. Marking" placeholderTextColor="#999" value={negativeMarking} onChangeText={setNegativeMarking} keyboardType="numeric" />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Passing Marks" placeholderTextColor="#999" value={passingMarks} onChangeText={setPassingMarks} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Attempt Limit" placeholderTextColor="#999" value={attemptLimit} onChangeText={setAttemptLimit} keyboardType="numeric" />
          </View>

          <TextInput style={styles.input} placeholder="Test Type (practice / mock / chapter_test / pyq_paper)" placeholderTextColor="#999" value={testType} onChangeText={setTestType} autoCapitalize="none" />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Available From" placeholderTextColor="#999" value={availableFrom} onChangeText={setAvailableFrom} autoCapitalize="none" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Available Until" placeholderTextColor="#999" value={availableUntil} onChangeText={setAvailableUntil} autoCapitalize="none" />
          </View>

          <View style={styles.buttonRow}>
            {updating && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, (!updating && !user?.instituteId) && styles.buttonDisabled]}
              onPress={updating ? handleUpdate : handleCreate}
              disabled={isLoading || (!updating && !user?.instituteId)}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {createMutation.isPending ? 'Creating...' : updateMutation.isPending ? 'Updating...' : updating ? '✏️ Update' : '➕ Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Filters & Sort Section ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Filters & Sort</Text>
          <TextInput style={styles.input} placeholder="Search title..." placeholderTextColor="#999" value={filterSearch} onChangeText={setFilterSearch} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Stream ID" placeholderTextColor="#999" value={filterStreamId} onChangeText={setFilterStreamId} autoCapitalize="none" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Subject ID" placeholderTextColor="#999" value={filterSubjectId} onChangeText={setFilterSubjectId} autoCapitalize="none" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Batch ID" placeholderTextColor="#999" value={filterBatchId} onChangeText={setFilterBatchId} autoCapitalize="none" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Created By" placeholderTextColor="#999" value={filterCreatedBy} onChangeText={setFilterCreatedBy} autoCapitalize="none" />
          </View>

          <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {['', 'draft', 'pending_approval', 'published', 'archived'].map((s) => (
              <TouchableOpacity key={s} style={[styles.chip, filterStatus === s && styles.chipActive]} onPress={() => setFilterStatus(s)} activeOpacity={0.7}>
                <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>{s || 'All'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Sort By</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {['title', 'createdAt', 'updatedAt', 'scheduledStart', 'scheduledEnd'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.chip, sortBy === s && styles.chipActive]} onPress={() => setSortBy(s)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, sortBy === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ width: 80 }}>
              <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Direction</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['asc', 'desc'] as const).map((d) => (
                  <TouchableOpacity key={d} style={[styles.chip, sortDir === d && styles.chipActive]} onPress={() => setSortDir(d)} activeOpacity={0.7}>
                    <Text style={[styles.chipText, sortDir === d && styles.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={applyFilters} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔍 Apply Filters & Sort</Text>
          </TouchableOpacity>
        </View>

        {/* ── Detail Lookup ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 View Mock Test by ID</Text>
          <TextInput style={styles.input} placeholder="Test ID (UUID)" placeholderTextColor="#999" value={detailId} onChangeText={setDetailId} autoCapitalize="none" />
          {detailTest ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Title: {detailTest.title}</Text>
              <Text style={styles.debugLabel}>Status: {detailTest.status}</Text>
              <Text style={styles.debugLabel}>Type: {detailTest.testType}</Text>
              <Text style={styles.debugLabel}>Duration: {detailTest.durationMin}min</Text>
              <Text style={styles.debugLabel}>Total Marks: {detailTest.totalMarks}</Text>
              <Text style={styles.debugLabel}>Neg. Marking: {detailTest.negativeMarking}</Text>
              <Text style={styles.debugLabel}>Attempt Limit: {detailTest.attemptLimit ?? 'unlimited'}</Text>
              <Text style={styles.debugLabel}>Passing Marks: {detailTest.passingMarks ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Stream: {detailTest.streamId.slice(0, 12)}...</Text>
              <Text style={styles.debugLabel}>Subject: {detailTest.subjectId?.slice(0, 12) ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Published At: {detailTest.publishedAt ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Available: {detailTest.availableFrom?.slice(0, 10) ?? 'immediate'} → {detailTest.availableUntil?.slice(0, 10) ?? 'never'}</Text>
              <Text style={styles.debugLabel}>Created: {detailTest.createdAt}</Text>
            </View>
          ) : detailId ? <Text style={{ color: '#999', fontStyle: 'italic' }}>Loading or not found...</Text> : null}
        </View>

        {/* ── Lifecycle Section ────────────────────────────────────────── */}
        {selectedTest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Lifecycle</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Current: <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>{selectedTest.status}</Text>
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => handlePublish(selectedTest)} disabled={publishMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#2E7D32' }]}>📤 Publish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFF3E0' }]} onPress={() => handleArchive(selectedTest)} disabled={archiveMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#E65100' }]}>📦 Archive</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => handleRestore(selectedTest)} disabled={restoreMutation.isPending} activeOpacity={0.7}>
                <Text style={[styles.smallBtnText, { color: '#1565C0' }]}>♻️ Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── List Section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Mock Tests</Text>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Total:</Text>
            <Text style={styles.debugValue}>{paginatedData?.count ?? 0}</Text>
          </View>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Mock Tests'}</Text>
          </TouchableOpacity>

          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {mockTests.length > 0 ? (
            <FlatList
              data={mockTests}
              renderItem={renderItem}
              keyExtractor={(item) => item.testId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Mock Tests" or adjust filters.</Text>}
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: mockTestKeys.mockTests.lists() });
            setResult('invalidateQueries', { status: 'invalidated lists' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{mockTests.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedTest ? selectedTest.testId.slice(0, 12) : 'none'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute:</Text><Text style={styles.debugValue}>{user?.instituteId ? user.instituteId.slice(0, 12) : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache Status:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(mockTestKeys.mockTests.lists()) ? 'cached' : 'empty'}</Text></View>
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
  buttonDisabled: { opacity: 0.5 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  itemMeta: { fontSize: 11, color: '#888', marginTop: 2 },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  readonlyField: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8E8FF' },
  readonlyLabel: { fontSize: 11, fontWeight: '700', color: '#6C63FF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  readonlyValue: { fontSize: 13, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
  debugBox: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E8FF' },
});
