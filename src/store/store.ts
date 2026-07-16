/**
 * Redux Store Configuration
 *
 * Central Redux store for the application.
 *
 * ## Setup
 *
 * Import this module in your root component and wrap the app with
 * React Redux's `<Provider>`:
 *
 * ```tsx
 * import React from 'react';
 * import { Provider } from 'react-redux';
 * import { store } from './src/store/store';
 * import AppNavigator from './src/navigation/AppNavigator';
 *
 * export default function App() {
 *   return (
 *     <Provider store={store}>
 *       <AppNavigator />
 *     </Provider>
 *   );
 * }
 * ```
 *
 * @module store
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import purchaseReducer from './purchaseSlice';

// ─── Store ──────────────────────────────────────────────────────────────────

/**
 * Application-wide Redux store.
 *
 * ### Reducer map
 *
 * | Key    | Reducer       | Slice             |
 * |--------|---------------|-------------------|
 * | `auth` | `authReducer` | `src/store/authSlice.ts` |
 * | `purchase` | `purchaseReducer` | `src/store/purchaseSlice.ts` |
 *
 * ### Middleware
 *
 * Uses the default Redux Toolkit middleware stack:
 * - **Immer** — enables mutable-style reducer syntax
 * - **SerializableCheck** — warns when non-serializable values enter the state
 * - **Thunk** — enables async thunks for side-effect logic
 *
 * The middleware configuration is intentionally left at defaults because
 * all state in `authSlice` is fully serializable (strings, booleans, null).
 * If future slices introduce non-serializable values (e.g. React component instances),
 * extend the middleware config to suppress specific checks:
 *
 * ```ts
 * middleware: (getDefaultMiddleware) =>
 *   getDefaultMiddleware({
 *     serializableCheck: {
 *       ignoredActions: ['some/action'],
 *       ignoredPaths: ['some.path'],
 *     },
 *   }),
 * ```
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    purchase: purchaseReducer,
  },
  // DevTools are enabled by default in non-production builds.
  // No additional middleware configuration is needed.
  devTools: __DEV__,
});

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Root state type inferred from the store's reducer map.
 *
 * Use this with typed selector hooks:
 * ```ts
 * const user = useAppSelector(selectUser);
 * // 'user' is typed as UserProfile | null
 * ```
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * Dispatch type inferred from the store's middleware stack.
 *
 * This type includes the base `dispatch` plus any middleware extensions
 * (e.g. thunk). Use this with typed dispatch hooks:
 * ```ts
 * const dispatch = useAppDispatch();
 * dispatch(setUser(user));  // fully typed
 * ```
 */
export type AppDispatch = typeof store.dispatch;
