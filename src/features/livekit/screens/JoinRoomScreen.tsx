/**
 * JoinRoomScreen
 *
 * First screen of the LiveKit POC.
 *
 * Provides a simple form where the user enters:
 * - Room name
 * - Participant name
 * - Role (Teacher / Student)
 *
 * On submit, requests media permissions, fetches a token,
 * and navigates to the LiveRoomScreen.
 *
 * @module features/livekit/screens/JoinRoomScreen
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getLiveKitToken } from '../services/tokenService';
import { useMediaPermissions } from '../hooks/useMediaPermissions';
import type { LiveKitRole } from '../types';
import type { LiveKitStackParamList } from '../../../navigation/AppNavigator';

// ═══════════════════════════════════════════════════════════════════════════
//  Navigation Type
// ═══════════════════════════════════════════════════════════════════════════

type JoinRoomNavProp = NativeStackNavigationProp<LiveKitStackParamList, 'JoinRoom'>;

// ═══════════════════════════════════════════════════════════════════════════
//  Screen
// ═══════════════════════════════════════════════════════════════════════════

export default function JoinRoomScreen(): React.JSX.Element {
  const navigation = useNavigation<JoinRoomNavProp>();
  const { permissions, requestPermissions } = useMediaPermissions();

  const [roomName, setRoomName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [role, setRole] = useState<LiveKitRole>('student');
  const [isJoining, setIsJoining] = useState(false);

  // ── Join Handler ───────────────────────────────────────────────────────

  const handleJoin = useCallback(async () => {
    // Validate inputs
    const trimmedRoom = roomName.trim();
    const trimmedName = participantName.trim();

    if (!trimmedRoom) {
      Alert.alert('Validation', 'Please enter a room name.');
      return;
    }
    if (!trimmedName) {
      Alert.alert('Validation', 'Please enter your name.');
      return;
    }

    setIsJoining(true);

    try {
      // 1. Request media permissions
      console.log('[LiveKit] Requesting media permissions...');
      const permResult = await requestPermissions();

      if (!permResult.camera && !permResult.microphone) {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone access are needed to join a room. Please grant these permissions in your device settings.',
        );
        setIsJoining(false);
        return;
      }

      if (!permResult.camera) {
        Alert.alert(
          'Camera Permission Denied',
          'Camera access is needed for video. You can still join with audio only.',
        );
      }

      if (!permResult.microphone) {
        Alert.alert(
          'Microphone Permission Denied',
          'Microphone access is needed for audio. You can still join with video only.',
        );
      }

      // 2. Fetch LiveKit token
      console.log('[LiveKit] Fetching token for room:', trimmedRoom);
      const tokenResponse = await getLiveKitToken({
        roomName: trimmedRoom,
        participantName: trimmedName,
        role,
      });

      if (!tokenResponse.token || tokenResponse.token === 'MOCK_TOKEN_REPLACE_WITH_BACKEND') {
        Alert.alert(
          'Token Required',
          'No valid LiveKit token received. Please set up the backend token endpoint at:\n\n' +
          'POST /livekit/token\n\n' +
          'For now, make sure your backend is running or configure the token endpoint in src/features/livekit/services/tokenService.ts',
        );
        setIsJoining(false);
        return;
      }

      // 3. Navigate to LiveRoom with token
      console.log('[LiveKit] Navigating to LiveRoom...');
      navigation.navigate('LiveRoom', {
        url: tokenResponse.url,
        token: tokenResponse.token,
        roomName: trimmedRoom,
        participantName: trimmedName,
        role,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join room.';
      console.error('[LiveKit] Join failed:', message);
      Alert.alert('Error', message);
    } finally {
      setIsJoining(false);
    }
  }, [roomName, participantName, role, requestPermissions, navigation]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🎥 LiveKit POC</Text>
            <Text style={styles.headerSubtitle}>
              Join a room to test audio/video streaming
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Room Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Room Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. test-room-1"
                placeholderTextColor="#666"
                value={roomName}
                onChangeText={setRoomName}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isJoining}
              />
            </View>

            {/* Participant Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor="#666"
                value={participantName}
                onChangeText={setParticipantName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isJoining}
              />
            </View>

            {/* Role Selector */}
            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'student' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('student')}
                  disabled={isJoining}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleIcon}>👨‍🎓</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      role === 'student' && styles.roleLabelActive,
                    ]}
                  >
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'teacher' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('teacher')}
                  disabled={isJoining}
                  activeOpacity={0.7}
                >
                  <Text style={styles.roleIcon}>👨‍🏫</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      role === 'teacher' && styles.roleLabelActive,
                    ]}
                  >
                    Teacher
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Permission Status */}
            <View style={styles.permissionInfo}>
              <Text style={styles.permissionText}>
                {permissions.camera && permissions.microphone
                  ? '✅ Camera and microphone permissions granted'
                  : !permissions.camera && !permissions.microphone
                  ? '⚠️ Permissions will be requested on join'
                  : permissions.camera
                  ? '✅ Camera granted'
                  : '⚠️ Camera will be requested'}
                {' • '}
                {permissions.microphone
                  ? '✅ Mic granted'
                  : '⚠️ Mic will be requested'}
              </Text>
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[styles.joinButton, isJoining && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={isJoining}
              activeOpacity={0.7}
            >
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.joinIcon}>🚀</Text>
                  <Text style={styles.joinText}>Join Room</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8888AA',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2A2A4A',
  },
  roleButtonActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#1A1A3E',
  },
  roleIcon: {
    fontSize: 20,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  roleLabelActive: {
    color: '#FFFFFF',
  },
  permissionInfo: {
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    padding: 12,
  },
  permissionText: {
    fontSize: 11,
    color: '#8888AA',
    textAlign: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  joinButtonDisabled: {
    backgroundColor: '#3A3680',
    opacity: 0.7,
  },
  joinIcon: {
    fontSize: 20,
  },
  joinText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
