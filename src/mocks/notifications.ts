/**
 * Mock Notification Data
 *
 * Realistic dummy notifications for development and UI testing.
 * Covers all 8 notification types with varied timestamps so that
 * the screen shows Today / Yesterday / Earlier sections.
 *
 * Replace this file with real API data when the backend is ready.
 *
 * @module mocks/notifications
 */

import type { Notification } from '../types/notification';

// ═════════════════════════════════════════════════════════════════
//  Date Helpers
// ═════════════════════════════════════════════════════════════════

/** Return an ISO-8601 string offset by `hoursAgo` hours from now. */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

/** Return an ISO-8601 string offset by `daysAgo` days from now. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// ═════════════════════════════════════════════════════════════════
//  Mock Data
// ═════════════════════════════════════════════════════════════════

export const MOCK_NOTIFICATIONS: Notification[] = [
  // ── Today ─────────────────────────────────────────────────────
  {
    id: 'notif_001',
    title: 'New JEE Main PYQ Mock Test Available',
    description:
      'Practice with the latest JEE Main 2025 Shift 1 & 2 question papers. 75 questions, 3 hours.',
    type: 'mock-test',
    isRead: false,
    createdAt: hoursAgo(0.5),
    actionType: 'mockTestDetails',
    actionId: 'mt_jee_2025_01',
    priority: 'high',
  },
  {
    id: 'notif_002',
    title: 'Your NEET Mock Test Result is Ready',
    description:
      'You scored 520/720 in the NEET Full-Length Test #12. Check your detailed performance analysis now.',
    type: 'result',
    isRead: false,
    createdAt: hoursAgo(2),
    actionType: 'testResult',
    actionId: 'attempt_neet_12',
    priority: 'urgent',
  },
  {
    id: 'notif_003',
    title: 'Live Physics Class starts in 30 minutes',
    description:
      'Topic: Electrostatics & Gauss Law. Join Dr. Meera Iyer live at 6:00 PM.',
    type: 'live-class',
    isRead: false,
    createdAt: hoursAgo(0.25),
    actionType: 'liveClassDetails',
    actionId: 'class_phys_123',
  },
  {
    id: 'notif_004',
    title: 'Payment Successful — JEE Main 2026 Batch',
    description:
      'Your enrollment for JEE Main 2026 Complete Batch is confirmed. ₹5,999 paid via UPI.',
    type: 'payment',
    isRead: false,
    createdAt: hoursAgo(1),
    actionType: 'paymentDetails',
    actionId: 'order_jeemain_001',
    priority: 'high',
  },
  {
    id: 'notif_005',
    title: 'New Biology PYQs Added',
    description:
      '50 new NEET Biology previous year questions are now available in the PYQ bank. Start practicing!',
    type: 'mock-test',
    isRead: true,
    createdAt: hoursAgo(5),
    actionType: 'mockTestDetails',
    actionId: 'pyq_bio_2025',
  },
  {
    id: 'notif_006',
    title: 'JEE Main 2026 Registration Open',
    description:
      'NTA has announced JEE Main 2026 Session 1 registration. Complete your application before the deadline.',
    type: 'announcement',
    isRead: false,
    createdAt: hoursAgo(3),
    actionType: 'announcementDetails',
    actionId: 'jee_reg_2026',
    priority: 'high',
  },

  // ── Yesterday ──────────────────────────────────────────────────
  {
    id: 'notif_007',
    title: 'Congratulations! 🎉 You completed your first mock test',
    description:
      'You have taken your first step towards success. Complete 5 more tests this week to unlock the \'Test Champion\' badge.',
    type: 'system',
    isRead: true,
    createdAt: daysAgo(1),
    actionType: 'systemAlert',
  },
  {
    id: 'notif_008',
    title: 'Chemistry Revision Class Recording Available',
    description:
      'The recording of \'Organic Chemistry: Name Reactions\' is now available in your dashboard.',
    type: 'live-class',
    isRead: true,
    createdAt: daysAgo(1),
    actionType: 'liveClassDetails',
    actionId: 'class_chem_045',
  },
  {
    id: 'notif_009',
    title: 'Course Completion: 75% done in NEET Crash Course',
    description:
      'You are 75% through the NEET Ultimate Crash Course. Complete the remaining 25% to earn your certificate.',
    type: 'course',
    isRead: false,
    createdAt: daysAgo(1),
    actionType: 'courseDetails',
    actionId: 'course_neet_crash',
    priority: 'normal',
  },
  {
    id: 'notif_010',
    title: 'Daily Reminder: Solve 10 PYQs Today',
    description:
      'Stay consistent! Solve 10 Physics PYQs to maintain your streak. Current streak: 12 days 🔥',
    type: 'reminder',
    isRead: false,
    createdAt: daysAgo(1),
    actionType: 'deepLink',
    deepLink: 'mockprep://practice/pyq',
  },
  {
    id: 'notif_011',
    title: 'New Course: CUET UG Complete Preparation',
    description:
      'Our new CUET UG program covers all sections with 200+ hours of video content and 50 mock tests.',
    type: 'course',
    isRead: true,
    createdAt: daysAgo(1),
    actionType: 'courseDetails',
    actionId: 'course_cuet_2026',
  },

  // ── Earlier (2+ days ago) ──────────────────────────────────────
  {
    id: 'notif_012',
    title: 'Weekend Mega Mock Test — All Subjects',
    description:
      'Participate in the Weekend Mega Mock Test this Saturday. Covers Physics, Chemistry & Biology. Live leaderboard!',
    type: 'mock-test',
    isRead: true,
    createdAt: daysAgo(3),
    actionType: 'mockTestDetails',
    actionId: 'mt_mega_weekend',
  },
  {
    id: 'notif_013',
    title: 'Subscription Renewed — MockPrep Gold',
    description:
      'Your MockPrep Gold subscription has been renewed. Valid until Dec 2026. Thank you for being a premium member!',
    type: 'payment',
    isRead: true,
    createdAt: daysAgo(5),
    actionType: 'paymentDetails',
    actionId: 'sub_gold_2026',
  },
  {
    id: 'notif_014',
    title: 'Rank Improvement: +250 positions in NEET Leaderboard',
    description:
      'Your consistent practice is paying off! You moved up 250 positions on the NEET leaderboard this week.',
    type: 'result',
    isRead: true,
    createdAt: daysAgo(4),
    actionType: 'testResult',
    actionId: 'lb_neet_weekly',
  },
  {
    id: 'notif_015',
    title: 'System Update: New Features Available',
    description:
      'We have added a new dark mode, improved test engine, and performance analytics. Check out what\'s new!',
    type: 'system',
    isRead: true,
    createdAt: daysAgo(7),
    actionType: 'systemAlert',
  },
  {
    id: 'notif_016',
    title: 'Reminder: Complete your Weekly Revision Plan',
    description:
      'Your weekly revision plan has 3 pending topics: Thermodynamics, Chemical Bonding, and Cell Biology.',
    type: 'reminder',
    isRead: true,
    createdAt: daysAgo(2),
    actionType: 'deepLink',
    deepLink: 'mockprep://revision',
  },
  {
    id: 'notif_017',
    title: 'App Update v2.5.0 Available',
    description:
      'Update to the latest version for a smoother experience, bug fixes, and new features.',
    type: 'system',
    isRead: true,
    createdAt: daysAgo(10),
    actionType: 'systemAlert',
  },
  {
    id: 'notif_018',
    title: 'Recommended Course: Mathematics for JEE Advanced',
    description:
      'Based on your performance, we recommend \'Advanced Calculus & Algebra\' to boost your JEE Advanced score.',
    type: 'course',
    isRead: true,
    createdAt: daysAgo(6),
    actionType: 'courseDetails',
    actionId: 'course_maths_adv',
  },
];

// ═════════════════════════════════════════════════════════════════
//  Convenience Exports
// ═════════════════════════════════════════════════════════════════

/** Total number of mock notifications available. */
export const MOCK_NOTIFICATION_COUNT = MOCK_NOTIFICATIONS.length;

/** Count of unread notifications in the mock set. */
export const MOCK_UNREAD_COUNT = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;
