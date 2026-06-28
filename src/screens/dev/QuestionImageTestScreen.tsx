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
  useQuestionImages,
  useUploadQuestionImage,
  useUpdateQuestionImage,
  useDeleteQuestionImage,
  useReplaceQuestionImages,
  useReorderQuestionImages,
} from '../../hooks/mockTest/useQuestionImages';
import { questionKeys } from '../../hooks/mockTest/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { QuestionImage } from '../../types/mockTest';

export default function QuestionImageTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── Parent question ────────────────────────────────────────────────────
  const [questionId, setQuestionId] = useState('');
  const [instituteId, setInstituteId] = useState(user?.instituteId ?? '');
  const {
    data: images,
    isLoading: listLoading,
    error: listError,
    refetch: refetchImages,
    isRefetching: isRefreshing,
  } = useQuestionImages(questionId || null);

  // ─── Upload form ───────────────────────────────────────────────────────
  const [imageRole, setImageRole] = useState('stem');
  const [altText, setAltText] = useState('');
  const [orderSeq, setOrderSeq] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [fileSizeDisplay, setFileSizeDisplay] = useState('');
  const [mimeTypeDisplay, setMimeTypeDisplay] = useState('');

  // ─── Replace form ───────────────────────────────────────────────────────
  const [replaceRole, setReplaceRole] = useState('stem');
  const [replaceAltText, setReplaceAltText] = useState('');

  // ─── Update form ────────────────────────────────────────────────────────
  const [selectedImage, setSelectedImage] = useState<QuestionImage | null>(null);
  const [updateAltText, setUpdateAltText] = useState('');
  const [updateDisplayOrder, setUpdateDisplayOrder] = useState('');

  // ─── Reorder form ───────────────────────────────────────────────────────
  const [reorderData, setReorderData] = useState('');

  // ─── Debug ───────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ─── Mutations ───────────────────────────────────────────────────────────
  const uploadMutation = useUploadQuestionImage();
  const updateMutation = useUpdateQuestionImage();
  const deleteMutation = useDeleteQuestionImage();
  const replaceMutation = useReplaceQuestionImages();
  const reorderMutation = useReorderQuestionImages();

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshList = useCallback(async () => {
    setResult('useQuestionImages().refetch()', { status: 'refetching...' });
    const result = await refetchImages();
    setResult('useQuestionImages().refetch()', { isSuccess: result.isSuccess });
  }, [refetchImages, setResult]);

  const resetUploadForm = useCallback(() => {
    setAltText('');
    setOrderSeq('');
    setUploadProgress(0);
    setUploadStatus('');
    setFileSizeDisplay('');
    setMimeTypeDisplay('');
  }, []);

  // ─── Create a dummy ArrayBuffer for upload testing ───────────────────────
  const createDummyBuffer = useCallback((role: string): ArrayBuffer => {
    const size = role === 'explanation' ? 200 * 1024 : 50 * 1024; // 200KB or 50KB
    const buffer = new ArrayBuffer(size);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleUpload = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }

    const file = createDummyBuffer(imageRole);
    setFileSizeDisplay(`${(file.byteLength / 1024).toFixed(1)} KB`);
    setMimeTypeDisplay('image/png');

    uploadMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      file,
      imageRole,
      altText: altText.trim() || null,
      orderSequence: orderSeq ? parseInt(orderSeq, 10) : undefined,
      onProgress: (loaded, total) => {
        setUploadProgress(Math.round((loaded / total) * 100));
        setUploadStatus(`Uploading: ${loaded}/${total} bytes`);
      },
    }, {
      onSuccess: (data) => {
        setResult('useUploadQuestionImage()', { success: true, data });
        setUploadStatus(`✅ Uploaded: ${data.storagePath}`);
        resetUploadForm();
        refreshList();
      },
      onError: (err) => {
        setResult('useUploadQuestionImage()', { success: false, error: err.message });
        setUploadStatus(`❌ Failed: ${err.message}`);
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, imageRole, altText, orderSeq, createDummyBuffer, resetUploadForm, uploadMutation, setResult, refreshList]);

  const handleReplace = useCallback(() => {
    if (!questionId.trim() || !instituteId.trim()) {
      Alert.alert('Validation', 'Question ID and Institute ID are required.'); return;
    }

    // Create 2 dummy ArrayBuffers for replacement
    const entry1 = {
      file: createDummyBuffer(replaceRole),
      imageRole: replaceRole,
      altText: replaceAltText.trim() || null,
      orderSequence: 1,
    };
    const entry2 = {
      file: createDummyBuffer('explanation'),
      imageRole: 'explanation',
      altText: 'Replacement explanation diagram',
      orderSequence: 2,
    };

    replaceMutation.mutate({
      questionId: questionId.trim(),
      instituteId: instituteId.trim(),
      entries: [entry1, entry2],
    }, {
      onSuccess: (data) => {
        setResult('useReplaceQuestionImages()', { success: true, count: data.length });
        Alert.alert('Success', `${data.length} images replaced.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useReplaceQuestionImages()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, instituteId, replaceRole, replaceAltText, createDummyBuffer, replaceMutation, setResult, refreshList]);

  const handleUpdateImage = useCallback(() => {
    if (!selectedImage) { Alert.alert('Select', 'Select an image from the list first.'); return; }

    const input: { altText?: string | null; displayOrder?: number } = {};
    if (updateAltText !== '') input.altText = updateAltText || null;
    if (updateDisplayOrder) input.displayOrder = parseInt(updateDisplayOrder, 10) || undefined;

    updateMutation.mutate({
      questionId: selectedImage.questionId,
      imageId: selectedImage.imageId,
      input,
    }, {
      onSuccess: (data) => {
        setResult('useUpdateQuestionImage()', { success: true, data });
        Alert.alert('Success', 'Image updated.');
        setSelectedImage(null);
        refreshList();
      },
      onError: (err) => {
        setResult('useUpdateQuestionImage()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [selectedImage, updateAltText, updateDisplayOrder, updateMutation, setResult, refreshList]);

  const handleDeleteImage = useCallback((img: QuestionImage) => {
    Alert.alert('Delete Image', `Delete image "${img.imageId.slice(0, 12)}..."?\nBucket: ${img.storageBucket}\nPath: ${img.storagePath}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteMutation.mutate({ questionId: img.questionId, imageId: img.imageId }, {
          onSuccess: () => {
            setResult('useDeleteQuestionImage()', { success: true });
            refreshList();
          },
          onError: (err) => {
            setResult('useDeleteQuestionImage()', { success: false, error: err.message });
            Alert.alert('Error', err.message);
          },
        });
      }},
    ]);
  }, [deleteMutation, setResult, refreshList]);

  const handleReorder = useCallback(() => {
    if (!questionId.trim()) { Alert.alert('Validation', 'Question ID is required.'); return; }

    const lines = reorderData.trim().split('\n').filter((l) => l.trim());
    const items = lines.map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      return { imageId: parts[0], displayOrder: parseInt(parts[1], 10) || 1 };
    });

    if (items.length === 0) {
      Alert.alert('Validation', 'At least one reorder item required (imageId|displayOrder per line).'); return;
    }

    reorderMutation.mutate({ questionId: questionId.trim(), items }, {
      onSuccess: () => {
        setResult('useReorderQuestionImages()', { success: true, items });
        Alert.alert('Success', `${items.length} images reordered.`);
        refreshList();
      },
      onError: (err) => {
        setResult('useReorderQuestionImages()', { success: false, error: err.message });
        Alert.alert('Error', err.message);
      },
    });
  }, [questionId, reorderData, reorderMutation, setResult, refreshList]);

  const isMutating = uploadMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    || replaceMutation.isPending || reorderMutation.isPending;
  const isLoading = listLoading || isMutating;

  // ─── Render item ────────────────────────────────────────────────────────
  const renderImageItem = ({ item }: { item: QuestionImage }) => {
    const isSelected = selectedImage?.imageId === item.imageId;
    return (
      <TouchableOpacity
        style={[styles.itemRow, isSelected && styles.itemRowSelected]}
        onPress={() => {
          if (isSelected) { setSelectedImage(null); return; }
          setSelectedImage(item);
          setUpdateAltText(item.altText ?? '');
          setUpdateDisplayOrder(String(item.orderSequence));
        }}
        activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.imagePreviewPlaceholder}>
              <Text style={styles.imagePreviewIcon}>🖼️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemRole}>{item.imageRole}</Text>
              <Text style={styles.itemOrder}>Order: {item.orderSequence}</Text>
              <Text style={styles.itemMeta}>Bucket: {item.storageBucket}</Text>
              <Text style={styles.itemMeta}>Path: {item.storagePath.slice(0, 40)}...</Text>
              {item.altText && <Text style={styles.itemAlt}>Alt: {item.altText}</Text>}
              <Text style={styles.itemId}>ID: {item.imageId.slice(0, 12)}...</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => handleDeleteImage(item)} activeOpacity={0.7}>
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
          <Text style={styles.headerTitle}>🧪 Image Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Question ID Section ─────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Target Question</Text>
          <TextInput style={styles.input} placeholder="Question ID (UUID) *" placeholderTextColor="#999" value={questionId} onChangeText={setQuestionId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Institute ID (UUID) *" placeholderTextColor="#999" value={instituteId} onChangeText={setInstituteId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={refreshList} disabled={!questionId.trim() || listLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load Images'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Upload Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📤 Upload Image</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            Uploads a dummy PNG file (50–200 KB) via storageService.
          </Text>

          <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Image Role:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {['stem', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'].map((role) => (
              <TouchableOpacity key={role} style={[styles.chip, imageRole === role && styles.chipActive]} onPress={() => setImageRole(role)} activeOpacity={0.7}>
                <Text style={[styles.chipText, imageRole === role && styles.chipTextActive]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Alt Text (accessibility)" placeholderTextColor="#999" value={altText} onChangeText={setAltText} />
          <TextInput style={styles.input} placeholder="Order Sequence (optional, auto if empty)" placeholderTextColor="#999" value={orderSeq} onChangeText={setOrderSeq} keyboardType="numeric" />

          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpload} disabled={uploadMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{uploadMutation.isPending ? 'Uploading...' : '📤 Upload Test Image'}</Text>
          </TouchableOpacity>

          {/* Upload progress */}
          {uploadProgress > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

          {uploadStatus ? (
            <View style={[styles.statusBox, uploadStatus.startsWith('✅') ? styles.statusSuccess : uploadStatus.startsWith('❌') ? styles.statusError : undefined]}>
              <Text style={styles.statusText}>{uploadStatus}</Text>
            </View>
          ) : null}

          {fileSizeDisplay ? (
            <View style={styles.fileInfoRow}>
              <Text style={styles.fileInfoLabel}>Size: {fileSizeDisplay}</Text>
              <Text style={styles.fileInfoLabel}>MIME: {mimeTypeDisplay}</Text>
            </View>
          ) : null}

          {uploadMutation.isError && <Text style={styles.errorText}>{uploadMutation.error?.message}</Text>}
        </View>

        {/* ── Replace Section ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Replace All Images</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            Deletes all existing images & storage files, then uploads 2 new dummy images.
          </Text>

          <Text style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Image Role:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {['stem', 'option_a', 'option_b', 'option_c', 'option_d', 'explanation'].map((role) => (
              <TouchableOpacity key={role} style={[styles.chip, replaceRole === role && styles.chipActive]} onPress={() => setReplaceRole(role)} activeOpacity={0.7}>
                <Text style={[styles.chipText, replaceRole === role && styles.chipTextActive]}>{role}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Alt Text" placeholderTextColor="#999" value={replaceAltText} onChangeText={setReplaceAltText} />

          <TouchableOpacity style={[styles.button, { backgroundColor: '#FF6B35' }]} onPress={handleReplace} disabled={replaceMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{replaceMutation.isPending ? 'Replacing...' : '🔄 Replace All Images'}</Text>
          </TouchableOpacity>

          {replaceMutation.isError && <Text style={styles.errorText}>{replaceMutation.error?.message}</Text>}
        </View>

        {/* ── Update Section ──────────────────────────────────────────── */}
        {selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Update Image</Text>
            <Text style={styles.updateHint}>Selected: {selectedImage.imageId.slice(0, 12)}... ({selectedImage.imageRole})</Text>

            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Bucket: {selectedImage.storageBucket}</Text>
              <Text style={styles.debugLabel}>Path: {selectedImage.storagePath}</Text>
              <Text style={styles.debugLabel}>Role: {selectedImage.imageRole}</Text>
              <Text style={styles.debugLabel}>Order: {selectedImage.orderSequence}</Text>
            </View>

            <TextInput style={styles.input} placeholder="Alt Text" placeholderTextColor="#999" value={updateAltText} onChangeText={setUpdateAltText} />
            <TextInput style={styles.input} placeholder="Display Order" placeholderTextColor="#999" value={updateDisplayOrder} onChangeText={setUpdateDisplayOrder} keyboardType="numeric" />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setSelectedImage(null)} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleUpdateImage} disabled={updateMutation.isPending} activeOpacity={0.7}>
                <Text style={styles.primaryButtonText}>{updateMutation.isPending ? 'Updating...' : '✏️ Update'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Reorder Section ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔀 Reorder Images</Text>
          <Text style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
            One per line: imageId|displayOrder
          </Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="uuid-a|2\nuuid-b|1" placeholderTextColor="#999" value={reorderData} onChangeText={setReorderData} multiline />
          <TouchableOpacity style={[styles.button, { backgroundColor: '#7B1FA2' }]} onPress={handleReorder} disabled={reorderMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{reorderMutation.isPending ? 'Reordering...' : '🔀 Reorder'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── List Section ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Images List</Text>
          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}

          {images && images.length > 0 ? (
            <FlatList
              data={images}
              renderItem={renderImageItem}
              keyExtractor={(item) => item.imageId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            !listLoading && <Text style={styles.emptyText}>Load images by entering a Question ID above.</Text>
          )}
        </View>

        {/* ── Invalidate Cache ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            if (questionId.trim()) {
              queryClient.invalidateQueries({ queryKey: questionKeys.images.list(questionId.trim()) });
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
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Images:</Text><Text style={styles.debugValue}>{images?.length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Selected:</Text><Text style={styles.debugValue}>{selectedImage ? selectedImage.imageRole : 'none'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Upload Progress:</Text><Text style={styles.debugValue}>{uploadProgress}%</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Cache:</Text><Text style={styles.debugValue}>{questionId && queryClient.getQueryData(questionKeys.images.list(questionId)) ? 'cached' : 'empty'}</Text></View>
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
  imagePreviewPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0FF',
  },
  imagePreviewIcon: { fontSize: 20 },
  itemRole: { fontSize: 13, fontWeight: '700', color: '#6C63FF', textTransform: 'uppercase' },
  itemOrder: { fontSize: 11, color: '#888' },
  itemMeta: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  itemAlt: { fontSize: 11, color: '#666', fontStyle: 'italic', marginTop: 1 },
  itemId: { fontSize: 10, color: '#CCC', fontFamily: 'monospace', marginTop: 1 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  progressContainer: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#1A1A2E',
    lineHeight: 20,
  },
  statusBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statusSuccess: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' },
  statusError: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  statusText: { fontSize: 11, color: '#1A1A2E', fontFamily: 'monospace' },
  fileInfoRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  fileInfoLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
  debugBox: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E8FF' },
});
