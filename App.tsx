/**
 * Root Application Component
 *
 * Sets up the application-wide provider hierarchy:
 *
 * 1. **Redux Provider** — makes the store available to all connected components
 * 2. **AuthProvider** — bridges Supabase auth lifecycle events to Redux state
 * 3. **AppNavigator** — renders the navigation tree
 *
 * @module App
 */

import React from 'react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './src/store/store';
import { AuthProvider } from './src/providers/AuthProvider';
import AuthNavigator from './src/navigation/AuthNavigator';

const queryClient = new QueryClient();

export default function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  );
}