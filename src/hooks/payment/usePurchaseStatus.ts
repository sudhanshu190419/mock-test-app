/**
 * usePurchaseStatus
 *
 * Polls the `course_enrollments` table after a successful Razorpay payment
 * to detect when the backend webhook has created the enrollment.
 *
 * The polling stops when:
 * - The enrollment is found (success)
 * - The timeout is reached (failure)
 * - The component unmounts (cleanup)
 *
 * @module hooks/payment/usePurchaseStatus
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { checkCourseEnrollment } from '../../services/payment/paymentService';
import type { PollingConfig } from '../../types/payment';

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
  /** The course UUID being purchased. */
  courseId: string | null;
  /** Whether polling should be active. */
  enabled: boolean;
  /** Polling configuration overrides. */
  config?: PollingConfig;
}

/**
 * Hook that polls for enrollment creation after a successful payment.
 *
 * Returns the current poll status and a `reset` function to restart polling.
 *
 * @example
 * const { pollStatus, reset } = usePurchaseStatus({
 *   studentId: 'student-uuid',
 *   courseId: 'course-uuid',
 *   enabled: paymentReceived,
 * });
 *
 * if (pollStatus.status === 'enrolled') {
 *   // Unlock the course
 * }
 */
export function usePurchaseStatus({
  studentId,
  courseId,
  enabled,
  config = {},
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

    console.log('[PAYMENT_POLL] Starting enrollment poll for course:', courseId);

    // Set a timeout to stop polling after the configured duration
    timeoutRef.current = setTimeout(() => {
      console.log('[PAYMENT_POLL] Timeout reached — enrollment not detected');
      stopPolling();
      setPollStatus({ status: 'timeout' });
    }, timeoutMs);

    // Poll immediately, then every `intervalMs`
    const poll = async () => {
      attemptsRef.current += 1;
      console.log('[PAYMENT_POLL] Checking enrollment (attempt', attemptsRef.current, ')...');

      try {
        const isEnrolled = await checkCourseEnrollment(studentId, courseId);

        if (isEnrolled) {
          console.log('[PAYMENT_POLL] Enrollment confirmed!');
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
      console.log('[PAYMENT_POLL] Cleanup — stopping poll');
      stopPolling();
    };
  }, [enabled, studentId, courseId, intervalMs, timeoutMs, stopPolling]);

  return { pollStatus, reset } as const;
}
