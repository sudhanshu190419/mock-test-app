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
  useStreams,
  useCreateStream,
  useUpdateStream,
  useDeleteStream,
} from '../../hooks/academic/useStreams';
import { academicKeys } from '../../hooks/academic/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import { supabase } from '../../config/supabase';
import type { Stream, CreateStreamInput, UpdateStreamInput } from '../../types/academic';

export default function StreamTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List query ────────────────────────────────────────────────────────
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchStreams,
    isRefetching: isRefreshing,
  } = useStreams();
  const streams = paginatedData?.data ?? [];

  // ── Create / Update form ───────────────────────────────────────────────
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // ── Selection ──────────────────────────────────────────────────────────
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Debug ──────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');
  const [profileDiagnostic, setProfileDiagnostic] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────
  const createMutation = useCreateStream();
  const updateMutation = useUpdateStream();
  const deleteMutation = useDeleteStream();

  // ── Helpers ────────────────────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setName('');
    setCode('');
    setDescription('');
    setDisplayOrder('0');
    setIsActive(true);
  }, []);

  const populateUpdateForm = useCallback((stream: Stream) => {
    setSelectedStream(stream);
    setName(stream.name);
    setCode(stream.code);
    setDescription(stream.description ?? '');
    setDisplayOrder(String(stream.displayOrder));
    setIsActive(stream.isActive);
    setUpdating(true);
  }, []);

  const resetUpdateForm = useCallback(() => {
    setSelectedStream(null);
    setUpdating(false);
    resetCreateForm();
  }, [resetCreateForm]);

  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useStreams().refetch()', { status: 'refetching...' });
    const result = await refetchStreams();
    setResult('useStreams().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchStreams, setResult]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreateStream = useCallback(async () => {
    if (!user?.instituteId) {
      Alert.alert('Cannot Create', 'Your account is not associated with an institute. Contact an admin.');
      return;
    }

    if (!name.trim() || !code.trim()) {
      Alert.alert('Validation', 'Stream Name and Code are required.');
      return;
    }

    const input: CreateStreamInput = {
      instituteId: user.instituteId,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive,
    };

    createMutation.mutate(input, {
      onSuccess: (data) => {
        setResult('useCreateStream()', { success: true, data });
        Alert.alert('Success', `Stream "${data.name}" created.`);
        resetCreateForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useCreateStream()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [name, code, description, displayOrder, isActive, user, resetCreateForm, createMutation, setResult, refreshList]);

  const handleUpdateStream = useCallback(async () => {
    if (!selectedStream) {
      Alert.alert('Select', 'Select a stream from the list first.');
      return;
    }

    const input: UpdateStreamInput = {
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      description: description.trim() || null,
      displayOrder: parseInt(displayOrder, 10) || undefined,
      isActive,
    };

    updateMutation.mutate(
      { id: selectedStream.streamId, input },
      {
        onSuccess: (data) => {
          setResult('useUpdateStream()', { success: true, data });
          Alert.alert('Success', `Stream "${data.name}" updated.`);
          resetUpdateForm();
          refreshList();
        },
        onError: (err) => {
          setResult('useUpdateStream()', { success: false, error: err.message });
          Alert.alert('Error', err.message);
        },
      },
    );
  }, [selectedStream, name, code, description, displayOrder, isActive, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDeleteStream = useCallback(
    (stream: Stream) => {
      Alert.alert(
        'Delete Stream',
        `Permanently delete "${stream.name}" (${stream.code})?\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(stream.streamId, {
                onSuccess: () => {
                  setResult('useDeleteStream()', { success: true });
                  Alert.alert('Deleted', `Stream "${stream.name}" deleted.`);
                  refreshList();
                },
                onError: (err) => {
                  setResult('useDeleteStream()', { success: false, error: err.message });
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

  const handleSelectStream = useCallback(
    (stream: Stream) => {
      if (selectedStream?.streamId === stream.streamId) {
        resetUpdateForm();
      } else {
        populateUpdateForm(stream);
      }
    },
    [selectedStream, populateUpdateForm, resetUpdateForm],
  );

  // ── Loading state ──────────────────────────────────────────────────────

  const isMutating =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render helpers ─────────────────────────────────────────────────────

  const renderStreamItem = ({ item }: { item: Stream }) => {
    const isSelected = selectedStream?.streamId === item.streamId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => handleSelectStream(item)}
        activeOpacity={0.7}>
        <View style={styles.itemRowInfo}>
          <Text style={styles.itemRowName}>{item.name}</Text>
          <Text style={styles.itemRowCode}>{item.code}</Text>
          <Text style={styles.itemRowId}>ID: {item.streamId.slice(0, 12)}...</Text>
          <Text style={styles.itemRowOrder}>Order: {item.displayOrder}</Text>
          <Text style={[styles.itemRowActive, item.isActive ? styles.active : styles.inactive]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteStream(item)}
          activeOpacity={0.7}>
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
          <Text style={styles.headerTitle}>🧪 Stream Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Section 1: Create / Update ──────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {updating ? '✏️ Update Stream' : '➕ Create Stream'}
          </Text>

          {updating && selectedStream && (
            <Text style={styles.updateHint}>
              Updating: {selectedStream.name} ({selectedStream.code})
            </Text>
          )}

          {user?.instituteId ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValue} selectable>
                {user.instituteId}
              </Text>
            </View>
          ) : (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValueMissing}>
                Not available — your account is not linked to an institute
              </Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Stream Name *"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Stream Code * (e.g. NEET)"
            placeholderTextColor="#999"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Display Order"
            placeholderTextColor="#999"
            value={displayOrder}
            onChangeText={setDisplayOrder}
            keyboardType="numeric"
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <TouchableOpacity
              style={[styles.toggleButton, isActive && styles.toggleButtonActive]}
              onPress={() => setIsActive(!isActive)}
              activeOpacity={0.7}>
              <Text style={[styles.toggleButtonText, isActive && styles.toggleButtonTextActive]}>
                {isActive ? 'YES' : 'NO'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonRow}>
            {updating && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetUpdateForm}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                !updating && !user?.instituteId && styles.buttonDisabled,
              ]}
              onPress={updating ? handleUpdateStream : handleCreateStream}
              disabled={isLoading || (!updating && !user?.instituteId)}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {isMutating
                  ? 'Processing...'
                  : updating
                  ? '✏️ Update Stream'
                  : '➕ Create Stream'}
              </Text>
            </TouchableOpacity>
          </View>

          {createMutation.isError && (
            <Text style={styles.errorText}>{createMutation.error?.message}</Text>
          )}
          {updateMutation.isError && (
            <Text style={styles.errorText}>{updateMutation.error?.message}</Text>
          )}
        </View>

        {/* ── Section 2: List ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Streams</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={refreshList}
            disabled={isLoading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {listLoading ? 'Loading...' : '🔄 Load Streams'}
            </Text>
          </TouchableOpacity>

          {listLoading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {streams.length > 0 ? (
            <>
              <Text style={styles.countText}>{streams.length} streams loaded</Text>
              <FlatList
                data={streams}
                renderItem={renderStreamItem}
                keyExtractor={(item) => item.streamId}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </>
          ) : (
            !listLoading && (
              <Text style={styles.emptyText}>Press "Load Streams" to fetch.</Text>
            )
          )}
        </View>

        {/* ── Section 3: Invalidate Cache ─────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => {
              setResult('invalidateQueries(streams.lists)', { status: 'invalidating...' });
              queryClient.invalidateQueries({ queryKey: academicKeys.streams.lists() });
            }}
            disabled={isLoading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 4: Debug ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>

          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>List Loading:</Text>
            <Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Mutating:</Text>
            <Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Streams Count:</Text>
            <Text style={styles.debugValue}>{streams.length}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Error:</Text>
            <Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Selected:</Text>
            <Text style={styles.debugValue}>
              {selectedStream ? `${selectedStream.name}` : 'none'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>User Role:</Text>
            <Text style={styles.debugValue}>{user?.role ?? '—'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Institute ID:</Text>
            <Text style={styles.debugValue}>
              {user?.instituteId ? `${user.instituteId.slice(0, 12)}...` : '—'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Cache Status:</Text>
            <Text style={styles.debugValue}>
              {queryClient.getQueryData(academicKeys.streams.lists()) ? 'cached' : 'empty'}
            </Text>
          </View>

          {/* ── Diagnostic: Direct profile queries ───────────────────── */}
          <TouchableOpacity
            style={[styles.button, styles.diagnosticButton]}
            onPress={async () => {
              setDiagnosticLoading(true);
              setProfileDiagnostic('Querying...');
              // Try column name: profile_id
              const r1 = await supabase
                .from('profiles')
                .select('*')
                .eq('profile_id', user?.id ?? 'no-id');
              // Try column name: id
              const r2 = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id ?? 'no-id');
              // Try column name: user_id
              const r3 = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user?.id ?? 'no-id');
              // Fetch ALL columns from any 1 row to see the actual schema
              const r4 = await supabase
                .from('profiles')
                .select('*')
                .limit(1);
              setProfileDiagnostic(JSON.stringify({
                query_profile_id: { count: r1.count, error: r1.error ?? null, data: r1.data },
                query_id: { count: r2.count, error: r2.error ?? null, data: r2.data },
                query_user_id: { count: r3.count, error: r3.error ?? null, data: r3.data },
                any_row_schema: { count: r4.count, error: r4.error ?? null, data: r4.data },
              }, null, 2));
              setDiagnosticLoading(false);
            }}
            disabled={diagnosticLoading}
            activeOpacity={0.7}>
            <Text style={styles.diagnosticButtonText}>
              {diagnosticLoading ? 'Querying...' : '🔍 Diagnose Profile (All Column Names)'}
            </Text>
          </TouchableOpacity>

          {profileDiagnostic ? (
            <View style={styles.diagnosticResult}>
              <Text style={styles.diagnosticResultLabel}>Raw Profile Response:</Text>
              <ScrollView
                horizontal
                style={styles.debugScroll}
                contentContainerStyle={styles.debugScrollContent}>
                <Text style={styles.debugResponse} selectable>
                  {profileDiagnostic}
                </Text>
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.debugLastOp}>Last Op: {lastOperation || '—'}</Text>

          <Text style={styles.debugResponseLabel}>API Response:</Text>
          <ScrollView
            horizontal
            style={styles.debugScroll}
            contentContainerStyle={styles.debugScrollContent}>
            <Text style={styles.debugResponse} selectable>
              {apiResponse || 'No API calls made yet.'}
            </Text>
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
  header: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#FF6B6B', fontWeight: '600', marginTop: 4 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  updateHint: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  toggleButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: { backgroundColor: '#E8F5E9' },
  toggleButtonText: { fontSize: 13, fontWeight: '700', color: '#C62828' },
  toggleButtonTextActive: { color: '#2E7D32' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: {
    backgroundColor: '#F0F0FF',
    borderWidth: 1,
    borderColor: '#E0E0FF',
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  loader: { marginVertical: 12 },
  countText: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 6 },
  emptyText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  itemRowSelected: {
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  itemRowInfo: { flex: 1 },
  itemRowName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemRowCode: { fontSize: 12, fontWeight: '600', color: '#6C63FF', marginTop: 1 },
  itemRowId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 2 },
  itemRowOrder: { fontSize: 11, color: '#888', marginTop: 1 },
  itemRowActive: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  active: { color: '#2E7D32' },
  inactive: { color: '#C62828' },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButtonText: { fontSize: 12, fontWeight: '700', color: '#D32F2F' },
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
  diagnosticButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginTop: 8,
  },
  diagnosticButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
  },
  diagnosticResult: {
    marginTop: 8,
  },
  diagnosticResultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 10,
    marginBottom: 4,
  },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugScrollContent: { padding: 10 },
  debugResponse: {
    fontSize: 11,
    color: '#A5D6A7',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  footer: { height: 20 },
});
