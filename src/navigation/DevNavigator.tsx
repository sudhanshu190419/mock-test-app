// DEV ONLY
// Remove after production frontend integration

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import {
  StreamTestScreen,
  SubjectTestScreen,
  ChapterTestScreen,
  TopicTestScreen,
  BatchTestScreen,
  ContentTestScreen,
  TagTestScreen,
  ApprovalTestScreen,
} from '../screens/dev';

export type DevStackParamList = {
  DevHome: undefined;
  StreamTest: undefined;
  SubjectTest: undefined;
  ChapterTest: undefined;
  TopicTest: undefined;
  BatchTest: undefined;
  ContentTest: undefined;
  TagTest: undefined;
  ApprovalTest: undefined;
};

const Stack = createNativeStackNavigator<DevStackParamList>();

// ─── Test Menu Items ────────────────────────────────────────────────────────

interface TestItem {
  title: string;
  subtitle: string;
  screen: keyof DevStackParamList;
  color: string;
  emoji: string;
}

const TEST_ITEMS: TestItem[] = [
  { title: 'Stream Test', subtitle: 'CRUD for academic streams', screen: 'StreamTest', color: '#D32F2F', emoji: '📡' },
  { title: 'Subject Test', subtitle: 'CRUD for subjects within a stream', screen: 'SubjectTest', color: '#2196F3', emoji: '📘' },
  { title: 'Chapter Test', subtitle: 'CRUD for chapters within a subject', screen: 'ChapterTest', color: '#388E3C', emoji: '📖' },
  { title: 'Topic Test', subtitle: 'CRUD for topics within a chapter', screen: 'TopicTest', color: '#F57C00', emoji: '🏷️' },
  { title: 'Batch Test', subtitle: 'CRUD for student batches', screen: 'BatchTest', color: '#7B1FA2', emoji: '👥' },
  { title: 'Content Test', subtitle: 'CRUD, lifecycle & upload for content', screen: 'ContentTest', color: '#00BCD4', emoji: '📄' },
  { title: 'Tag Test', subtitle: 'CRUD & relations for content tags', screen: 'TagTest', color: '#FF4081', emoji: '🏷️' },
  { title: 'Approval Test', subtitle: 'Review workflow & approval queue', screen: 'ApprovalTest', color: '#4CAF50', emoji: '✅' },
];

// ─── Dev Home Screen ────────────────────────────────────────────────────────

type DevHomeNavProp = NativeStackNavigationProp<DevStackParamList, 'DevHome'>;

function DevHomeScreen(): React.JSX.Element {
  const navigation = useNavigation<DevHomeNavProp>();

  return (
    <SafeAreaView style={homeStyles.container}>
      <ScrollView contentContainerStyle={homeStyles.scrollContent}>
        <View style={homeStyles.header}>
          <Text style={homeStyles.headerTitle}>🧪 Academic CRUD Tests</Text>
          <Text style={homeStyles.headerSubtitle}>
            DEV ONLY — Select a test screen below
          </Text>
        </View>

        {TEST_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[homeStyles.card, { borderLeftColor: item.color }]}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.7}>
            <View style={homeStyles.cardContent}>
              <Text style={homeStyles.cardEmoji}>{item.emoji}</Text>
              <View style={homeStyles.cardText}>
                <Text style={homeStyles.cardTitle}>{item.title}</Text>
                <Text style={homeStyles.cardSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={homeStyles.cardArrow}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const homeStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { paddingBottom: 40 },
  header: { backgroundColor: '#1A1A2E', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: '#FF6B6B', fontWeight: '600', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardEmoji: { fontSize: 28, marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  cardSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  cardArrow: { fontSize: 18, color: '#CCC', fontWeight: '700', marginLeft: 8 },
});

// ─── Dev Navigator ──────────────────────────────────────────────────────────

export default function DevNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="DevHome"
      screenOptions={{
        headerShown: true,
        headerTintColor: '#6C63FF',
        headerStyle: { backgroundColor: '#1A1A2E' },
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="DevHome"
        component={DevHomeScreen}
        options={{ headerTitle: '🧪 Dev Hub', headerBackTitle: 'Home' }}
      />
      <Stack.Screen
        name="StreamTest"
        component={StreamTestScreen}
        options={{ headerTitle: '📡 Stream Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="SubjectTest"
        component={SubjectTestScreen}
        options={{ headerTitle: '📘 Subject Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="ChapterTest"
        component={ChapterTestScreen}
        options={{ headerTitle: '📖 Chapter Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="TopicTest"
        component={TopicTestScreen}
        options={{ headerTitle: '🏷️ Topic Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="BatchTest"
        component={BatchTestScreen}
        options={{ headerTitle: '👥 Batch Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="ContentTest"
        component={ContentTestScreen}
        options={{ headerTitle: '📄 Content Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="TagTest"
        component={TagTestScreen}
        options={{ headerTitle: '🏷️ Tag Test', headerBackTitle: 'Dev Hub' }}
      />
      <Stack.Screen
        name="ApprovalTest"
        component={ApprovalTestScreen}
        options={{ headerTitle: '✅ Approval Test', headerBackTitle: 'Dev Hub' }}
      />
    </Stack.Navigator>
  );
}
