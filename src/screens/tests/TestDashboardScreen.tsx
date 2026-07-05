/**
 * TestDashboardScreen
 *
 * Developer-only screen for testing backend (Supabase) service integrations.
 *
 * Provides buttons to test:
 * - Supabase connection (classService.getClasses)
 * - Auth service operations (session, user)
 * - Redux store state
 *
 * @module TestDashboardScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClasses } from '../../services/classService';
import { getSession } from '../../services/authService';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectIsAuthenticated, selectAuthError } from '../../store/authSlice';

type TestResult = {
  label: string;
  success: boolean;
  data?: string;
  error?: string;
};

export default function TestDashboardScreen(): React.JSX.Element {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authError = useAppSelector(selectAuthError);

  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]);
  };

  const testSupabaseConnection = async () => {
    setLoading('supabase');
    try {
      const classes = await getClasses();
      addResult({
        label: 'Supabase Connection (getClasses)',
        success: true,
        data: JSON.stringify(classes, null, 2),
      });
    } catch (err: any) {
      addResult({
        label: 'Supabase Connection (getClasses)',
        success: false,
        error: err?.message ?? 'Unknown error',
      });
    } finally {
      setLoading(null);
    }
  };

  const testSession = async () => {
    setLoading('session');
    try {
      const result = await getSession();
      addResult({
        label: 'Auth Session',
        success: result.success,
        data: result.success ? JSON.stringify(result.data, null, 2) : undefined,
        error: result.success ? undefined : result.error,
      });
    } catch (err: any) {
      addResult({
        label: 'Auth Session',
        success: false,
        error: err?.message ?? 'Unknown error',
      });
    } finally {
      setLoading(null);
    }
  };

  const testReduxState = () => {
    addResult({
      label: 'Redux Auth State',
      success: true,
      data: JSON.stringify(
        {
          isAuthenticated,
          user: user
            ? {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                emailVerified: user.emailVerified,
              }
            : null,
          error: authError,
        },
        null,
        2,
      ),
    });
  };

  const clearResults = () => setResults([]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧪 Backend Test Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Test Supabase services before frontend integration
        </Text>
      </View>

      {/* User info card */}
      <View style={styles.userCard}>
        <Text style={styles.userCardTitle}>Current User</Text>
        {user ? (
          <>
            <Text style={styles.userInfo}>
              <Text style={styles.label}>Name: </Text>
              {user.name || 'N/A'}
            </Text>
            <Text style={styles.userInfo}>
              <Text style={styles.label}>Email: </Text>
              {user.email}
            </Text>
            <Text style={styles.userInfo}>
              <Text style={styles.label}>Role: </Text>
              <Text style={styles.roleBadge}>{user.role}</Text>
            </Text>
            <Text style={styles.userInfo}>
              <Text style={styles.label}>Email Verified: </Text>
              {user.emailVerified ? '✅' : '❌'}
            </Text>
            <Text style={styles.userInfo}>
              <Text style={styles.label}>ID: </Text>
              {user.id.slice(0, 16)}...
            </Text>
          </>
        ) : (
          <Text style={styles.noUser}>Not authenticated</Text>
        )}
      </View>

      {/* Test buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.testButton, loading === 'supabase' && styles.buttonDisabled]}
          onPress={testSupabaseConnection}
          disabled={loading !== null}>
          {loading === 'supabase' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>🔌 Test Supabase</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, styles.sessionButton, loading === 'session' && styles.buttonDisabled]}
          onPress={testSession}
          disabled={loading !== null}>
          {loading === 'session' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>🔑 Test Session</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, styles.reduxButton]}
          onPress={testReduxState}>
          <Text style={styles.buttonText}>📦 Redux State</Text>
        </TouchableOpacity>
      </View>

      {/* Clear button */}
      {results.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
          <Text style={styles.clearButtonText}>Clear Results</Text>
        </TouchableOpacity>
      )}

      {/* Results */}
      <ScrollView style={styles.resultsContainer}>
        {results.length === 0 ? (
          <Text style={styles.placeholder}>
            Press a button above to test a backend service. Results will appear here.
          </Text>
        ) : (
          results.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultCard,
                result.success ? styles.resultSuccess : styles.resultError,
              ]}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultLabel}>
                  {result.success ? '✅' : '❌'} {result.label}
                </Text>
              </View>
              {result.data && (
                <Text style={styles.resultData}>{result.data}</Text>
              )}
              {result.error && (
                <Text style={styles.resultErrorText}>{result.error}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6C63FF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontWeight: '600',
    color: '#666',
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  noUser: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  sessionButton: {
    backgroundColor: '#2196F3',
  },
  reduxButton: {
    backgroundColor: '#FF9800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  clearButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  placeholder: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 14,
    marginTop: 40,
    lineHeight: 22,
  },
  resultCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  resultSuccess: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resultError: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  resultData: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#555',
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  resultErrorText: {
    fontSize: 13,
    color: '#D32F2F',
    marginTop: 4,
  },
});
