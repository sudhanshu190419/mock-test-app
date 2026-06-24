/**
 * Typed Redux Hooks
 *
 * Pre-typed versions of `useDispatch` and `useSelector` that know about
 * the application's `RootState` and `AppDispatch` types.
 *
 * Use these hooks throughout the application instead of the raw
 * `useDispatch` / `useSelector` from `react-redux` so that every
 * consumer gets correct TypeScript inference without manual annotations.
 *
 * ## Usage
 *
 * ```tsx
 * import { useAppDispatch, useAppSelector } from '../store/hooks';
 * import { setUser, selectUser } from '../store/authSlice';
 *
 * function ProfileCard() {
 *   const dispatch = useAppDispatch();
 *   const user = useAppSelector(selectUser);
 *
 *   const handleUpdate = () => {
 *     dispatch(setUser(updatedUser));  // payload type inferred ✅
 *   };
 * }
 * ```
 *
 * @module hooks
 */

import {
  useDispatch,
  useSelector,
} from 'react-redux';
import type { AppDispatch, RootState } from './store';

// ─── Dispatch ───────────────────────────────────────────────────────────────

/**
 * Typed dispatch hook.
 *
 * In React Redux v9, `.withTypes()` returns a new function that is
 * identical to `useDispatch` at runtime but carries an `AppDispatch`
 * type that flows through to any dispatched action creators.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// ─── Selector ───────────────────────────────────────────────────────────────

/**
 * Typed selector hook.
 *
 * The `RootState` generic is pre-applied so that every call to
 * `useAppSelector` automatically knows the shape of the state tree
 * and can infer the return type from the selector function.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
