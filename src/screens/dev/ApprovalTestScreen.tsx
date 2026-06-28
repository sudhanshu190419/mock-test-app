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
  useApprovalRequests,
  useApprovalRequest,
  usePendingApprovals,
  useApprovalHistory,
  useCreateApprovalRequest,
  useAssignReviewer,
  useApproveRequest,
  useRejectRequest,
  useReopenRequest,
  useCancelRequest,
} from '../../hooks/content/useApproval';
import { contentKeys } from '../../hooks/content/queryKeys';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/authSlice';
import type { ApprovalRequest } from '../../types/content';

export default function ApprovalTestScreen(): React.JSX.Element {
  const queryClient = useQueryClient();
  const user = useAppSelector(selectUser);

  // ── List ────────────────────────────────────────────────────────────────
  const {
    data: paginatedData,
    isLoading: listLoading,
    error: listError,
    refetch: refetchApprovals,
    isRefetching: isRefreshing,
  } = useApprovalRequests();
  const approvals = paginatedData?.data ?? [];

  // ── Pending Queue ───────────────────────────────────────────────────────
  const {
    data: pendingData,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = usePendingApprovals(user?.instituteId ?? undefined);
  const pendingApprovals = pendingData?.data ?? [];

  // ── Create form ─────────────────────────────────────────────────────────
  const [resourceType, setResourceType] = useState<'content' | 'mock_test'>('content');
  const [resourceId, setResourceId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');

  // ── Assign form ─────────────────────────────────────────────────────────
  const [assignApprovalId, setAssignApprovalId] = useState('');
  const [assignReviewerId, setAssignReviewerId] = useState('');

  // ── Review form ─────────────────────────────────────────────────────────
  const [reviewApprovalId, setReviewApprovalId] = useState('');
  const [reviewReviewerId, setReviewReviewerId] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');

  // ── Reopen / Cancel ─────────────────────────────────────────────────────
  const [actionApprovalId, setActionApprovalId] = useState('');

  // ── History ─────────────────────────────────────────────────────────────
  const [historyResourceId, setHistoryResourceId] = useState('');
  const [historyResourceType, setHistoryResourceType] = useState<'content' | 'mock_test'>('content');
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useApprovalHistory(historyResourceId || undefined, historyResourceType);

  // ── Detail ──────────────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState('');
  const { data: detailRequest } = useApprovalRequest(detailId || undefined);

  // ── Debug ────────────────────────────────────────────────────────────────
  const [apiResponse, setApiResponse] = useState('');
  const [lastOperation, setLastOperation] = useState('');

  // ── Hooks ────────────────────────────────────────────────────────────────
  const createMutation = useCreateApprovalRequest();
  const assignMutation = useAssignReviewer();
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const reopenMutation = useReopenRequest();
  const cancelMutation = useCancelRequest();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setResult = useCallback((op: string, result: unknown) => {
    setLastOperation(op);
    setApiResponse(JSON.stringify(result, null, 2));
  }, []);

  const refreshAll = useCallback(async () => {
    setResult('refreshAll', { status: 'refetching...' });
    await Promise.all([refetchApprovals(), refetchPending()]);
    setResult('refreshAll', { status: 'done' });
  }, [refetchApprovals, refetchPending]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(() => {
    if (!resourceId.trim() || !requestedBy.trim()) {
      Alert.alert('Validation', 'Resource ID and Requested By are required.'); return;
    }
    createMutation.mutate({
      resourceType,
      resourceId: resourceId.trim(),
      requestedBy: requestedBy.trim(),
    }, {
      onSuccess: (data) => { setResult('useCreateApprovalRequest()', data); Alert.alert('Success', `Approval created (v${data.version}).`); refreshAll(); },
      onError: (err) => { setResult('useCreateApprovalRequest()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [resourceType, resourceId, requestedBy, createMutation, setResult, refreshAll]);

  const handleAssign = useCallback(() => {
    if (!assignApprovalId.trim() || !assignReviewerId.trim()) {
      Alert.alert('Validation', 'Approval ID and Reviewer ID are required.'); return;
    }
    assignMutation.mutate({ approvalId: assignApprovalId.trim(), reviewerId: assignReviewerId.trim() }, {
      onSuccess: (data) => { setResult('useAssignReviewer()', data); Alert.alert('Success', `Reviewer assigned.`); refreshAll(); },
      onError: (err) => { setResult('useAssignReviewer()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [assignApprovalId, assignReviewerId, assignMutation, setResult, refreshAll]);

  const handleApprove = useCallback(() => {
    if (!reviewApprovalId.trim() || !reviewReviewerId.trim()) {
      Alert.alert('Validation', 'Approval ID and Reviewer ID are required.'); return;
    }
    approveMutation.mutate({
      approvalId: reviewApprovalId.trim(),
      reviewedBy: reviewReviewerId.trim(),
      remarks: reviewRemarks.trim() || null,
    }, {
      onSuccess: (data) => { setResult('useApproveRequest()', data); Alert.alert('Success', 'Request approved.'); refreshAll(); },
      onError: (err) => { setResult('useApproveRequest()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [reviewApprovalId, reviewReviewerId, reviewRemarks, approveMutation, setResult, refreshAll]);

  const handleReject = useCallback(() => {
    if (!reviewApprovalId.trim() || !reviewReviewerId.trim()) {
      Alert.alert('Validation', 'Approval ID and Reviewer ID are required.'); return;
    }
    if (!reviewRemarks.trim()) { Alert.alert('Validation', 'Remarks are required for rejection.'); return; }
    rejectMutation.mutate({
      approvalId: reviewApprovalId.trim(),
      reviewedBy: reviewReviewerId.trim(),
      remarks: reviewRemarks.trim(),
    }, {
      onSuccess: (data) => { setResult('useRejectRequest()', data); Alert.alert('Success', 'Request rejected.'); refreshAll(); },
      onError: (err) => { setResult('useRejectRequest()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [reviewApprovalId, reviewReviewerId, reviewRemarks, rejectMutation, setResult, refreshAll]);

  const handleCancel = useCallback(() => {
    if (!actionApprovalId.trim()) { Alert.alert('Validation', 'Approval ID required.'); return; }
    cancelMutation.mutate(actionApprovalId.trim(), {
      onSuccess: () => { setResult('useCancelRequest()', { success: true }); Alert.alert('Success', 'Request cancelled.'); refreshAll(); },
      onError: (err) => { setResult('useCancelRequest()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [actionApprovalId, cancelMutation, setResult, refreshAll]);

  const handleReopen = useCallback(() => {
    if (!actionApprovalId.trim()) { Alert.alert('Validation', 'Approval ID required.'); return; }
    reopenMutation.mutate(actionApprovalId.trim(), {
      onSuccess: (data) => { setResult('useReopenRequest()', data); Alert.alert('Success', `Request reopened (v${data.version}).`); refreshAll(); },
      onError: (err) => { setResult('useReopenRequest()', { error: err.message }); Alert.alert('Error', err.message); },
    });
  }, [actionApprovalId, reopenMutation, setResult, refreshAll]);

  const isMutating = createMutation.isPending || assignMutation.isPending
    || approveMutation.isPending || rejectMutation.isPending
    || reopenMutation.isPending || cancelMutation.isPending;
  const isLoading = listLoading || pendingLoading || historyLoading || isMutating;

  // ── Render ──────────────────────────────────────────────────────────────
  const renderApprovalItem = ({ item }: { item: ApprovalRequest }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemStatus, {
          color: item.status === 'approved' ? '#2E7D32' : item.status === 'rejected' ? '#C62828' : '#F57C00',
        }]}>{item.status.toUpperCase()} v{item.version}</Text>
        <Text style={styles.itemMeta}>{item.resourceType} · {item.resourceId.slice(0, 12)}...</Text>
        <Text style={styles.itemMeta}>By: {item.requestedBy.slice(0, 12)}... → Reviewer: {item.reviewedBy ? `${item.reviewedBy.slice(0, 12)}...` : 'unassigned'}</Text>
        {item.remarks && <Text style={styles.itemRemarks}>📝 {item.remarks}</Text>}
        <Text style={styles.itemMeta}>Requested: {item.requestedAt}{item.reviewedAt ? ` · Reviewed: ${item.reviewedAt}` : ''}</Text>
        <Text style={styles.itemId}>ID: {item.approvalId.slice(0, 12)}...</Text>
      </View>
    </View>
  );

  const renderAuditItem = ({ item }: { item: ApprovalRequest }) => (
    <View style={styles.auditRow}>
      <Text style={[styles.auditStatus, {
        color: item.status === 'approved' ? '#2E7D32' : item.status === 'rejected' ? '#C62828' : '#F57C00',
      }]}>●</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.auditTitle}>
          {item.status.toUpperCase()} · v{item.version}
          {item.reviewedBy ? ` by ${item.reviewedBy.slice(0, 8)}...` : ' (pending)'}
        </Text>
        <Text style={styles.auditTime}>{item.requestedAt}{item.reviewedAt ? ` → ${item.reviewedAt}` : ''}</Text>
        {item.remarks && <Text style={styles.auditRemarks}>📝 {item.remarks}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} tintColor="#6C63FF" />}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✅ Approval Test</Text>
          <Text style={styles.headerSubtitle}>DEV ONLY — Remove after production frontend integration</Text>
        </View>

        {/* ── Create Section ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Create Approval Request</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <TouchableOpacity style={[styles.typeChip, resourceType === 'content' && styles.typeChipActive]} onPress={() => setResourceType('content')} activeOpacity={0.7}>
              <Text style={[styles.typeChipText, resourceType === 'content' && styles.typeChipTextActive]}>content</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeChip, resourceType === 'mock_test' && styles.typeChipActive]} onPress={() => setResourceType('mock_test')} activeOpacity={0.7}>
              <Text style={[styles.typeChipText, resourceType === 'mock_test' && styles.typeChipTextActive]}>mock_test</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Resource ID (UUID) *" placeholderTextColor="#999" value={resourceId} onChangeText={setResourceId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Requested By (profile UUID) *" placeholderTextColor="#999" value={requestedBy} onChangeText={setRequestedBy} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleCreate} disabled={createMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{createMutation.isPending ? 'Creating...' : '📝 Create'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Assign Reviewer ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Assign Reviewer</Text>
          <TextInput style={styles.input} placeholder="Approval ID (UUID) *" placeholderTextColor="#999" value={assignApprovalId} onChangeText={setAssignApprovalId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Reviewer Profile ID (UUID) *" placeholderTextColor="#999" value={assignReviewerId} onChangeText={setAssignReviewerId} autoCapitalize="none" />
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleAssign} disabled={assignMutation.isPending} activeOpacity={0.7}>
            <Text style={styles.primaryButtonText}>{assignMutation.isPending ? 'Assigning...' : '👤 Assign'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Review Actions ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Approve / ❌ Reject</Text>
          <TextInput style={styles.input} placeholder="Approval ID (UUID) *" placeholderTextColor="#999" value={reviewApprovalId} onChangeText={setReviewApprovalId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Reviewer Profile ID (UUID) *" placeholderTextColor="#999" value={reviewReviewerId} onChangeText={setReviewReviewerId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Remarks * (required for rejection)" placeholderTextColor="#999" value={reviewRemarks} onChangeText={setReviewRemarks} multiline />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#E8F5E9' }]} onPress={handleApprove} disabled={approveMutation.isPending} activeOpacity={0.7}>
              <Text style={[styles.buttonText, { color: '#2E7D32' }]}>{approveMutation.isPending ? '...' : '✅ Approve'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#FFEBEE' }]} onPress={handleReject} disabled={rejectMutation.isPending} activeOpacity={0.7}>
              <Text style={[styles.buttonText, { color: '#C62828' }]}>{rejectMutation.isPending ? '...' : '❌ Reject'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Cancel / Reopen ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔄 Cancel / Reopen</Text>
          <TextInput style={styles.input} placeholder="Approval ID (UUID) *" placeholderTextColor="#999" value={actionApprovalId} onChangeText={setActionApprovalId} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#FFF3E0' }]} onPress={handleCancel} disabled={cancelMutation.isPending} activeOpacity={0.7}>
              <Text style={[styles.buttonText, { color: '#E65100' }]}>{cancelMutation.isPending ? '...' : '🗑️ Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#E3F2FD' }]} onPress={handleReopen} disabled={reopenMutation.isPending} activeOpacity={0.7}>
              <Text style={[styles.buttonText, { color: '#1565C0' }]}>{reopenMutation.isPending ? '...' : '♻️ Reopen'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Detail Lookup ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Approval Detail</Text>
          <TextInput style={styles.input} placeholder="Approval ID (UUID)" placeholderTextColor="#999" value={detailId} onChangeText={setDetailId} autoCapitalize="none" />
          {detailRequest ? (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Status: <Text style={{ fontWeight: '700', color: detailRequest.status === 'approved' ? '#2E7D32' : detailRequest.status === 'rejected' ? '#C62828' : '#F57C00' }}>{detailRequest.status.toUpperCase()}</Text></Text>
              <Text style={styles.detailLabel}>Version: <Text style={{ fontWeight: '700' }}>{detailRequest.version}</Text></Text>
              <Text style={styles.detailLabel}>Resource: {detailRequest.resourceType} · {detailRequest.resourceId}</Text>
              <Text style={styles.detailLabel}>Requested By: {detailRequest.requestedBy}</Text>
              <Text style={styles.detailLabel}>Reviewer: {detailRequest.reviewedBy ?? 'Not assigned'}</Text>
              <Text style={styles.detailLabel}>Remarks: {detailRequest.remarks ?? '—'}</Text>
              <Text style={styles.detailLabel}>Requested: {detailRequest.requestedAt}</Text>
              <Text style={styles.detailLabel}>Reviewed: {detailRequest.reviewedAt ?? '—'}</Text>
            </View>
          ) : detailId ? <Text style={{ color: '#999', fontStyle: 'italic' }}>Loading...</Text> : null}
        </View>

        {/* ── Pending Queue ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Pending Queue ({pendingApprovals.length})</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => refetchPending()} disabled={pendingLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{pendingLoading ? 'Loading...' : '🔄 Refresh'}</Text>
          </TouchableOpacity>
          {pendingApprovals.length > 0 ? (
            <FlatList data={pendingApprovals} renderItem={renderApprovalItem} keyExtractor={(item) => item.approvalId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : <Text style={styles.emptyText}>No pending approvals.</Text>}
        </View>

        {/* ── Approval History ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Approval History</Text>
          <TextInput style={styles.input} placeholder="Resource ID (UUID) *" placeholderTextColor="#999" value={historyResourceId} onChangeText={setHistoryResourceId} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            <TouchableOpacity style={[styles.typeChip, historyResourceType === 'content' && styles.typeChipActive]} onPress={() => setHistoryResourceType('content')} activeOpacity={0.7}>
              <Text style={[styles.typeChipText, historyResourceType === 'content' && styles.typeChipTextActive]}>content</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeChip, historyResourceType === 'mock_test' && styles.typeChipActive]} onPress={() => setHistoryResourceType('mock_test')} activeOpacity={0.7}>
              <Text style={[styles.typeChipText, historyResourceType === 'mock_test' && styles.typeChipTextActive]}>mock_test</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => refetchHistory()} disabled={historyLoading || !historyResourceId} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{historyLoading ? 'Loading...' : '📜 Fetch History'}</Text>
          </TouchableOpacity>
          {historyData && historyData.length > 0 ? (
            <FlatList data={historyData} renderItem={renderAuditItem} keyExtractor={(item) => item.approvalId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : historyResourceId && !historyLoading ? <Text style={styles.emptyText}>No history found.</Text> : null}
        </View>

        {/* ── All Approvals ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 All Approvals</Text>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => refetchApprovals()} disabled={listLoading} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>{listLoading ? 'Loading...' : '🔄 Load All'}</Text>
          </TouchableOpacity>
          {listLoading && <ActivityIndicator style={{ marginVertical: 12 }} color="#6C63FF" />}
          {listError && <Text style={styles.errorText}>{(listError as Error).message}</Text>}
          {approvals.length > 0 ? (
            <FlatList data={approvals} renderItem={renderApprovalItem} keyExtractor={(item) => item.approvalId} scrollEnabled={false} ItemSeparatorComponent={() => <View style={styles.separator} />} />
          ) : !listLoading && <Text style={styles.emptyText}>No approvals found.</Text>}
        </View>

        {/* ── Invalidate ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {
            queryClient.invalidateQueries({ queryKey: contentKeys.approvals.lists() });
            queryClient.invalidateQueries({ queryKey: contentKeys.approvals.pending() });
            setResult('invalidateQueries', { status: 'invalidated' });
          }} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>🔄 Invalidate Cache</Text>
          </TouchableOpacity>
        </View>

        {/* ── Debug ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐛 Debug</Text>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Loading:</Text><Text style={styles.debugValue}>{listLoading ? 'true' : 'false'}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Pending:</Text><Text style={styles.debugValue}>{pendingApprovals.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Total:</Text><Text style={styles.debugValue}>{approvals.length}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>History:</Text><Text style={styles.debugValue}>{historyData?.length ?? 0}</Text></View>
          <View style={styles.debugRow}><Text style={styles.debugLabel}>Mutating:</Text><Text style={styles.debugValue}>{isMutating ? 'true' : 'false'}</Text></View>
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
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA', marginBottom: 8 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 14, fontWeight: '700' },
  primaryButton: { backgroundColor: '#6C63FF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { backgroundColor: '#F0F0FF', borderWidth: 1, borderColor: '#E0E0FF' },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: '#6C63FF' },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  typeChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  typeChipTextActive: { color: '#FFFFFF' },
  errorText: { fontSize: 12, color: '#D32F2F', fontWeight: '600', marginTop: 4 },
  emptyText: { fontSize: 13, color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  itemRow: { paddingVertical: 10, paddingHorizontal: 4 },
  itemStatus: { fontSize: 14, fontWeight: '800' },
  itemMeta: { fontSize: 11, color: '#666', marginTop: 1 },
  itemRemarks: { fontSize: 11, color: '#1A1A2E', fontStyle: 'italic', marginTop: 2 },
  itemId: { fontSize: 10, color: '#AAA', fontFamily: 'monospace', marginTop: 1 },
  auditRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8 },
  auditStatus: { fontSize: 10, marginTop: 3 },
  auditTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  auditTime: { fontSize: 10, color: '#888', fontFamily: 'monospace' },
  auditRemarks: { fontSize: 11, color: '#555', fontStyle: 'italic', marginTop: 2 },
  detailBox: { backgroundColor: '#F8F9FF', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E8E8FF' },
  detailLabel: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', marginBottom: 3 },
  debugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: '#666' },
  debugValue: { fontSize: 12, color: '#1A1A2E', fontFamily: 'monospace', fontWeight: '600' },
  debugLastOp: { fontSize: 11, color: '#888', marginTop: 6, fontStyle: 'italic' },
  debugResponseLabel: { fontSize: 12, fontWeight: '700', color: '#1A1A2E', marginTop: 10, marginBottom: 4 },
  debugScroll: { backgroundColor: '#1A1A2E', borderRadius: 6, maxHeight: 200 },
  debugResponse: { fontSize: 11, color: '#A5D6A7', fontFamily: 'monospace', lineHeight: 16 },
});
