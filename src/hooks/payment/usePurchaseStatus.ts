/**
 * usePurchaseStatus
 *
 * Polls a purchase table after a successful Razorpay payment to detect when
 * the backend webhook has created the enrollment/purchase record.
 *
 * Generic across purchase types — accepts a `checkFn` that determines which
 * table to query (e.g. `course_enrollments` for courses, `student_pyq_purchases`
 * for PYQ packages). Defaults to `checkCourseEnrollment` for backward
 * compatibility with the existing Course Purchase flow.
 *
 * The polling stops when:
 * - The record is found (success)
 * - The timeout is reached (failure)
 * - The component unmounts (cleanup)
 *
 * @module hooks/payment/usePurchaseStatus
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { checkCourseEnrollment } from '../../services/payment/paymentService';
import type { PollingConfig } from '../../types/payment';

/**
 * Check function signature — any polling check must accept a userId and an
 * entity ID (courseId, packageId, etc.) and return a boolean.
 */
export type PurchaseCheckFn = (
  studentId: string,
  entityId: string,
) => Promise<boolean>;

/**
 * Status of the polling operation.
 */
export type PollStatus =
  | { status: 'polling' }
  | { status: 'enrolled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

interface UsePurchaseStatusParams {
  /** The authenticated user's profile UUID (profile_id from auth.users). */
  studentId: string | null;
  /** The course / package UUID being purchased. */
  courseId: string | null;
  /** Whether polling should be active. */
  enabled: boolean;
  /** Polling configuration overrides. */
  config?: PollingConfig;
  /**
   * Custom check function for a different purchase table.
   * Defaults to `checkCourseEnrollment` (for courses).
   * Pass `checkPyqPurchase` for PYQ packages.
   */
  checkFn?: PurchaseCheckFn;
}

/**
 * Hook that polls for enrollment/purchase record creation after a successful
 * payment. Generic across purchase types via the optional `checkFn` parameter.
 *
 * Returns the current poll status and a `reset` function to restart polling.
 *
 * @example
 * // Course purchase (defaults to checkCourseEnrollment)
 * const { pollStatus, reset } = usePurchaseStatus({
 *   studentId: 'student-uuid',
 *   courseId: 'course-uuid',
 *   enabled: paymentReceived,
 * });
 *
 * // PYQ package purchase (custom checkFn)
 * const { pollStatus, reset } = usePurchaseStatus({
 *   studentId: 'student-uuid',
 *   courseId: 'package-uuid',
 *   enabled: paymentReceived,
 *   checkFn: checkPyqPurchase,
 * });
 *
 * if (pollStatus.status === 'enrolled') {
 *   // Unlock the content
 * }
 */
export function usePurchaseStatus({
  studentId,
  courseId,
  enabled,
  config = {},
  checkFn,
}: UsePurchaseStatusParams) {
  const {
    intervalMs = 2500,
    timeoutMs = 120000, // 2 minutes
  } = config;

  const [pollStatus, setPollStatus] = useState<PollStatus>({ status: 'polling' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    attemptsRef.current = 0;
    setPollStatus({ status: 'polling' });
  }, [stopPolling]);

  useEffect(() => {
    if (!enabled || !studentId || !courseId) {
      return;
    }

    // Resolve check function inside the effect so the closure is always fresh
    const checkPurchase = checkFn ?? checkCourseEnrollment;
    const purchaseLabel = checkFn ? 'PYQ package' : 'course';
    console.log('[PAYMENT_POLL] Starting', purchaseLabel, 'poll for ID:', courseId);

    // Set a timeout to stop polling after the configured duration
    timeoutRef.current = setTimeout(() => {
      console.log('[PAYMENT_POLL] Timeout reached —', purchaseLabel, 'not detected');
      stopPolling();
      setPollStatus({ status: 'timeout' });
    }, timeoutMs);

    // Poll immediately, then every `intervalMs`
    const poll = async () => {
      attemptsRef.current += 1;
      console.log('[PAYMENT_POLL] Checking', purchaseLabel, '(attempt', attemptsRef.current, ')...');

      try {
        const isEnrolled = await checkPurchase(studentId, courseId);

        if (isEnrolled) {
          console.log('[PAYMENT_POLL]', purchaseLabel, 'confirmed!');
          stopPolling();
          setPollStatus({ status: 'enrolled' });
        }
      } catch (err) {
        console.log('[PAYMENT_POLL] Poll error:', err);
        // Don't stop polling on transient errors — keep trying
      }
    };

    // Fire the first check immediately
    poll();

    intervalRef.current = setInterval(poll, intervalMs);

    // Cleanup on unmount or deps change
    return () => {
      console.log('[PAYMENT_POLL] Cleanup — stopping', purchaseLabel, 'poll');
      stopPolling();
    };
  }, [enabled, studentId, courseId, intervalMs, timeoutMs, stopPolling, checkFn]);

  return { pollStatus, reset } as const;
}
