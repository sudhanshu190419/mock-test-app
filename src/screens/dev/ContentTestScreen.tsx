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
  useContents,
  useContent,
  useCreateContent,
  useUpdateContent,
  useDeleteContent,
  usePublishContent,
  useArchiveContent,
  useRestoreContent,
} from '../../hooks/content/useContent';
import { contentKeys } from '../../hooks/content/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type {
  Content,
  ContentType,
  ContentFilters,
} from '../../types/content';

export default function ContentTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List ────────────────────────────────────────────────────────────────
  const [listFilters, setListFilters] = useState<ContentFilters>({});
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchContents,
    isRefetching: isRefreshing,
  } = useContents(listFilters);
  const contents = paginatedData?.data ?? [];

  // ── Create form ─────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [contentType, setContentType] = useState<ContentType>('pdf');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Update form ──────────────────────────────────────────────────────────
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');

  // ── Debug ────────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');
  const [detailId, setDetailId] = useState('');

  // ── Hooks ────────────────────────────────────────────────────────────────
  const createMutation = useCreateContent();
  const updateMutation = useUpdateContent();
  const deleteMutation = useDeleteContent();
  const publishMutation = usePublishContent();
  const archiveMutation = useArchiveContent();
  const restoreMutation = useRestoreContent();
  const { data: detailContent } = useContent(detailId || null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useContents().refetch()', { status: 'refetching...' });
    const result = await refetchContents();
    setResult('useContents().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchContents, setResult]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setChapterId('');
    setContentType('pdf');
    setDurationSeconds('');
    setPageCount('');
    setIsFreePreview(false);
    setUploadStatus('');
  }, []);

  const populateUpdate = useCallback((c: Content) => {
    setSelectedContent(c);
    setUpdateTitle(c.title);
    setUpdateDescription(c.description ?? '');
    setUpdating(true);
  }, []);

  const resetUpdate = useCallback(() => {
    setSelectedContent(null);
    setUpdating(false);
    setUpdateTitle('');
    setUpdateDescription('');
  }, []);

  // ── Create handler ───────────────────────────────────────────────────────
  const handleCreate = useCallback((ct: ContentType) => {
    if (!user?.instituteId || !user?.id) {
      Alert.alert('Cannot Create', 'User missing instituteId or profile ID.'); return;
    }
    if (!chapterId.trim() || !title.trim()) {
      Alert.alert('Validation', 'Chapter ID and Title are required.'); return;
    }

    // Create a dummy file for testing
    const dummyContent = new ArrayBuffer(100);
    const params: Parameters<typeof createMutation.mutate>[0] = {
      instituteId: user.instituteId,
      teacherId: user.id,
      chapterId: chapterId.trim(),
      title: title.trim(),
      description: description.trim() || null,
      contentType: ct,
      file: dummyContent,
      durationSeconds: ct === 'video' ? (parseInt(durationSeconds, 10) || 60) : null,
      pageCount: (ct === 'pdf' || ct === 'notes') ? (parseInt(pageCount, 10) || 10) : null,
      isFreePreview,
    };

    setUploadStatus(`Uploading ${ct.toUpperCase()}...`);
    createMutation.mutate(params, {
      onSuccess: (data) => {
        setResult(`useCreateContent(${ct})`, { success: true, data });
        Alert.alert('Success', `Content "${data.title}" created.`);
        setUploadStatus(`✅ Uploaded: ${data.originalFileName} (${data.fileSizeBytes ?? 0} bytes)`);
        resetForm();
        refreshList();
      },
      onError: (err) => {
        setResult(`useCreateContent(${ct})`, { success: false, error: err.message });
        setUploadStatus(`❌ Failed: ${err.message}`);
        Alert.alert('Error', err.message);
      },
    });
  }, [user, chapterId, title, description, durationSeconds, pageCount, isFreePreview, resetForm, createMutation, setResult, refreshList]);

  // ── Update handler ───────────────────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    if (!selectedContent) { Alert.alert('Select', 'Select content first.'); return; }
    updateMutation.mutate({
      id: selectedContent.contentId,
      input: {
        title: updateTitle.trim() || undefined,
        description: updateDescription.trim() || null,
      },
    }, {
      onSuccess: (data) => {
        setResult('useUpdateContent()', { success: true, data });
        Alert.alert('Success', 'Content updated.');
        resetUpdate();
        refreshList();
      },
      onError: (err) => {
        setResult('useUpdateContent()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [selectedContent, updateTitle, updateDescription, resetUpdate, updateMutation, setResult, refreshList]);

  // ── Delete handler ───────────────────────────────────────────────────────
  const handleDelete = useCallback((content: Content) => {
    Alert.alert('Delete Content', `Permanently delete "${content.title}"?\n\nThis cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(content.contentId, {
          onSuccess: () => {
            setResult('useDeleteContent()', { success: true });
            Alert.alert('Deleted', `"${content.title}" deleted.`);
            refreshList();
          },
          onError: (err) => {
            setResult('useDeleteContent()', { success: false, error: err.message });
            Alert.alert('Delete Failed', err.message);
          },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  // ── Lifecycle handlers ───────────────────────────────────────────────────
  const handleLifecycle = useCallback((op: string, mutateFn: (id: string) => void, content: Content) => {
    mutateFn(content.contentId);
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || publishMutation.isPending || archiveMutation.isPending || restoreMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ── Render item ──────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Content }) => (
    <TouchableOpacity
      style={[styles.itemRow, selectedContent?.contentId === item.contentId && styles.itemRowSelected]}
      onPress={() => selectedContent?.contentId === item.contentId ? resetUpdate() : populateUpdate(item)}
      activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemMeta}>{item.contentType} · {item.status}</Text>
        <Text style={styles.itemId}>ID: {item.contentId.slice(0, 12)}...</Text>
        <Text style={styles.itemMeta}>{item.originalFileName} · {item.fileSizeBytes ? `${(item.fileSizeBytes / 1024).toFixed(1)} KB` : '?'}</Text>
      </View>
      <View style={{ gap: 4 }}>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshList} tintColor="#6C63FF" />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Content Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Create Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Create Content</Text>

          {user?.instituteId ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValue} selectable>{user.instituteId}</Text>
            </View>
          ) : null}
          {user?.id ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>👤 Profile ID (teacherId)</Text>
              <Text style={styles.readonlyValue} selectable>{user.id}</Text>
            </View>
          ) : null}

          <TextInput style={styles.input} placeholder="Chapter ID (UUID) *" placeholderTextColor="#999" value={chapterId} onChangeText={setChapterId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Title *" placeholderTextColor="#999" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#999" value={description} onChangeText={setDescription} multiline />
          <TextInput style={styles.input} placeholder="Duration (video only, seconds)" placeholderTextColor="#999" value={durationSeconds} onChangeText={setDurationSeconds} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Page Count (PDF/Notes only)" placeholderTextColor="#999" value={pageCount} onChangeText={setPageCount} keyboardType="numeric" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Free Preview</Text>
            <TouchableOpacity style={[styles.toggleButton, isFreePreview && styles.toggleActive]} onPress={() => setIsFreePreview(!isFreePreview)} activeOpacity={0.7}>
              <Text style={[styles.toggleText, isFreePreview && styles.toggleTextActive]}>{isFreePreview ? 'YES' : 'NO'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Content Type:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(['pdf', 'video', 'notes', 'assignment'] as ContentType[]).map((ct) => (
              <TouchableOpacity
                key={ct}
                style={[styles.typeButton, contentType === ct && styles.typeButtonActive]}
                onPress={() => {
                  setContentType(ct);
                  handleCreate(ct);
                }}
                disabled={createMutation.isPending}
                activeOpacity={0.7}>
                <Text style={[styles.typeButtonText, contentType === ct && styles.typeButtonTextActive]}>
                  📤 {ct.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {uploadStatus ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{uploadStatus}</Text>
            </View>
          ) : null}

          {createMutation.isError && (
            <Text style={styles.errorText}>{createMutation.error?.message}</Text>
          )}
        </View>

        {/* ── Update Section ──────────────────────────────────────────── */}
        {updating && selectedContent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Update Content</Text>
            <Text style={styles.updateHint}>Selected: {selectedContent.title} ({selectedContent.contentType} · {selectedContent.status})</Text>

            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>📁 Storage</Text>
              <Text style={styles.readonlyValue} selectable>
                Bucket: {selectedContent.storageBucket}{'\n'}
                Path: {selectedContent.storagePath}{'\n'}
                MIME: {selectedContent.mimeType}{'\n'}
                Size: {selectedContent.fileSizeBytes ? `${(selectedContent.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A'}{'\n'}
                File: {selectedContent.originalFileName}
              </Text>
            </View>

            <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#999" value={updateTitle} onChangeText={setUpdateTitle} />
            <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#999" value={updateDescription} onChangeText={setUpdateDescription} multiline />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetUpdate} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdate} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Lifecycle Section ──────────────────────────────────────── */}
        {selectedContent && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔄 Lifecycle</Text>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
              Current: <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>{selectedContent.status}</Text>
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: '#E8F5E9' }]}
                onPress={() => handleLifecycle('publish', (id) => publishMutation.mutate(id, {
                  onSuccess: (d) => { setResult('usePublishContent()', d); refreshList(); },
                  onError: (e) => setResult('usePublishContent()', e.message),
                }), selectedContent)}
                disabled={publishMutation.isPending}
                activeOpacity={0.7}>
                <Text style={[styles.smallButtonText, { color: '#2E7D32' }]}>📤 Publish</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: '#FFF3E0' }]}
                onPress={() => handleLifecycle('archive', (id) => archiveMutation.mutate(id, {
                  onSuccess: (d) => { setResult('useArchiveContent()', d); refreshList(); },
                  onError: (e) => setResult('useArchiveContent()', e.message),
                }), selectedContent)}
                disabled={archiveMutation.isPending}
                activeOpacity={0.7}>
                <Text style={[styles.smallButtonText, { color: '#E65100' }]}>📦 Archive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: '#E3F2FD' }]}
                onPress={() => handleLifecycle('restore', (id) => restoreMutation.mutate(id, {
                  onSuccess: (d) => { setResult('useRestoreContent()', d); refreshList(); },
                  onError: (e) => setResult('useRestoreContent()', e.message),
                }), selectedContent)}
                disabled={restoreMutation.isPending}
                activeOpacity={0.7}>
                <Text style={[styles.smallButtonText, { color: '#1565C0' }]}>♻️ Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Detail Lookup ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 View Content by ID</Text>
          <TextInput style={styles.input} placeholder="Content ID (UUID)" placeholderTextColor="#999" value={detailId} onChangeText={setDetailId} autoCapitalize="none" />
          {detailContent ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Status: {detailContent.status}</Text>
              <Text style={styles.debugLabel}>Type: {detailContent.contentType}</Text>
              <Text style={styles.debugLabel}>Bucket: {detailContent.storageBucket}</Text>
              <Text style={styles.debugLabel}>Path: {detailContent.storagePath}</Text>
              <Text style={styles.debugLabel}>MIME: {detailContent.mimeType}</Text>
              <Text style={styles.debugLabel}>File: {detailContent.originalFileName}</Text>
              <Text style={styles.debugLabel}>Size: {detailContent.fileSizeBytes ?? 'N/A'}</Text>
              <Text style={styles.debugLabel}>Published: {detailContent.publishedAt ?? 'N/A'}</Text>
            </View>
          ) : detailId ? <Text style={{ color: '#999', fontStyle: 'italic' }}>Loading or not found...</Text> : null}
        </View>

        {/* ── List ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Content List</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Content'}</Text>
          </TouchableOpacity>

          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {contents.length > 0 ? (
            <FlatList
              data={contents}
              renderItem={renderItem}
              keyExtractor={(item) => item.contentId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Content" to fetch.</Text>}
        </View>

        {/* ── Invalidate Cache ───────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: contentKeys.contents.lists() });
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
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Items:</Text><Text style={styles.debugValue}>{contents.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Error:</Text><Text style={styles.debugValue}>{listError ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedContent ? selectedContent.title.slice(0, 20) : 'none'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>User Role:</Text><Text style={styles.debugValue}>{user?.role ?? '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Institute:</Text><Text style={styles.debugValue}>{user?.instituteId ? user.instituteId.slice(0, 12) : '—'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(contentKeys.contents.lists()) ? 'cached' : 'empty'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Status:</Text><Text style={styles.debugValue}>{selectedContent?.status ?? '—'}</Text></View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#1A1A2E', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#FF6B6B', fontWeight: '600', marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  updateHint: { fontSize: 12, color: '#6C63FF', fontWeight: '600', marginBottom: 8, fontStyle: 'italic' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginBottom: 8 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  toggleButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 6 },
  toggleActive: { backgroundColor: '#E8F5E9' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#C62828' },
  toggleTextActive: { color: '#2E7D32' },
  typeButton: { backgroundColor: '#F0F0FF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0FF' },
  typeButtonActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  typeButtonText: { fontSize: 12, fontWeight: '700', color: '#6C63FF' },
  typeButtonTextActive: { color: '#FFFFFF' },
  statusBox: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  statusText: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD', flex: 0 },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  smallButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  smallButtonText: { fontSize: 12, fontWeight: '700' },
  loader: { marginVertical: 12 },
  countText: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemMeta: { fontSize: 11, color: '#888', marginTop: 1 },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  deleteButton: { backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, marginLeft: 8 },
  deleteButtonText: { fontSize: 12, fontWeight: '700', color: '#D32F2F' },
  readonlyField: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8E8FF' },
  readonlyLabel: { fontSize: 11, fontWeight: '700', color: '#6C63FF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  readonlyValue: { fontSize: 13, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
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
