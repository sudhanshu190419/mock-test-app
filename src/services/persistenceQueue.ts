/**
 * Per-answerId Persistence Queue
 *
 * Guarantees that for any answerId, at most one persistence operation
 * executes at a time.  If an operation is already in-flight when a new
 * one is requested, the new operation replaces any pending operation
 * (latest-wins semantics).  When the in-flight operation completes,
 * the latest pending operation runs next.
 *
 * This eliminates race conditions from concurrent HTTP requests for
 * the same mock_answer row (see Phase 2 audit for details on the
 * DELETE + INSERT + UPDATE interleaving problem).
 *
 * ## Guarantees
 *
 * - At most 1 active HTTP request per answerId at any instant
 * - At most 1 pending state per answerId (older pending is discarded)
 * - The database always converges to the student's final action
 * - Different answerIds run independently (no cross-question blocking)
 * - Never blocks the UI — enqueuePersist() is sync and O(1)
 *
 * ## Usage
 *
 * ```ts
 * import { enqueuePersist } from '../../services/persistenceQueue';
 *
 * enqueuePersist(answerId, async () => {
 *   await persistAnswerLive({ answerId, ... });
 * });
 * ```
 *
 * @module services/persistenceQueue
 */

type QueueTask = () => Promise<void>;

interface PerAnswerState {
  /** True while a task is in-flight for this answerId. */
  active: boolean;
  /** The latest pending task, or null if the queue is draining. */
  pending: QueueTask | null;
}

const queues = new Map<string, PerAnswerState>();

/**
 * Enqueue a persistence task for a specific answerId.
 *
 * @param answerId - The mock_answer row being persisted.
 * @param task     - Async function that performs the actual persistence
 *                   (e.g. persistAnswerLive or updateMockAnswer).
 *
 * ## Ordering guarantees
 *
 * ```
 * enqueue(id, task_A)   → active=true, starts task_A immediately
 * enqueue(id, task_B)   → active=true, pending=task_B
 * enqueue(id, task_C)   → active=true, pending=task_C  (task_B discarded)
 * task_A completes      → runs task_C
 * task_C completes      → active=false, done
 * ```
 *
 * The database always ends with the state from task_C (the latest).
 */
export function enqueuePersist(answerId: string, task: QueueTask): void {
  let state = queues.get(answerId);

  if (!state) {
    state = { active: false, pending: null };
    queues.set(answerId, state);
  }

  if (state.active) {
    // Latest-wins: replace any existing pending task (discard intermediate)
    state.pending = task;
    return;
  }

  // No active task — start immediately
  state.active = true;
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  runNext(answerId, task);
}

/**
 * Execute a task and, when it resolves, either start the next pending
 * task for the same answerId or mark the queue as idle.
 */
async function runNext(answerId: string, task: QueueTask): Promise<void> {
  try {
    await task();
  } catch (err) {
    console.log('[PERSIST_QUEUE] Task failed for answerId:', answerId, err);
  }

  const state = queues.get(answerId);
  if (!state) return; // queue was cleared during flight

  if (state.pending) {
    const next = state.pending;
    state.pending = null;
    // Chain synchronously so no other task can sneak in between
    await runNext(answerId, next);
  } else {
    state.active = false;
  }
}

/**
 * Check whether a given answerId has an active or pending task.
 * Useful for debugging or guards in submit flows.
 */
export function hasPendingWork(answerId: string): boolean {
  const state = queues.get(answerId);
  return state ? state.active || state.pending !== null : false;
}

/**
 * Remove all queue state for a specific answerId.
 * Any currently executing task WILL complete, but its chained
 * pending task (if any) will NOT run.
 * Call during cleanup to prevent memory leaks.
 */
export function clearPersistQueue(answerId: string): void {
  queues.delete(answerId);
}

/**
 * Remove all queue state.  Call when leaving the test screen to
 * release captured task closures and prevent memory leaks.
 */
export function clearAllPersistQueues(): void {
  queues.clear();
}

/**
 * Wait until ALL per-answerId queues are idle (no active or pending tasks).
 *
 * Used by the auto-submit flow (Phase 5) to ensure every pending answer
 * has reached the database before submission finalises.
 *
 * @param timeoutMs - Maximum time to wait before rejecting (default 10000ms).
 * @throws          - If the timeout is exceeded before all queues drain.
 *
 * ## Safety
 *
 * After `isSubmitted` is set to true, no new tasks should be enqueued
 * because all interaction handlers check `isSubmitted` before calling
 * persistCurrentAnswer / persistCurrentReviewFlag.  This function waits
 * for the *existing* in-flight and pending tasks to complete, then resolves.
 */
export function drainAllPersistQueues(timeoutMs = 10_000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // If all queues are already idle, resolve immediately
    const check = (): boolean => {
      for (const state of queues.values()) {
        if (state.active || state.pending !== null) {
          return false;
        }
      }
      return true;
    };

    if (check()) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Persist queue drain timed out after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    const poll = (): void => {
      if (check()) {
        clearTimeout(timeout);
        resolve();
        return;
      }
      setTimeout(poll, 50);
    };

    setTimeout(poll, 50);
  });
}
