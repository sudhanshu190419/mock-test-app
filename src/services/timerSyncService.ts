/**
 * Timer Sync Service
 *
 * Periodically synchronises the client-side countdown timer with the
 * server so the backend knows:
 *   - Remaining time (time_remaining_seconds)
 *   - Last activity (via updated_at on mock_attempts)
 *
 * ## Sync triggers
 *
 * | Trigger         | Behaviour                                      |
 * |-----------------|------------------------------------------------|
 * | Periodic        | Every 30 seconds while the test is active      |
 * | App background  | Immediate sync (time + flush question time)    |
 * | App foreground  | Immediate sync + resume local timer            |
 * | Submit          | Final sync before marking attempt submitted    |
 * | Timer expiry    | Final sync (handled by submit path)            |
 *
 * ## Error handling
 *
 * Sync failures never interrupt the student.  Errors are logged and
 * the status is reported back so the caller can update the autosave
 * indicator.  The next scheduled sync will retry naturally.
 *
 * @module services/timerSyncService
 */

import { updateMockAttempt } from './mockTest/mockAttemptService';

// ─── Module-level state ──────────────────────────────────────────────

let _intervalId: ReturnType<typeof setInterval> | null = null;
let _attemptId: string | null = null;
let _getTimeRemaining: (() => number) | null = null;
let _onStatusChange: ((status: 'saved' | 'local') => void) | null = null;

// ─── Internal ─────────────────────────────────────────────────────────

async function doSync(): Promise<void> {
  if (!_attemptId || !_getTimeRemaining) return;

  const timeRemainingSeconds = Math.max(0, Math.floor(_getTimeRemaining()));

  const result = await updateMockAttempt(_attemptId, {
    timeRemainingSeconds,
  });

  if (result.success) {
    _onStatusChange?.('saved');
  } else {
    console.log('[TIMER_SYNC] Sync failed:', result.error);
    _onStatusChange?.('local');
  }
}

// ─── Public API ───────────────────────────────────────────────────────

/**
 * Start periodic timer synchronisation.
 *
 * @param params.attemptId        - The current mock_attempt UUID
 * @param params.getTimeRemaining - Function that returns the current
 *                                   remaining time in seconds (reads
 *                                   from the timer hook's state)
 * @param params.onStatusChange   - Optional callback fired after each
 *                                   sync attempt (updates autosave indicator)
 *
 * The first sync runs immediately.  Subsequent syncs run every 30 s.
 */
export function startTimerSync(params: {
  attemptId: string;
  getTimeRemaining: () => number;
  onStatusChange?: (status: 'saved' | 'local') => void;
}): void {
  stopTimerSync(); // Ensure no duplicate intervals

  _attemptId = params.attemptId;
  _getTimeRemaining = params.getTimeRemaining;
  _onStatusChange = params.onStatusChange ?? null;

  // Immediate first sync
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  doSync();

  // Periodic sync every 30 seconds
  _intervalId = setInterval(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    doSync();
  }, 30_000);
}

/**
 * Stop periodic timer synchronisation.
 * Call on unmount or when the test is submitted.
 */
export function stopTimerSync(): void {
  if (_intervalId !== null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _attemptId = null;
  _getTimeRemaining = null;
  _onStatusChange = null;
}

/**
 * Perform a single timer sync immediately (fire-and-forget).
 * Used for background / foreground transitions and submit.
 *
 * @param attemptId            - The current mock_attempt UUID
 * @param timeRemainingSeconds - The current remaining time in seconds
 * @returns Promise<boolean>   - Whether the sync succeeded
 */
export async function syncTimerOnce(
  attemptId: string,
  timeRemainingSeconds: number,
): Promise<boolean> {
  const result = await updateMockAttempt(attemptId, {
    timeRemainingSeconds: Math.max(0, Math.floor(timeRemainingSeconds)),
  });
  if (!result.success) {
    console.log('[TIMER_SYNC] One-shot sync failed:', result.error);
  }
  return result.success;
}
