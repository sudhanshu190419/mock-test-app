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
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
} from '../../hooks/academic/useTopics';
import { academicKeys } from '../../hooks/academic/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { Topic, CreateTopicInput, UpdateTopicInput } from '../../types/academic';

export default function TopicTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchTopics,
    isRefetching: isRefreshing,
  } = useTopics();
  const topics = paginatedData?.data ?? [];

  const [chapterId, setChapterId] = useState('');
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [updating, setUpdating] = useState(false);

  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  const createMutation = useCreateTopic();
  const updateMutation = useUpdateTopic();
  const deleteMutation = useDeleteTopic();

  const resetCreateForm = useCallback(() => { setChapterId(''); setName(''); setDisplayOrder('0'); }, []);
  const populateUpdateForm = useCallback((topic: Topic) => {
    setSelectedTopic(topic); setChapterId(topic.chapterId); setName(topic.name);
    setDisplayOrder(String(topic.displayOrder)); setUpdating(true);
  }, []);
  const resetUpdateForm = useCallback(() => { setSelectedTopic(null); setUpdating(false); resetCreateForm(); }, [resetCreateForm]);
  const setResult = useCallback((op: string, result: unknown) => { setLastOperation(op); setApiResponse(JSON.stringify(result, null, 2)); }, []);

  const refreshList = useCallback(async () => {
    setResult('useTopics().refetch()', { status: 'refetching...' });
    const result = await refetchTopics();
    setResult('useTopics().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchTopics, setResult]);

  const handleCreate = useCallback(async () => {
    if (!chapterId.trim() || !name.trim()) { Alert.alert('Validation', 'Chapter ID and Name are required.'); return; }
    createMutation.mutate({ chapterId: chapterId.trim(), name: name.trim(), displayOrder: parseInt(displayOrder, 10) || 0 } as CreateTopicInput, {
      onSuccess: (data) => { setResult('useCreateTopic()', { success: true, data }); Alert.alert('Success', `Topic "${data.name}" created.`); resetCreateForm(); refreshList(); },
      onError: (err) => { setResult('useCreateTopic()', { success: false, error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [chapterId, name, displayOrder, resetCreateForm, createMutation, setResult, refreshList]);

  const handleUpdate = useCallback(async () => {
    if (!selectedTopic) { Alert.alert('Select', 'Select a topic from the list first.'); return; }
    updateMutation.mutate({ id: selectedTopic.topicId, input: { name: name.trim() || undefined, displayOrder: parseInt(displayOrder, 10) || undefined } as UpdateTopicInput }, {
      onSuccess: (data) => { setResult('useUpdateTopic()', { success: true, data }); Alert.alert('Success', `Topic "${data.name}" updated.`); resetUpdateForm(); refreshList(); },
      onError: (err) => { setResult('useUpdateTopic()', { success: false, error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [selectedTopic, name, displayOrder, resetUpdateForm, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((topic: Topic) => {
    Alert.alert('Delete Topic', `Permanently delete "${topic.name}"?\n\nThis action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(topic.topicId, {
          onSuccess: () => { setResult('useDeleteTopic()', { success: true }); Alert.alert('Deleted', `Topic "${topic.name}" deleted.`); refreshList(); },
          onError: (err) => { setResult('useDeleteTopic()', { success: false, error: err.message }); Alert.alert('Delete Failed', err.message); },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handleSelect = useCallback((topic: Topic) => {
    if (selectedTopic?.topicId === topic.topicId) resetUpdateForm();
    else populateUpdateForm(topic);
  }, [selectedTopic, populateUpdateForm, resetUpdateForm]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const isLoading = listLoading || isMutating;

  const renderItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity style={[styles.itemRow, selectedTopic?.topicId === item.topicId && styles.itemRowSelected]} onPress={() => handleSelect(item)} activeOpacity={0.7}>
      <View style={styles.itemRowInfo}>
        <Text style={styles.itemRowName}>{item.name}</Text>
        <Text style={styles.itemRowId}>ID: {item.topicId.slice(0, 12)}...</Text>
        <Text style={styles.itemRowOrder}>Order: {item.displayOrder}</Text>
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
          <Text style={styles.headerTitle}>🧪 Topic Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{updating ? '✏️ Update Topic' : '➕ Create Topic'}</Text>
          {updating && selectedTopic && <Text style={styles.updateHint}>Updating: {selectedTopic.name}</Text>}
          <TextInput style={styles.input} placeholder="Chapter ID (UUID) *" placeholderTextColor="#999" value={chapterId} onChangeText={setChapterId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Topic Name *" placeholderTextColor="#999" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Display Order" placeholderTextColor="#999" value={displayOrder} onChangeText={setDisplayOrder} keyboardType="numeric" />
          <View style={styles.buttonRow}>
            {updating && <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdateForm} activeOpacity={0.7}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>}
            <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={updating ? handleUpdate : handleCreate} disabled={isLoading} activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>{isMutating ? 'Processing...' : updating ? '✏️ Update Topic' : '➕ Create Topic'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Topics</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Topics'}</Text>
          </TouchableOpacity>
          {listLoading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}
          {topics.length > 0 ? (
            <FlatList data={topics} renderItem={renderItem} keyExtractor={(item) => item.topicId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Topics" to fetch.</Text>}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => queryClient.invalidateQueries({ queryKey: academicKeys.topics.lists() })} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Count:</Text><Text style={styles.debugValue}>{topics.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute ID:</Text><Text style={styles.debugValue}>{user?.instituteId ? `${user.instituteId.slice(0, 12)}...` : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(academicKeys.topics.lists()) ? 'cached' : 'empty'}</Text></View>
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
});
