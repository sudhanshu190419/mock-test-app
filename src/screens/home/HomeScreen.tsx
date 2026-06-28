/**
 * HomeScreen
 *
 * Main screen after authentication — acts as a demo/testing hub.
 * Shows user profile info and provides navigation to backend test
 * dashboard and other demo screens.
 *
 * @module HomeScreen
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { selectUser, selectUserRole } from '../../store/authSlice';
import { useAuth } from '../../hooks/useAuth';
import type { AppStackParamList } from '../../navigation/AppNavigator';

type HomeNavProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavProp>();
  const user = useAppSelector(selectUser);
  const role = useAppSelector(selectUserRole);
  const { logout, loading } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const demoCards = [
    {
      title: '🧪 Backend Test Dashboard',
      description: 'Test Supabase connection, auth sessions, and Redux state',
      color: '#6C63FF',
      onPress: () => navigation.navigate('TestDashboard'),
    },
    {
      title: '📚 Classes API',
      description: 'Test class data fetching from Supabase',
      color: '#2196F3',
      onPress: () => navigation.navigate('TestDashboard'),
    },
    {
      title: '🔐 Auth Services',
      description: 'Test sign-in, sign-up, session refresh flows',
      color: '#FF9800',
      onPress: () => navigation.navigate('TestDashboard'),
    },
    // DEV ONLY - Remove after frontend integration
    {
      title: '🧪 Academic CRUD Tests',
      description: 'Test all entity CRUD operations (Streams, Subjects, Chapters, Topics, Batches)',
      color: '#D32F2F',
      onPress: () => navigation.navigate('DevHub'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {user?.name || 'User'} 👋
        </Text>
        <Text style={styles.subtitle}>Demo Testing Hub</Text>
      </View>

      {/* User Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'Unknown'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
          <View style={styles.roleRow}>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{role || 'student'}</Text>
            </View>
            {user?.emailVerified && (
              <View style={[styles.rolePill, styles.verifiedPill]}>
                <Text style={[styles.roleText, styles.verifiedText]}>Verified</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Demo Cards */}
      <ScrollView style={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Test Backend Services</Text>

        {demoCards.map((card, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.demoCard, { borderLeftColor: card.color }]}
            onPress={card.onPress}
            activeOpacity={0.7}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDescription}>{card.description}</Text>
            <Text style={[styles.cardAction, { color: card.color }]}>
              Open Test →
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Quick Info</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>User ID</Text>
          <Text style={styles.infoValue}>
            {user?.id ? `${user.id.slice(0, 20)}...` : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Account Created</Text>
          <Text style={styles.infoValue}>
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : 'N/A'}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email Verified</Text>
          <Text style={styles.infoValue}>
            {user?.emailVerified ? 'Yes ✅' : 'No ❌'}
          </Text>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loading}>
          <Text style={styles.logoutText}>
            {loading ? 'Signing out...' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
    paddingTop: 60,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rolePill: {
    backgroundColor: '#F0F0FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
    textTransform: 'capitalize',
  },
  verifiedPill: {
    backgroundColor: '#E8F5E9',
  },
  verifiedText: {
    color: '#2E7D32',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
    marginTop: 4,
  },
  demoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    marginBottom: 8,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D32F2F',
  },
});