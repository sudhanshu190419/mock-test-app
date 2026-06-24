/**
 * ForgotPasswordScreen
 *
 * Temporary developer placeholder screen — no actual reset logic yet.
 * The frontend team will implement the full password reset flow.
 *
 * @module ForgotPasswordScreen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
} from 'react-native';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = (): void => {
    // TODO: Implement password reset via authService
    // const result = await resetPassword(email);
    setSent(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>

      {sent ? (
        <Text style={styles.success}>
          If an account exists for this email, a reset link has been sent.
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title="Send Reset Link"
            onPress={handleSend}
            disabled={!email.trim()}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  success: {
    fontSize: 16,
    textAlign: 'center',
    color: '#2E7D32',
    lineHeight: 24,
  },
});
