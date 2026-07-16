/**
 * Purchase Slice
 *
 * Redux Toolkit slice tracking whether a purchase flow is currently in
 * progress. The FCM foreground handler reads this flag to suppress
 * commerce notifications while the user is actively buying.
 *
 * ## Responsibilities
 *
 * - Hold a single boolean `isPurchaseInProgress`
 * - Provide `setPurchaseInProgress` action for purchase screens to call
 * - Expose a `selectIsPurchaseInProgress` selector for consumers
 *
 * ## Why a dedicated slice?
 *
 * The FCM foreground handler (`setupForegroundMessageHandler`) runs
 * outside the React component tree — it registers a native listener
 * during app startup. It cannot use React hooks. By storing this flag
 * in Redux, the handler can synchronously read the latest value via
 * `store.getState().purchase.isPurchaseInProgress`.
 *
 * @module purchaseSlice
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './store';

// ─── State ──────────────────────────────────────────────────────────────────

export interface PurchaseState {
  /**
   * `true` while a purchase flow is actively in progress.
   *
   * Set to `true` when the user taps "Buy" / "Enroll Now".
   * Reset to `false` when:
   *   - The purchase succeeds (enrollment confirmed)
   *   - The purchase fails (any error)
   *   - The purchase is cancelled (user closes the overlay)
   *   - The purchase flow exits unexpectedly
   */
  isPurchaseInProgress: boolean;
}

const initialState: PurchaseState = {
  isPurchaseInProgress: false,
};

// ─── Slice ──────────────────────────────────────────────────────────────────

const purchaseSlice = createSlice({
  name: 'purchase',
  initialState,
  reducers: {
    /**
     * Set the purchase-in-progress flag.
     *
     * @param action.payload - `true` when a purchase starts, `false` when it
     *                         completes, fails, or is cancelled.
     */
    setPurchaseInProgress(state, action: PayloadAction<boolean>) {
      state.isPurchaseInProgress = action.payload;
    },
  },
});

// ─── Named export ───────────────────────────────────────────────────────────

export const { setPurchaseInProgress } = purchaseSlice.actions;

// ─── Reducer ────────────────────────────────────────────────────────────────

export default purchaseSlice.reducer;

// ─── Selector ──────────────────────────────────────────────────────────────

/**
 * Returns `true` when a purchase flow is currently active, `false` otherwise.
 *
 * @example
 * // In a React component:
 * const isPurchasing = useAppSelector(selectIsPurchaseInProgress);
 *
 * // In a non-React module (e.g. fcmService.ts):
 * const isPurchasing = store.getState().purchase.isPurchaseInProgress;
 */
export const selectIsPurchaseInProgress = (state: RootState): boolean =>
  state.purchase.isPurchaseInProgress;
