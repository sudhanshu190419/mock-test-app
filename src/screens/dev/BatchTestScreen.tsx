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
  useBatches,
  useCreateBatch,
  useUpdateBatch,
  useDeleteBatch,
} from '../../hooks/academic/useBatches';
import { academicKeys } from '../../hooks/academic/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { Batch, CreateBatchInput, UpdateBatchInput } from '../../types/academic';

export default function BatchTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchBatches,
    isRefetching: isRefreshing,
  } = useBatches();
  const batches = paginatedData?.data ?? [];

  const [streamId, setStreamId] = useState('');
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxSeats, setMaxSeats] = useState('');
  const [status, setStatus] = useState('upcoming');

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [updating, setUpdating] = useState(false);

  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  const createMutation = useCreateBatch();
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const resetForm = useCallback(() => {
    setStreamId(''); setName(''); setBatchCode('');
    setAcademicYear(''); setStartDate(''); setEndDate(''); setMaxSeats(''); setStatus('upcoming');
  }, []);

  const populateUpdateForm = useCallback((batch: Batch) => {
    setSelectedBatch(batch); setStreamId(batch.streamId);
    setName(batch.name); setBatchCode(batch.batchCode); setAcademicYear(batch.academicYear);
    setStartDate(batch.startDate); setEndDate(batch.endDate);
    setMaxSeats(batch.maxSeats != null ? String(batch.maxSeats) : '');
    setStatus(batch.status); setUpdating(true);
  }, []);

  const resetUpdateForm = useCallback(() => { setSelectedBatch(null); setUpdating(false); resetForm(); }, [resetForm]);
  const setResult = useCallback((op: string, result: unknown) => { setLastOperation(op); setApiResponse(JSON.stringify(result, null, 2)); }, []);

  const refreshList = useCallback(async () => {
    setResult('useBatches().refetch()', { status: 'refetching...' });
    const result = await refetchBatches();
    setResult('useBatches().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchBatches, setResult]);

  const handleCreate = useCallback(async () => {
    if (!user?.instituteId) {
      Alert.alert('Cannot Create', 'Your account is not associated with an institute. Contact an admin.'); return;
    }
    if (!streamId.trim() || !name.trim() || !batchCode.trim() || !academicYear.trim() || !startDate.trim() || !endDate.trim()) {
      Alert.alert('Validation', 'All required fields must be filled.'); return;
    }
    createMutation.mutate({
      instituteId: user.instituteId, streamId, name: name.trim(), batchCode: batchCode.trim(),
      academicYear: academicYear.trim(), startDate: startDate.trim(), endDate: endDate.trim(),
      maxSeats: maxSeats.trim() ? parseInt(maxSeats, 10) : null,
      status: status as CreateBatchInput['status'],
    }, {
      onSuccess: (data) => { setResult('useCreateBatch()', { success: true, data }); Alert.alert('Success', `Batch "${data.name}" created.`); resetForm(); refreshList(); },
      onError: (err) => { setResult('useCreateBatch()', { success: false, error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [user, streamId, name, batchCode, academicYear, startDate, endDate, maxSeats, status, resetForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(async () => {
    if (!selectedBatch) { Alert.alert('Select', 'Select a batch from the list first.'); return; }
    updateMutation.mutate({ id: selectedBatch.batchId, input: {
      name: name.trim() || undefined, batchCode: batchCode.trim() || undefined,
      academicYear: academicYear.trim() || undefined, startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined, maxSeats: maxSeats.trim() ? parseInt(maxSeats, 10) : null,
      status: status as UpdateBatchInput['status'],
    }}, {
      onSuccess: (data) => { setResult('useUpdateBatch()', { success: true, data }); Alert.alert('Success', `Batch "${data.name}" updated.`); resetUpdateForm(); refreshList(); },
      onError: (err) => { setResult('useUpdateBatch()', { success: false, error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [selectedBatch, name, batchCode, academicYear, startDate, endDate, maxSeats, status, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((batch: Batch) => {
    Alert.alert('Delete Batch', `Soft-delete "${batch.name}"?\n\nThis can be reversed by an admin.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(batch.batchId, {
          onSuccess: () => { setResult('useDeleteBatch()', { success: true }); Alert.alert('Deleted', `Batch "${batch.name}" deleted.`); refreshList(); },
          onError: (err) => { setResult('useDeleteBatch()', { success: false, error: err.message }); Alert.alert('Delete Failed', err.message); },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handleSelect = useCallback((batch: Batch) => {
    if (selectedBatch?.batchId === batch.batchId) resetUpdateForm();
    else populateUpdateForm(batch);
  }, [selectedBatch, populateUpdateForm, resetUpdateForm]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = listLoading || isMutating;

  const renderItem = ({ item }: { item: Batch }) => (
    <TouchableOpacity style={[styles.itemRow, selectedBatch?.batchId === item.batchId && styles.itemRowSelected]} onPress={() => handleSelect(item)} activeOpacity={0.7}>
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemRowName}>{item.name}</Text>
        <Text style={styles.itemRowCode}>{item.batchCode}</Text>
        <Text style={styles.itemRowId}>ID: {item.batchId.slice(0, 12)}...</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
          <Text style={styles.itemRowStatus}>{item.status}</Text>
          <Text style={styles.itemRowOrder}>{item.academicYear}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)} activeOpacity={0.7}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshList} tintColor="#6C63FF" />
        }><View style={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Batch Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{updating ? '✏️ Update Batch' : '➕ Create Batch'}</Text>
          {updating && selectedBatch && <Text style={styles.updateHint}>Updating: {selectedBatch.name} ({selectedBatch.batchCode})</Text>}

          {user?.instituteId ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValue} selectable>{user.instituteId}</Text>
            </View>
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValueMissing}>Not available — your account is not linked to an institute</Text>
            </View>
          )}
          <TextInput style={styles.input} placeholder="Stream ID (UUID) *" placeholderTextColor="#999" value={streamId} onChangeText={setStreamId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Batch Name *" placeholderTextColor="#999" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Batch Code * (e.g. NEET26-MOR-A)" placeholderTextColor="#999" value={batchCode} onChangeText={setBatchCode} autoCapitalize="characters" />
          <TextInput style={styles.input} placeholder="Academic Year * (e.g. 2025-26)" placeholderTextColor="#999" value={academicYear} onChangeText={setAcademicYear} />
          <TextInput style={styles.input} placeholder="Start Date * (e.g. 2025-04-01)" placeholderTextColor="#999" value={startDate} onChangeText={setStartDate} />
          <TextInput style={styles.input} placeholder="End Date * (e.g. 2026-03-31)" placeholderTextColor="#999" value={endDate} onChangeText={setEndDate} />
          <TextInput style={styles.input} placeholder="Max Seats (leave empty for unlimited)" placeholderTextColor="#999" value={maxSeats} onChangeText={setMaxSeats} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Status (upcoming/active/completed/archived)" placeholderTextColor="#999" value={status} onChangeText={setStatus} autoCapitalize="none" />

          <View style={styles.buttonRow}>
            {updating && <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>}
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                !updating && !user?.instituteId && styles.buttonDisabled,
              ]}
              onPress={updating ? handleUpdate : handleCreate}
              disabled={isLoading || (!updating && !user?.instituteId)}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{isMutating ? 'Processing...' : updating ? '✏️ Update Batch' : '➕ Create Batch'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Batches</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Batches'}</Text>
          </TouchableOpacity>
          {listLoading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}
          {batches.length > 0 ? (
            <FlatList data={batches} renderItem={renderItem} keyExtractor={(item) => item.batchId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Batches" to fetch.</Text>}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => queryClient.invalidateQueries({ queryKey: academicKeys.batches.lists() })} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{batches.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute ID:</Text><Text style={styles.debugValue}>{user?.instituteId ? `${user.instituteId.slice(0, 12)}...` : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(academicKeys.batches.lists()) ? 'cached' : 'empty'}</Text></View>
          <Text style={styles.debugLastOp}>Last Op: {lastOperation || '—'}</Text>
          <Text style={styles.debugResponseLabel}>API Response:</Text>
          <ScrollView horizontal style={styles.debugScroll} contentContainerStyle={styles.debugScrollContent}>
            <Text style={styles.debugResponse} selectable>{apiResponse || 'No API calls made yet.'}</Text>
          </ScrollView>
        </View>
      </View></ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemRowInfo: { flex: 1 },
  itemRowName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemRowCode: { fontSize: 12, fontWeight: '600', color: '#6C63FF', marginTop: 1 },
  itemRowId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 2 },
  itemRowStatus: { fontSize: 11, fontWeight: '600', color: '#6C63FF' },
  itemRowOrder: { fontSize: 11, color: '#888' },
  readonlyField: {
    backgroundColor: '#F8F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E8FF',
  },
  readonlyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  readonlyValue: {
    fontSize: 13,
    color: '#1A1A2E',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  readonlyValueMissing: {
    fontSize: 12,
    color: '#D32F2F',
    fontStyle: 'italic',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
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
});
