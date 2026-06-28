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
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
} from '../../hooks/academic/useSubjects';
import { academicKeys } from '../../hooks/academic/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '../../types/academic';

export default function SubjectTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List query ────────────────────────────────────────────────────────
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchSubjects,
    isRefetching: isRefreshing,
  } = useSubjects();
  const subjects = paginatedData?.data ?? [];

  // ── Create / Update form ───────────────────────────────────────────────
  const [streamId, setStreamId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  // ── Selection ──────────────────────────────────────────────────────────
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Debug ──────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  // ── Helpers ────────────────────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setStreamId('');
    setName('');
    setCode('');
    setDisplayOrder('0');
  }, []);

  const populateUpdateForm = useCallback((subject: Subject) => {
    setSelectedSubject(subject);
    setStreamId(subject.streamId);
    setName(subject.name);
    setCode(subject.code);
    setDisplayOrder(String(subject.displayOrder));
    setUpdating(true);
  }, []);

  const resetUpdateForm = useCallback(() => {
    setSelectedSubject(null);
    setUpdating(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useSubjects().refetch()', { status: 'refetching...' });
    const result = await refetchSubjects();
    setResult('useSubjects().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchSubjects, setResult]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!streamId.trim() || !name.trim() || !code.trim()) {
      Alert.alert('Validation', 'Stream ID, Name, and Code are required.');
      return;
    }

    const input: CreateSubjectInput = {
      streamId,
      name: name.trim(),
      code: code.trim(),
      displayOrder: parseInt(displayOrder, 10) || 0,
    };

    createMutation.mutate(input, {
      onSuccess: (data) => {
        setResult('useCreateSubject()', { success: true, data });
        Alert.alert('Success', `Subject "${data.name}" created.`);
        resetCreateForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useCreateSubject()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [streamId, name, code, displayOrder, resetCreateForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(async () => {
    if (!selectedSubject) {
      Alert.alert('Select', 'Select a subject from the list first.');
      return;
    }

    const input: UpdateSubjectInput = {
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      displayOrder: parseInt(displayOrder, 10) || undefined,
    };

    updateMutation.mutate(
      { id: selectedSubject.subjectId, input },
      {
        onSuccess: (data) => {
          setResult('useUpdateSubject()', { success: true, data });
          Alert.alert('Success', `Subject "${data.name}" updated.`);
          resetUpdateForm();
          refreshList();
        },
        onError: (err) => {
          setResult('useUpdateSubject()', { success: false, error: err.message });
          Alert.alert('Error', err.message);
        },
      },
    );
  }, [selectedSubject, name, code, displayOrder, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback(
    (subject: Subject) => {
      Alert.alert(
        'Delete Subject',
        `Permanently delete "${subject.name}" (${subject.code})?\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(subject.subjectId, {
                onSuccess: () => {
                  setResult('useDeleteSubject()', { success: true });
                  Alert.alert('Deleted', `Subject "${subject.name}" deleted.`);
                  refreshList();
                },
                onError: (err) => {
                  setResult('useDeleteSubject()', { success: false, error: err.message });
                  Alert.alert('Delete Failed', err.message);
                },
              });
            },
          },
        ],
      );
    },
    [deleteMutation, setResult, refreshList],
  );

  const handleSelect = useCallback(
    (subject: Subject) => {
      if (selectedSubject?.subjectId === subject.subjectId) {
        resetUpdateForm();
      } else {
        populateUpdateForm(subject);
      }
    },
    [selectedSubject, populateUpdateForm, resetUpdateForm],
  );

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: Subject }) => {
    const isSelected = selectedSubject?.subjectId === item.subjectId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}>
        <View style={styles.itemRowInfo}>
          <Text style={styles.itemRowName}>{item.name}</Text>
          <Text style={styles.itemRowCode}>{item.code}</Text>
          <Text style={styles.itemRowId}>ID: {item.subjectId.slice(0, 12)}...</Text>
          <Text style={styles.itemRowOrder}>Order: {item.displayOrder}</Text>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshList} tintColor="#6C63FF" />
        }>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Subject Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Section 1: Create / Update ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {updating ? '✏️ Update Subject' : '➕ Create Subject'}
          </Text>

          {updating && selectedSubject && (
            <Text style={styles.updateHint}>
              Updating: {selectedSubject.name} ({selectedSubject.code})
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Stream ID (UUID) *"
            placeholderTextColor="#999"
            value={streamId}
            onChangeText={setStreamId}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Subject Name *"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Subject Code * (e.g. PHY)"
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Display Order"
            placeholderTextColor="#999"
            value={displayOrder}
            onChangeText={setDisplayOrder}
            keyboardType="numeric"
          />

          <View style={styles.buttonRow}>
            {updating && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={updating ? handleUpdate : handleCreate}
              disabled={isLoading}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {isMutating ? 'Processing...' : updating ? '✏️ Update Subject' : '➕ Create Subject'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 2: List ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Subjects</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Subjects'}</Text>
          </TouchableOpacity>

          {listLoading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {subjects.length > 0 ? (
            <>
              <Text style={styles.countText}>{subjects.length} subjects loaded</Text>
              <FlatList data={subjects} renderItem={renderItem} keyExtractor={(item) => item.subjectId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
            </>
          ) : (
            !listLoading && <Text style={styles.emptyText}>Press "Load Subjects" to fetch.</Text>
          )}
        </View>

        {/* ── Section 3: Invalidate Cache ─────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => { setResult('invalidateQueries', {}); queryClient.invalidateQueries({ queryKey: academicKeys.subjects.lists() }); }} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 4: Debug ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{subjects.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute ID:</Text><Text style={styles.debugValue}>{user?.instituteId ? `${user.instituteId.slice(0, 12)}...` : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(academicKeys.subjects.lists()) ? 'cached' : 'empty'}</Text></View>
          <Text style={styles.debugLastOp}>Last Op: {lastOperation || '—'}</Text>
          <Text style={styles.debugResponseLabel}>API Response:</Text>
          <ScrollView horizontal style={styles.debugScroll} contentContainerStyle={styles.debugScrollContent}>
            <Text style={styles.debugResponse} selectable>{apiResponse || 'No API calls made yet.'}</Text>
          </ScrollView>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: { backgroundColor: '#1A1A2E', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#FF6B6B', fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  updateHint: { fontSize: 12, color: '#6C63FF', fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  loader: { marginVertical: 12 },
  countText: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemRowInfo: { flex: 1 },
  itemRowName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemRowCode: { fontSize: 12, fontWeight: '600', color: '#6C63FF', marginTop: 1 },
  itemRowId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 2 },
  itemRowOrder: { fontSize: 11, color: '#888', marginTop: 1 },
  deleteButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },
  deleteButtonText: { fontSize: 12, fontWeight: '700', color: '#D32F2F' },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugScrollContent: { padding: 10 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
  footer: { height: 20 },
});
