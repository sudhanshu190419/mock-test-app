/**
 * TestModals Components
 *
 * Implements the modal overlays for the test engine matching Figma specifications:
 * - QuitDialog: Overlay confirming if the user wants to abort the exam.
 * - SubmissionDialog: Detailed submission overview showing answer counts,
 *   a segmented progress bar, warning boxes, and final actions.
 *
 * @module components/testEngine/TestModals
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';

import Icon from '../home/Icons';
import { colors, palette } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

// ─── QuitDialog Component ───────────────────────────────────────────────────
interface QuitDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirmQuit: () => void;
}

export function QuitDialog({
  visible,
  onClose,
  onConfirmQuit,
}: QuitDialogProps): React.JSX.Element {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={styles.dialogContainer}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>Quit Exam?</Text>
            <Text style={styles.dialogDesc}>
              Your progress will be lost and the attempt will be marked incomplete.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextOutline}>Stay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#DC2626' }]}
              onPress={onConfirmQuit}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextFilled}>Quit Exam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── SubmissionDialog Component ──────────────────────────────────────────────
interface SubmissionDialogProps {
  visible: boolean;
  answeredCount: number;
  markedCount: number;
  unansweredCount: number;
  totalQuestions: number;
  onClose: () => void;
  onConfirmSubmit: () => void;
}

export function SubmissionDialog({
  visible,
  answeredCount,
  markedCount,
  unansweredCount,
  totalQuestions,
  onClose,
  onConfirmSubmit,
}: SubmissionDialogProps): React.JSX.Element {
  const answeredPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;
  const markedPct = totalQuestions > 0 ? (markedCount / totalQuestions) * 100 : 0;
  const unansweredPct = totalQuestions > 0 ? (unansweredCount / totalQuestions) * 100 : 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <View style={styles.dialogContainer}>
          {/* Header */}
          <View style={[styles.dialogHeader, styles.borderBottom]}>
            <Text style={styles.dialogTitle}>Submit Exam?</Text>
            <Text style={styles.dialogDesc}>
              Review your progress before submitting.
            </Text>
          </View>

          <View style={styles.modalBody}>
            {/* Segmented Progress Bar */}
            <View style={styles.barContainer}>
              <View style={styles.progressBarWrapper}>
                {answeredPct > 0 && (
                  <View style={{ flex: answeredPct, backgroundColor: '#16A34A' }} />
                )}
                {markedPct > 0 && (
                  <View style={{ flex: markedPct, backgroundColor: '#7C3AED' }} />
                )}
                {unansweredPct > 0 && (
                  <View style={{ flex: unansweredPct, backgroundColor: '#D1D5DB' }} />
                )}
              </View>

              {/* Legend */}
              <View style={styles.legendRow}>
                {[
                  { color: '#16A34A', label: 'Answered' },
                  { color: '#7C3AED', label: 'Marked' },
                  { color: '#D1D5DB', label: 'Unanswered' },
                ].map((item) => (
                  <View key={item.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Summary Counts Grid */}
            <View style={styles.countsContainer}>
              <View style={styles.countsGrid}>
                {/* Answered */}
                <View style={[styles.countsCell, styles.cellBorderRight]}>
                  <Text style={[styles.countsValue, { color: '#16A34A' }]}>{answeredCount}</Text>
                  <Text style={styles.countsLabel}>Answered</Text>
                </View>
                {/* Marked */}
                <View style={[styles.countsCell, styles.cellBorderRight]}>
                  <Text style={[styles.countsValue, { color: '#7C3AED' }]}>{markedCount}</Text>
                  <Text style={styles.countsLabel}>Marked</Text>
                </View>
                {/* Skipped */}
                <View style={styles.countsCell}>
                  <Text style={[styles.countsValue, { color: '#6B7280' }]}>{unansweredCount}</Text>
                  <Text style={styles.countsLabel}>Skipped</Text>
                </View>
              </View>
            </View>

            {/* Warning Box */}
            <View style={styles.warningBox}>
              <Icon name="alert-triangle" color="#DC2626" width={18} height={18} />
              <Text style={styles.warningText}>
                Once submitted, you cannot change your answers. Do you want to submit?
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonOutline]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextOutline}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#0058BE' }]}
              onPress={onConfirmSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonTextFilled}>Confirm Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[16],
  },
  dialogContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dialogHeader: {
    padding: spacing[20],
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dialogTitle: {
    ...typography.title,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  dialogDesc: {
    ...typography.body,
    fontSize: 13,
    color: '#64748B',
    marginTop: spacing[4],
    lineHeight: 18,
  },
  modalBody: {
    padding: spacing[20],
    gap: spacing[16],
  },

  // Segmented Bar
  barContainer: {
    gap: spacing[8],
  },
  progressBarWrapper: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    gap: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // Summary counts grid
  countsContainer: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  countsGrid: {
    flexDirection: 'row',
    width: '100%',
  },
  countsCell: {
    flex: 1,
    paddingVertical: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellBorderRight: {
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  countsValue: {
    ...typography.title,
    fontSize: 20,
    fontWeight: '800',
  },
  countsLabel: {
    ...typography.caption,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  // Warning box
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing[12],
    gap: spacing[8],
  },
  warningText: {
    ...typography.body,
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    flex: 1,
  },

  // Dialog actions footer
  dialogActions: {
    flexDirection: 'row',
    padding: spacing[16],
    gap: spacing[12],
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  modalButtonTextOutline: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalButtonTextFilled: {
    ...typography.button,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
