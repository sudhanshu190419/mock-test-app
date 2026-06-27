/**
 * Stream Service Test Screen (DEV ONLY)
 *
 * Temporary developer screen for manual backend verification of every
 * streamService function before the real UI is integrated.
 *
 * ⚠️ This screen is NOT part of the production app.
 *    Remove after frontend integration.
 *
 * @module StreamServiceTestScreen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

import {
  getStreams,
  getStreamById,
  createStream,
  updateStream,
  deleteStream,
} from '../../services/academic/streamService';
import type { Stream, CreateStreamInput, UpdateStreamInput } from '../../types/academic';

// ─── Component ──────────────────────────────────────────────────────────────

export default function StreamServiceTestScreen(): React.JSX.Element {
  // ── State ──────────────────────────────────────────────────────────────
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // Create / Update form fields
  const [instituteId, setInstituteId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  // Selection for update
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [updating, setUpdating] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setInstituteId('');
    setName('');
    setCode('');
    setDescription('');
    setDisplayOrder('0');
    setIsActive(true);
  }, []);

  const populateUpdateForm = useCallback((stream: Stream) => {
    setSelectedStream(stream);
    setInstituteId(stream.instituteId);
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

  // ── API Handlers ───────────────────────────────────────────────────────

  const handleLoadStreams = useCallback(async () => {
    setLoading(true);
    setResult('getStreams()', { status: 'loading...' });

    const result = await getStreams();

    setResult('getStreams()', result);
    if (result.success && result.data) {
      setStreams(result.data.data);
    }
    setLoading(false);
  }, [setResult]);

  const handleCreateStream = useCallback(async () => {
    if (!instituteId.trim() || !name.trim() || !code.trim()) {
      Alert.alert('Validation', 'Institute ID, Name, and Code are required.');
      return;
    }

    setLoading(true);

    const input: CreateStreamInput = {
      instituteId,
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive,
    };

    const result = await createStream(input);
    setResult('createStream()', result);

    if (result.success) {
      Alert.alert('Success', `Stream "${result.data?.name}" created.`);
      resetCreateForm();
      // Refresh list
      const listResult = await getStreams();
      if (listResult.success && listResult.data) {
        setStreams(listResult.data.data);
      }
    } else {
      Alert.alert('Error', result.error ?? 'Unknown error');
    }

    setLoading(false);
  }, [name, code, description, displayOrder, isActive, instituteId, resetCreateForm, setResult]);

  const handleUpdateStream = useCallback(async () => {
    if (!selectedStream) {
      Alert.alert('Select', 'Select a stream from the list first.');
      return;
    }

    setLoading(true);

    const input: UpdateStreamInput = {
      name: name.trim() || undefined,
      code: code.trim() || undefined,
      description: description.trim() || null,
      displayOrder: parseInt(displayOrder, 10) || undefined,
      isActive,
    };

    const result = await updateStream(selectedStream.streamId, input);
    setResult('updateStream()', result);

    if (result.success) {
      Alert.alert('Success', `Stream "${result.data?.name}" updated.`);
      resetUpdateForm();
      // Refresh list
      const listResult = await getStreams();
      if (listResult.success && listResult.data) {
        setStreams(listResult.data.data);
      }
    } else {
      Alert.alert('Error', result.error ?? 'Unknown error');
    }

    setLoading(false);
  }, [selectedStream, name, code, description, displayOrder, isActive, resetUpdateForm, setResult]);

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
            onPress: async () => {
              setLoading(true);
              const result = await deleteStream(stream.streamId);
              setResult('deleteStream()', result);

              if (result.success) {
                Alert.alert('Deleted', `Stream "${stream.name}" deleted.`);
                // Refresh list
                const listResult = await getStreams();
                if (listResult.success && listResult.data) {
                  setStreams(listResult.data.data);
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

  // ── Render Helpers ─────────────────────────────────────────────────────

  const renderStreamItem = ({ item }: { item: Stream }) => {
    const isSelected = selectedStream?.streamId === item.streamId;
    return (
      <TouchableOpacity
        style={[styles.streamRow, isSelected && styles.streamRowSelected]}
        onPress={() => handleSelectStream(item)}
        activeOpacity={0.7}>
        <View style={styles.streamRowInfo}>
          <Text style={styles.streamRowName}>{item.name}</Text>
          <Text style={styles.streamRowCode}>{item.code}</Text>
          <Text style={styles.streamRowId}>ID: {item.streamId.slice(0, 12)}...</Text>
          <Text style={styles.streamRowOrder}>Order: {item.displayOrder}</Text>
          <Text style={[styles.streamRowActive, item.isActive ? styles.active : styles.inactive]}>
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧪 Stream Service Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after frontend integration</Text>
        </View>

        {/* ── Section 1: Create Stream ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {updating ? '✏️ Update Stream' : '➕ Create Stream'}
          </Text>

          {updating && selectedStream && (
            <Text style={styles.updateHint}>
              Updating: {selectedStream.name} ({selectedStream.code})
            </Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Institute ID (UUID)"
            placeholderTextColor="#999"
            value={instituteId}
            onChangeText={setInstituteId}
            autoCapitalize="none"
          />
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
            <Switch value={isActive} onValueChange={setIsActive} />
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
              style={[styles.button, styles.primaryButton]}
              onPress={updating ? handleUpdateStream : handleCreateStream}
              disabled={loading}
              activeOpacity={0.7}>
              <Text style={styles.primaryButtonText}>
                {loading
                  ? 'Processing...'
                  : updating
                  ? '✏️ Update Stream'
                  : '➕ Create Stream'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Section 2: Get Streams ──────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Streams</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleLoadStreams}
            disabled={loading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>
              {loading ? 'Loading...' : '🔄 Load Streams'}
            </Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={styles.loader} color="#6C63FF" />}

          {streams.length > 0 ? (
            <FlatList
              data={streams}
              renderItem={renderStreamItem}
              keyExtractor={(item) => item.streamId}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <Text style={styles.emptyText}>No streams loaded. Press "Load Streams".</Text>
          )}
        </View>

        {/* ── Section 3: Refresh Button ───────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={async () => {
              setLoading(true);
              const result = await getStreams();
              setResult('getStreams() (refresh)', result);
              if (result.success && result.data) {
                setStreams(result.data.data);
              }
              setLoading(false);
            }}
            disabled={loading}
            activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Refresh All Streams</Text>
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
            <Text style={styles.debugLabel}>Streams Count:</Text>
            <Text style={styles.debugValue}>{streams.length}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>Selected:</Text>
            <Text style={styles.debugValue}>
              {selectedStream ? `${selectedStream.name} (${selectedStream.code})` : 'none'}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
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
  streamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  streamRowSelected: {
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  streamRowInfo: {
    flex: 1,
  },
  streamRowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  streamRowCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
    marginTop: 1,
  },
  streamRowId: {
    fontSize: 10,
    color: '#AAA',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  streamRowOrder: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  streamRowActive: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  active: {
    color: '#2E7D32',
  },
  inactive: {
    color: '#C62828',
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
