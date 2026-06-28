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

import { useQuery } from '@tanstack/react-query';
import {
  useTags,
  useTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useAttachTag,
  useDetachTag,
  useReplaceTags,
} from '../../hooks/content/useTags';
import { contentKeys } from '../../hooks/content/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import {
  getContentTags,
  getTagContents,
} from '../../services/content/tagService';
import type { Tag, ContentTag } from '../../types/content';

export default function TagTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List ────────────────────────────────────────────────────────────────
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchTags,
    isRefetching: isRefreshing,
  } = useTags();
  const tags = paginatedData?.data ?? [];

  // ── Create / Rename form ────────────────────────────────────────────────
  const [tagName, setTagName] = useState('');
  const [renameTagName, setRenameTagName] = useState('');

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [renaming, setRenaming] = useState(false);

  // ── Relation forms ──────────────────────────────────────────────────────
  const [attachContentId, setAttachContentId] = useState('');
  const [attachTagId, setAttachTagId] = useState('');
  const [detachContentId, setDetachContentId] = useState('');
  const [detachTagId, setDetachTagId] = useState('');
  const [replaceContentId, setReplaceContentId] = useState('');
  const [replaceTagIds, setReplaceTagIds] = useState('');
  const [viewContentTagsId, setViewContentTagsId] = useState('');
  const [viewTagContentsId, setViewTagContentsId] = useState('');

  // ── Relation results ────────────────────────────────────────────────────
  const [contentTagsResult, setContentTagsResult] = useState<Tag[] | null>(null);
  const [tagContentsResult, setTagContentsResult] = useState<ContentTag[] | null>(null);

  // ── Debug ────────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Hooks ────────────────────────────────────────────────────────────────
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();
  const attachMutation = useAttachTag();
  const detachMutation = useDetachTag();
  const replaceMutation = useReplaceTags();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useTags().refetch()', { status: 'refetching...' });
    const result = await refetchTags();
    setResult('useTags().refetch()', { isSuccess: result.isSuccess, data: result.data });
  }, [refetchTags, setResult]);

  const resetCreate = useCallback(() => { setTagName(''); }, []);

  const populateRename = useCallback((tag: Tag) => {
    setSelectedTag(tag);
    setRenameTagName(tag.name);
    setRenaming(true);
  }, []);

  const resetRename = useCallback(() => {
    setSelectedTag(null);
    setRenaming(false);
    setRenameTagName('');
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    if (!user?.instituteId) { Alert.alert('Error', 'No institute ID.'); return; }
    if (!tagName.trim()) { Alert.alert('Validation', 'Tag name required.'); return; }
    createMutation.mutate({ instituteId: user.instituteId, name: tagName.trim() }, {
      onSuccess: (data) => { setResult('useCreateTag()', data); Alert.alert('Success', `Tag "${data.name}" created.`); resetCreate(); refreshList(); },
      onError: (err) => { setResult('useCreateTag()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [user, tagName, resetCreate, createMutation, setResult, refreshList]);

  const handleRename = useCallback(() => {
    if (!selectedTag) { Alert.alert('Select', 'Select a tag first.'); return; }
    if (!renameTagName.trim()) { Alert.alert('Validation', 'Name required.'); return; }
    updateMutation.mutate({ id: selectedTag.tagId, input: { name: renameTagName.trim() } }, {
      onSuccess: (data) => { setResult('useUpdateTag()', data); Alert.alert('Success', `Renamed to "${data.name}".`); resetRename(); refreshList(); },
      onError: (err) => { setResult('useUpdateTag()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [selectedTag, renameTagName, resetRename, updateMutation, setResult, refreshList]);

  const handleDelete = useCallback((tag: Tag) => {
    Alert.alert('Delete Tag', `Permanently delete "${tag.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate(tag.tagId, {
          onSuccess: () => { setResult('useDeleteTag()', { success: true }); Alert.alert('Deleted'); refreshList(); },
          onError: (err) => { setResult('useDeleteTag()', { error: err.message }); Alert.alert('Error', err.message); },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handleAttach = useCallback(() => {
    if (!attachContentId.trim() || !attachTagId.trim()) { Alert.alert('Validation', 'Both IDs required.'); return; }
    attachMutation.mutate({ contentId: attachContentId.trim(), tagId: attachTagId.trim(), taggedBy: user?.id }, {
      onSuccess: (data) => { setResult('useAttachTag()', data); Alert.alert('Success', 'Tag attached.'); },
      onError: (err) => { setResult('useAttachTag()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [attachContentId, attachTagId, user, attachMutation, setResult]);

  const handleDetach = useCallback(() => {
    if (!detachContentId.trim() || !detachTagId.trim()) { Alert.alert('Validation', 'Both IDs required.'); return; }
    detachMutation.mutate({ contentId: detachContentId.trim(), tagId: detachTagId.trim() }, {
      onSuccess: () => { setResult('useDetachTag()', { success: true }); Alert.alert('Success', 'Tag detached.'); },
      onError: (err) => { setResult('useDetachTag()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [detachContentId, detachTagId, detachMutation, setResult]);

  const handleReplace = useCallback(() => {
    if (!replaceContentId.trim() || !replaceTagIds.trim()) { Alert.alert('Validation', 'Content ID and at least one Tag ID required.'); return; }
    const ids = replaceTagIds.split(',').map((s) => s.trim()).filter(Boolean);
    replaceMutation.mutate({ contentId: replaceContentId.trim(), tagIds: ids, taggedBy: user?.id }, {
      onSuccess: (data) => { setResult('useReplaceTags()', data); Alert.alert('Success', `Tags replaced (${data.length} tags).`); },
      onError: (err) => { setResult('useReplaceTags()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [replaceContentId, replaceTagIds, user, replaceMutation, setResult]);

  const contentTagsQuery = useQuery({
    queryKey: ['dev', 'contentTags', viewContentTagsId],
    queryFn: async () => {
      const result = await getContentTags(viewContentTagsId.trim());
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch content tags.');
      return result.data!;
    },
    enabled: false, // manual trigger only
  });

  const tagContentsQuery = useQuery({
    queryKey: ['dev', 'tagContents', viewTagContentsId],
    queryFn: async () => {
      const result = await getTagContents(viewTagContentsId.trim());
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch tag contents.');
      return result.data!;
    },
    enabled: false,
  });

  const handleViewContentTags = useCallback(async () => {
    if (!viewContentTagsId.trim()) { Alert.alert('Validation', 'Content ID required.'); return; }
    const result = await contentTagsQuery.refetch();
    if (result.data) {
      setContentTagsResult(result.data);
      setResult('getContentTags()', result.data);
    } else if (result.error) {
      setResult('getContentTags()', { error: result.error.message });
    }
  }, [viewContentTagsId, contentTagsQuery, setResult]);

  const handleViewTagContents = useCallback(async () => {
    if (!viewTagContentsId.trim()) { Alert.alert('Validation', 'Tag ID required.'); return; }
    const result = await tagContentsQuery.refetch();
    if (result.data) {
      setTagContentsResult(result.data.data);
      setResult('getTagContents()', result.data);
    } else if (result.error) {
      setResult('getTagContents()', { error: result.error.message });
    }
  }, [viewTagContentsId, tagContentsQuery, setResult]);

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || attachMutation.isPending || detachMutation.isPending || replaceMutation.isPending;
  const isLoading = listLoading || isMutating;

  const renderItem = ({ item }: { item: Tag }) => (
    <TouchableOpacity
      style={[styles.itemRow, selectedTag?.tagId === item.tagId && styles.itemRowSelected]}
      onPress={() => selectedTag?.tagId === item.tagId ? resetRename() : populateRename(item)}
      activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemId}>ID: {item.tagId.slice(0, 12)}...</Text>
        <Text style={styles.itemMeta}>{item.createdAt}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)} activeOpacity={0.7}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshList} tintColor="#6C63FF" />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🏷️ Tag Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Create ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>➕ Create Tag</Text>
          {user?.instituteId ? (
            <View style={styles.readonlyField}>
              <Text style={styles.readonlyLabel}>🏢 Institute ID</Text>
              <Text style={styles.readonlyValue} selectable>{user.instituteId}</Text>
            </View>
          ) : null}
          <TextInput style={styles.input} placeholder="Tag Name *" placeholderTextColor="#999" value={tagName} onChangeText={setTagName} />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Creating...' : '➕ Create Tag'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Rename ──────────────────────────────────────────────────── */}
        {renaming && selectedTag && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Rename Tag</Text>
            <Text style={styles.updateHint}>Renaming: {selectedTag.name}</Text>
            <TextInput style={styles.input} placeholder="New Name *" placeholderTextColor="#999" value={renameTagName} onChangeText={setRenameTagName} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetRename} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleRename} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Renaming...' : '✏️ Rename'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Attach / Detach ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Attach Tag</Text>
          <TextInput style={styles.input} placeholder="Content ID (UUID) *" placeholderTextColor="#999" value={attachContentId} onChangeText={setAttachContentId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Tag ID (UUID) *" placeholderTextColor="#999" value={attachTagId} onChangeText={setAttachTagId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleAttach} disabled={attachMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{attachMutation.isPending ? 'Attaching...' : '🔗 Attach Tag'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✂️ Detach Tag</Text>
          <TextInput style={styles.input} placeholder="Content ID (UUID) *" placeholderTextColor="#999" value={detachContentId} onChangeText={setDetachContentId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Tag ID (UUID) *" placeholderTextColor="#999" value={detachTagId} onChangeText={setDetachTagId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleDetach} disabled={detachMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{detachMutation.isPending ? 'Detaching...' : '✂️ Detach Tag'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Replace Tags</Text>
          <TextInput style={styles.input} placeholder="Content ID (UUID) *" placeholderTextColor="#999" value={replaceContentId} onChangeText={setReplaceContentId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Tag IDs (comma-separated) *" placeholderTextColor="#999" value={replaceTagIds} onChangeText={setReplaceTagIds} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleReplace} disabled={replaceMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{replaceMutation.isPending ? 'Replacing...' : '🔄 Replace Tags'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── View Content Tags ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👁️ View Content Tags</Text>
          <TextInput style={styles.input} placeholder="Content ID (UUID)" placeholderTextColor="#999" value={viewContentTagsId} onChangeText={setViewContentTagsId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleViewContentTags} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔍 Fetch Tags</Text>
          </TouchableOpacity>
          {contentTagsResult && (
            <View style={{ marginTop: 8 }}>
              {contentTagsResult.map((t) => (
                <Text key={t.tagId} style={{ fontSize: 12, fontFamily: 'monospace', color: '#1A1A2E' }}>• {t.name} ({t.tagId.slice(0, 8)}...)</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── View Tag Contents ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👁️ View Tag Contents</Text>
          <TextInput style={styles.input} placeholder="Tag ID (UUID)" placeholderTextColor="#999" value={viewTagContentsId} onChangeText={setViewTagContentsId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleViewTagContents} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔍 Fetch Contents</Text>
          </TouchableOpacity>
          {tagContentsResult && (
            <View style={{ marginTop: 8 }}>
              {tagContentsResult.map((ct) => (
                <Text key={`${ct.contentId}-${ct.tagId}`} style={{ fontSize: 12, fontFamily: 'monospace', color: '#1A1A2E' }}>• Content: {ct.contentId.slice(0, 12)}... tagged at {ct.taggedAt}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── List ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Tags</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={isLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Tags'}</Text>
          </TouchableOpacity>
          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}
          {tags.length > 0 ? (
            <FlatList data={tags} renderItem={renderItem} keyExtractor={(item) => item.tagId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : !listLoading && <Text style={styles.emptyText}>Press "Load Tags" to fetch.</Text>}
        </View>

        {/* ── Invalidate ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => queryClient.invalidateQueries({ queryKey: contentKeys.tags.lists() })} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Tags:</Text><Text style={styles.debugValue}>{tags.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{queryClient.getQueryData(contentKeys.tags.lists()) ? 'cached' : 'empty'}</Text></View>
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
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  cancelButton: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '700', color: '#666' },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  itemRowSelected: { backgroundColor: '#F0F0FF', borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 8 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  itemMeta: { fontSize: 11, color: '#888', marginTop: 1 },
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
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
});
