/**
 * Subject Service Test Screen (DEV ONLY)
 *
 * Temporary developer screen for manual backend verification of every
 * subjectService function before the real UI is integrated.
 *
 * ⚠️ This screen is NOT part of the production app.
 *    Remove after frontend integration.
 *
 * @module SubjectServiceTestScreen
 */

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

import {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../../services/academic/subjectService';
import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '../../types/academic';

// ─── Component ──────────────────────────────────────────────────────────────

export default function SubjectServiceTestScreen(): React.JSX.Element {
  // ── State ──────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // Create / Update form fields
  const [streamId, setStreamId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  // Selection for update
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [updating, setUpdating] = useState(false);

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

  // ── API Handlers ───────────────────────────────────────────────────────

  const handleLoadSubjects = useCallback(async () => {
    setLoading(true);
    setResult('getSubjects()', { status: 'loading...' });

    const result = await getSubjects();

    setResult('getSubjects()', result);
    if (result.success && result.data) {
      setSubjects(result.data.data);
    }
    setLoading(false);
  }, [setResult]);

  const handleCreateSubject = useCallback(async () => {
    if (!streamId.trim() || !name.trim() || !code.trim()) {
      Alert.alert('Validation', 'Stream ID, Name, and Code are required.');
      return;
    }

    setLoading(true);

    const input: CreateSubjectInput = {
      streamId,
      name: name.trim(),
      code: code.trim(),
      displayOrder: parseInt(displayOrder, 10) || 0,
    };

    const result = await createSubject(input);
    setResult('createSubject()', result);

    if (result.success) {
      Alert.alert('Success', `Subject "${result.data?.name}" created.`);
      resetCreateForm();
      // Refresh list
      const listResult = await getSubjects();
      if (listResult.success && listResult.data) {
        setSubjects(listResult.data.data);
      }
    } else {
      Alert.alert('Error', result.error ?? 'Unknown error');
    }

    setLoading(false);
  }, [name, code, displayOrder, streamId, resetCreateForm, setResult]);

  const handleUpdateSubject = useCallback(async () => {
    if (!selectedSubject) {
      Alert.alert('Select', 'Select a subject from the list first.');
      return;
    }

    setLoading(true);

    const input: UpdateSubjectInput = {
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      displayOrder: parseInt(displayOrder, 10) || undefined,
    };

    const result = await updateSubject(selectedSubject.subjectId, input);
    setResult('updateSubject()', result);

    if (result.success) {
      Alert.alert('Success', `Subject "${result.data?.name}" updated.`);
      resetUpdateForm();
      // Refresh list
      const listResult = await getSubjects();
      if (listResult.success && listResult.data) {
        setSubjects(listResult.data.data);
      }
    } else {
      Alert.alert('Error', result.error ?? 'Unknown error');
    }

    setLoading(false);
  }, [selectedSubject, name, code, displayOrder, resetUpdateForm, setResult]);

  const handleDeleteSubject = useCallback(
    (subject: Subject) => {
      Alert.alert(
        'Delete Subject',
        `Permanently delete "${subject.name}" (${subject.code})?\n\nThis action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              const result = await deleteSubject(subject.subjectId);
              setResult('deleteSubject()', result);

              if (result.success) {
                Alert.alert('Deleted', `Subject "${subject.name}" deleted.`);
                // Refresh list
                const listResult = await getSubjects();
                if (listResult.success && listResult.data) {
                  setSubjects(listResult.data.data);
                }
              } else {
                Alert.alert('Delete Failed', result.error ?? 'Unknown error');
              }

              setLoading(false);
            },
          },
        ],
      );
    },
    [setResult],
  );

  const handleSelectSubject = useCallback(
    (subject: Subject) => {
      if (selectedSubject?.subjectId === subject.subjectId) {
        resetUpdateForm();
      } else {
        populateUpdateForm(subject);
      }
    },
    [selectedSubject, populateUpdateForm, resetUpdateForm],
  );

  // ── Render Helpers ─────────────────────────────────────────────────────

  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const isSelected = selectedSubject?.subjectId === item.subjectId;
    return (
      <TouchableOpacity
        style={[styles.subjectRow, isSelected && styles.subjectRowSelected]}
        onPress={() => handleSelectSubject(item)}
        activeOpacity={0.7}>
        <View style={styles.subjectRowInfo}>
          <Text style={styles.subjectRowName}>{item.name}</Text>
          <Text style={styles.subjectRowCode}>{item.code}</Text>
          <Text style={styles.subjectRowId}>ID: {item.subjectId.slice(0, 12)}...</Text>
          <Text style={styles.subjectRowOrder}>Order: {item.displayOrder}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteSubject(item)}
          activeOpacity={0.7}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─── Main Render ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Subject Service Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after frontend integration</Text>
        </View>

        {/* ── Section 1: Create Subject ───────────────────────────────── */}
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
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetUpdateForm}
                activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={updating ? handleUpdateSubject : handleCreateSubject}
              disabled={loading}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {loading
                  ? 'Processing...'
                  : updating
                  ? '✏️ Update Subject'
                  : '➕ Create Subject'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 2: Get Subjects ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Subjects</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLoadSubjects}
            disabled={loading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {loading ? 'Loading...' : '🔄 Load Subjects'}
            </Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}

          {subjects.length > 0 ? (
            <FlatList
              data={subjects}
              renderItem={renderSubjectItem}
              keyExtractor={(item) => item.subjectId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>No subjects loaded. Press "Load Subjects".</Text>
          )}
        </View>

        {/* ── Section 3: Refresh Button ───────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={async () => {
              setLoading(true);
              const result = await getSubjects();
              setResult('getSubjects() (refresh)', result);
              if (result.success && result.data) {
                setSubjects(result.data.data);
              }
              setLoading(false);
            }}
            disabled={loading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Refresh All Subjects</Text>
          </TouchableOpacity>
        </View>

        {/* ── Section 4: Debug Section ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>

          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Last Operation:</Text>
            <Text style={styles.debugValue}>{lastOperation || '—'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Loading:</Text>
            <Text style={styles.debugValue}>{loading ? 'true' : 'false'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Subjects Count:</Text>
            <Text style={styles.debugValue}>{subjects.length}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Selected:</Text>
            <Text style={styles.debugValue}>
              {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : 'none'}
            </Text>
          </View>

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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#1A1A2E',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 4,
  },
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 10,
  },
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
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F0F0FF',
    borderWidth: 1,
    borderColor: '#E0E0FF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  loader: {
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  subjectRowSelected: {
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  subjectRowInfo: {
    flex: 1,
  },
  subjectRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  subjectRowCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
    marginTop: 1,
  },
  subjectRowId: {
    fontSize: 10,
    color: '#AAA',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  subjectRowOrder: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D32F2F',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  debugValue: {
    fontSize: 12,
    color: '#1A1A2E',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  debugResponseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 10,
    marginBottom: 4,
  },
  debugScroll: {
    backgroundColor: '#1A1A2E',
    borderRadius: 6,
    maxHeight: 200,
  },
  debugScrollContent: {
    padding: 10,
  },
  debugResponse: {
    fontSize: 11,
    color: '#A5D6A7',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  footer: {
    height: 20,
  },
});
