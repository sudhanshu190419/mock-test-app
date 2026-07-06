/**
 * useTestTimer
 *
 * Production-grade countdown timer hook for the test engine.
 * Supports pause, resume, reset, and a time-up callback.
 * Designed to later support background mode and backend sync.
 *
 * @module hooks/useTestTimer
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/** Formatted time string (HH:MM:SS). */
function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

interface UseTestTimerReturn {
  /** Remaining time in seconds. */
  timeRemaining: number;
  /** Formatted time string (HH:MM:SS or MM:SS). */
  formattedTime: string;
  /** Whether the timer is paused. */
  isPaused: boolean;
  /** Pause the timer. */
  pause: () => void;
  /** Resume the timer. */
  resume: () => void;
  /** Reset to a specific number of seconds. */
  reset: (seconds: number) => void;
  /** Progress as a fraction (0–1). */
  progress: number;
  /** Initial duration in seconds. */
  initialDuration: number;
}

/**
 * Countdown timer hook.
 *
 * Uses a ref-based approach to avoid re-creating the interval on every
 * tick. The onTimeUp callback is stored in a ref to avoid stale closures
 * without re-triggering the effect. A separate useEffect watches for the
 * timer reaching zero to fire the callback, avoiding impure side effects
 * inside state updaters (which React Strict Mode would double-invoke).
 *
 * @param initialSeconds - Starting countdown value in seconds.
 * @param onTimeUp - Callback invoked when the timer reaches zero.
 */
export function useTestTimer(
  initialSeconds: number,
  onTimeUp: () => void,
): UseTestTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);
  const initialRef = useRef(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFiredRef = useRef(false);

  // Keep the callback ref current without re-triggering the effect.
  onTimeUpRef.current = onTimeUp;

  // Timer tick effect — only runs when isPaused changes.
  useEffect(() => {
    if (isPaused || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Reset the fired flag when timer starts/resumes.
    hasFiredRef.current = false;

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused]);

  // Fire onTimeUp when timeRemaining reaches 0 (clean, no side effects in updater).
  useEffect(() => {
    if (timeRemaining <= 0 && !hasFiredRef.current) {
      hasFiredRef.current = true;
      // Stop the interval immediately.
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onTimeUpRef.current();
    }
  }, [timeRemaining]);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  const reset = useCallback((seconds: number) => {
    setTimeRemaining(seconds);
    initialRef.current = seconds;
    hasFiredRef.current = false;
    setIsPaused(false);
  }, []);

  const progress =
    initialRef.current > 0 ? timeRemaining / initialRef.current : 0;

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    isPaused,
    pause,
    resume,
    reset,
    progress,
    initialDuration: initialRef.current,
  };
}

export { formatTime };
