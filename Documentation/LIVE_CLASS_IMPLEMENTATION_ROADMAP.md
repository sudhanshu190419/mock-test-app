# Live Class Module — Implementation Roadmap

> **Version:** 1.0  
> **Date:** July 19, 2026  
> **Author:** Engineering Management  
> **Status:** Draft — Ready for Sprint Planning  
> **Audience:** Engineering Team, QA, Project Management

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Overall Timeline & Milestones](#2-overall-timeline--milestones)
3. [Sprint Breakdown](#3-sprint-breakdown)
4. [Phase Dependency Graph](#4-phase-dependency-graph)
5. [Phase 0 — Foundation & Environment Verification](#5-phase-0--foundation--environment-verification)
6. [Phase 1 — Teacher LiveKit Integration](#6-phase-1--teacher-livekit-integration)
7. [Phase 2 — Student Joins Scheduled Classes](#7-phase-2--student-joins-scheduled-classes)
8. [Phase 3 — Attendance Tracking](#8-phase-3--attendance-tracking)
9. [Phase 4 — Notifications](#9-phase-4--notifications)
10. [Phase 5 — Recording & Playback](#10-phase-5--recording--playback)
11. [Phase 6 — Chat, Raise Hand & Teacher Controls](#11-phase-6--chat-raise-hand--teacher-controls)
12. [Phase 7 — Admin Monitoring & Reports](#12-phase-7--admin-monitoring--reports)
13. [Phase 8 — Production Hardening](#13-phase-8--production-hardening)
14. [Deployment Strategy](#14-deployment-strategy)
15. [Rollback Strategy](#15-rollback-strategy)
16. [Testing Checkpoints & Go/No-Go Criteria](#16-testing-checkpoints--go-no-go-criteria)
17. [Production Readiness Checklist](#17-production-readiness-checklist)
18. [Risk Register](#18-risk-register)
19. [Resource Estimation](#19-resource-estimation)

---

## 1. Executive Summary

This document provides the **complete execution plan** for implementing the Live Class module across the Teacher Website (Next.js), Student Mobile App (React Native), and Supabase backend. It is derived from the Live Class Software Design Document (SDD) and the Architecture Analysis.

**The plan is organized into 9 phases across approximately 16 weeks.** Each phase is independently testable, has clear deliverables, defined test cases, a rollback plan, and Go/No-Go criteria. The phases are ordered to minimize risk: backend infrastructure first, then teacher publishing, then student joining, then value-added features.

**Critical Design Decision:** The Video Provider Abstraction Layer (`lib/video/`) must be implemented in Phase 1 *before* any UI components depend on a specific provider. This prevents vendor lock-in from day one.

**Key Risks:**
- LiveKit Egress (recording) configuration is complex and may require LiveKit support
- Mobile audio routing (Android) has historically been problematic
- Push notification delivery timing (FCM/APNS) varies by device manufacturer

---

## 2. Overall Timeline & Milestones

```
Week 1  |████ Phase 0 ████|  Foundation & env verification
Week 2  |████████████████|  (buffer/testing)
Week 3  |████ Phase 1 ████|  Teacher LiveKit Integration
Week 4  |████████████████|  Continue + Testing
Week 5  |████ Phase 2 ████|  Student Joins Classes
Week 6  |████████████████|  Testing & Fixes
Week 7  |████ Phase 3 ████|  Attendance
Week 8  |████ Phase 4 ████|  Notifications
Week 9  |████ Phase 5 ████|  Recording
Week 10 |████████████████|  Testing & Fixes
Week 11 |████ Phase 6 ████|  Chat, Raise Hand, Controls
Week 12 |████████████████|  Testing & Fixes
Week 13 |████ Phase 7 ████|  Admin Monitoring
Week 14 |████████████████|  Testing & Integration
Week 15 |████ Phase 8 ████|  Production Hardening
Week 16 |████ Go Live! ████|  Launch
```

**Milestones:**

| Milestone | Phase | Week | Criteria |
|-----------|-------|:----:|----------|
| M0: Foundation Complete | Phase 0 | Week 1 | All RLS policies written & tested, Edge Functions deployed, `room_name` migration run, LiveKit connectivity verified |
| M1: Teacher Can Go Live | Phase 1 | Week 4 | Teacher can start a class, publish video/audio via LiveKit, end the class. DB records updated correctly. |
| M2: Student Can Join | Phase 2 | Week 6 | Student can discover scheduled classes, join via waiting room or directly, see teacher's video, leave. |
| M3: Attendance Works | Phase 3 | Week 8 | Join/leave events logged, attendance computed on class end, teacher can view report. |
| M4: Notifications Flowing | Phase 4 | Week 9 | Class reminders, started, cancelled, recording-available notifications delivered correctly. |
| M5: Recording Available | Phase 5 | Week 10 | Classes recorded automatically, webhook processes completion, students can view recordings. |
| M6: Interactive Features | Phase 6 | Week 12 | Chat, raise hand, screen sharing all functional. |
| M7: Admin Can Monitor | Phase 7 | Week 14 | Admin dashboard shows live sessions, attendance reports, recording management. |
| M8: Production Ready | Phase 8 | Week 16 | Load tested, security audited, monitoring configured, runbook written. |

---

## 3. Sprint Breakdown

Assuming 2-week sprints with 2 teams (Backend + Web, Mobile):

| Sprint | Weeks | Phase(s) | Backend Team | Web Team (Teacher) | Mobile Team (Student) |
|--------|:-----:|:--------:|-------------|-------------------|----------------------|
| Sprint 1 | 1-2 | Phase 0, 1 start | RLS, Edge Functions, `room_name` migration | `lib/video/types.ts`, `LiveKitProvider.ts` | Refactor `useLiveKit` → `useVideoProvider` |
| Sprint 2 | 3-4 | Phase 1 | Live class service refactoring | Live Studio replacement, ControlBar, Go Live flow | Video Provider abstraction (mobile) |
| Sprint 3 | 5-6 | Phase 2, 3 start | Attendance computation RPC | Post-class summary view | `LiveClassListScreen`, `WaitingRoomScreen`, `LiveClassScreen` |
| Sprint 4 | 7-8 | Phase 3, 4 | `livekit-webhook` Edge Function | Attendance report UI | Attendance event logging, join/leave |
| Sprint 5 | 9-10 | Phase 5 | Egress integration, webhook pipeline | Recording status UI | Recording playback UI |
| Sprint 6 | 11-12 | Phase 6 | Chat/store service (if persisted) | ChatPanel, RaiseHandQueue, Screen share | Chat, Raise Hand, ControlBar |
| Sprint 7 | 13-14 | Phase 7, 8 start | Admin analytics queries | Admin monitoring views | — (mobile polish) |
| Sprint 8 | 15-16 | Phase 8 | Load testing, security audit | Production hardening | Production hardening |

---

## 4. Phase Dependency Graph

```
Phase 0 (Foundation)
  │
  ├──▶ Phase 1 (Teacher LiveKit)
  │       │
  │       ├──▶ Phase 2 (Student Joins)
  │       │       │
  │       │       ├──▶ Phase 3 (Attendance) ──▶ Phase 4 (Notifications)
  │       │       │                                   │
  │       │       └──▶ Phase 5 (Recording) ───────────┘
  │       │               │
  │       │               └──▶ Phase 7 (Admin) ──▶ Phase 8 (Hardening)
  │       │
  │       └──▶ Phase 6 (Chat/Raise Hand/Screen Share)
  │
  └──────────────────────────────────────────────────────▶ Phase 8 (Hardening)
```

**Parallelizable Work:**
- Phase 6 (Chat/Raise Hand) can be built in parallel with Phase 4 (Notifications) once Phase 1 & 2 are stable
- Phase 7 (Admin) can start once Phase 2 & 3 are stable
- Phase 8 (Hardening) runs across all phases incrementally

---

## 5. Phase 0 — Foundation & Environment Verification

### 5.1 Objective

Verify that the existing infrastructure is correct, secure, and ready for live class development. Lay the database and edge function groundwork that every subsequent phase depends on.

### 5.2 Scope

- **Database:** Add `room_name` column to `live_classes`, add `profile_id` to `session_participants`
- **Security:** Write RLS policies for all live_* tables
- **Backend:** Verify `livekit-token` Edge Function works correctly
- **Infrastructure:** Verify LiveKit Cloud/self-hosted configuration, API keys, webhook endpoints
- **Environment:** Verify Supabase project settings, Realtime enabled for live tables, env vars configured

### 5.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Supabase** | `supabase/migrations/` — New migration for `room_name` + `profile_id` + RLS policies |
| **Supabase** | `supabase/functions/livekit-token/index.ts` — Verify and update if needed |
| **Supabase** | `supabase/config.toml` — Enable Realtime for live_* tables |
| **Teacher Website** | `.env.local` — Add LiveKit env vars if missing |
| **Student App** | `.env` — Verify LiveKit env vars |

### 5.4 Dependencies

- Supabase project with migrations 001-052 already applied
- LiveKit Cloud account configured (or self-hosted server)
- LiveKit API Key + API Secret available
- Teacher website deployable (Next.js)
- Student app builds (React Native)

### 5.5 Deliverables

1. ✅ SQL migration file adding `room_name VARCHAR(64)` to `live_classes`
2. ✅ SQL migration file adding `profile_id UUID` (nullable) to `session_participants`
3. ✅ SQL migration file with RLS policies for: `live_classes`, `live_sessions`, `live_class_batch`, `session_participants`, `attendance`, `attendance_events`, `recordings`
4. ✅ `livekit-token` Edge Function verified working with teacher and student roles
5. ✅ LiveKit webhook endpoint URL configured in LiveKit dashboard
6. ✅ Supabase Realtime enabled for `live_classes` and `live_sessions` tables
7. ✅ Environment variable checklist signed off

### 5.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH0-HP-01 | RLS: Teacher can insert live class | Insert `live_classes` with own `teacher_id` | Row inserted successfully |
| PH0-HP-02 | RLS: Teacher can read own classes | SELECT on `live_classes` WHERE teacher_id = own | Returns own rows only |
| PH0-HP-03 | RLS: Student can read only batch-linked classes | SELECT on `live_classes` via batch membership | Returns only classes for student's batches |
| PH0-HP-04 | RLS: Admin can read all classes | SELECT on `live_classes` as admin | Returns all rows |
| PH0-HP-05 | `livekit-token`: Teacher token generation | Invoke Edge Function with role=teacher | Returns valid JWT + LiveKit URL |
| PH0-HP-06 | `livekit-token`: Student token generation | Invoke Edge Function with role=student | Returns valid JWT with subscribe-only permissions |
| PH0-HP-07 | `room_name` column write | INSERT live_classes with `room_name` | Column stores value, unique constraint enforced |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH0-NG-01 | RLS: Student cannot insert live_class | INSERT blocked by RLS |
| PH0-NG-02 | RLS: Teacher cannot access other teacher's class | SELECT returns empty |
| PH0-NG-03 | RLS: Student cannot read `live_sessions.host_token` | Column is masked/empty due to RLS |
| PH0-NG-04 | `livekit-token`: Unauthenticated user | Edge Function throws "Unauthorized" |
| PH0-NG-05 | `livekit-token`: Invalid role | Edge Function returns validation error |
| PH0-NG-06 | Realtime: Unauthorized channel subscription | Supabase rejects subscription |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH0-EC-01 | `room_name` collision | UNIQUE constraint prevents duplicate |
| PH0-EC-02 | `room_name` > 64 characters | Constraint/VARCHAR truncation or error |
| PH0-EC-03 | RLS: Teacher with multiple institutes | `get_my_institute_id()` correctly filters |

### 5.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| RLS policies too restrictive, blocking legitimate access | Medium | High | Write test cases for every role before deploying |
| Realtime not enabled for live tables | Low | High | Verify in Supabase dashboard before Phase 1 start |
| `livekit-token` Edge Function returns invalid token | Low | High | Test token validation with LiveKit Room.connect() |
| Migration conflicts with existing data | Low | Medium | Run migration in dry-run mode first |

### 5.8 Rollback Plan

1. **Rollback RLS:** `DROP POLICY IF EXISTS ...` for each policy — documented rollback SQL prepared before deployment
2. **Rollback `room_name`:** `ALTER TABLE live_classes DROP COLUMN room_name CASCADE;`
3. **Rollback `profile_id`:** `ALTER TABLE session_participants DROP COLUMN profile_id CASCADE;`
4. **Restore Edge Function:** Re-deploy previous version via `supabase functions deploy livekit-token --legacy`

If RLS issues are detected, rollback within 1 hour. Full rollback time: ~30 minutes.

### 5.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | Low-Medium |
| Testing Effort | 3 days |
| Risk Level | Low |
| Priority | Critical (blocking) |
| Dependencies | Supabase access, LiveKit access |
| Expected Duration | 5-7 days |

---

## 6. Phase 1 — Teacher LiveKit Integration

### 6.1 Objective

Replace the simulated live studio modal with a real LiveKit-connected broadcasting experience. Teacher can preview camera/mic, go live, publish video/audio to LiveKit, and end the class. All DB lifecycle methods (start/end class) are properly wired.

### 6.2 Scope

- Create `lib/video/types.ts` (VideoProvider interface) on both projects
- Implement `LiveKitProvider.ts` on teacher website (implements VideoProvider)
- Create `useVideoClass` hook on teacher website
- Replace Live Studio modal with LiveKit-connected studio
- Build ControlBar (cam/mic/screen share/end class)
- Integrate "Start Class" from today's schedule
- Wire Go Live → DB update + LiveKit connection
- Wire End Class → LiveKit disconnect + DB update

### 6.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Teacher Website** | `src/lib/video/types.ts` — NEW |
| **Teacher Website** | `src/lib/video/LiveKitProvider.ts` — NEW |
| **Teacher Website** | `src/lib/video/index.ts` — NEW |
| **Teacher Website** | `src/services/liveClassService.ts` — NEW (extract from teacherService) |
| **Teacher Website** | `src/hooks/useVideoClass.ts` — NEW |
| **Teacher Website** | `src/components/live-studio/LiveStudioView.tsx` — NEW |
| **Teacher Website** | `src/components/live-studio/ControlBar.tsx` — NEW |
| **Teacher Website** | `src/components/live-studio/VideoStage.tsx` — NEW |
| **Teacher Website** | `src/components/dashboard/FacultyDashboard.tsx` — MODIFY (remove old modal) |
| **Teacher Website** | `src/views/OverviewView.tsx` — MODIFY (wire Start Class flow) |
| **Teacher Website** | `src/views/ScheduleView.tsx` — MODIFY (wire Start Class flow) |
| **Teacher Website** | `package.json` — ADD `livekit-client` dependency |
| **Student App** | `src/lib/video/types.ts` — NEW (mirror web interface) |
| **Student App** | `src/lib/video/LiveKitProvider.ts` — NEW (RN implementation) |
| **Student App** | `src/hooks/useLiveKit.ts` — MODIFY (refactor behind interface) |

### 6.4 Dependencies

- Phase 0 complete (RLS, Edge Functions, room_name)
- LiveKit server URL configured
- Teacher has at least one scheduled class in DB

### 6.5 Deliverables

1. ✅ `VideoProvider` interface defined in shared `lib/video/types.ts` (identical interface on both platforms)
2. ✅ `LiveKitProvider` (web) — implements `connect()`, `disconnect()`, `toggleCamera()`, `toggleMicrophone()`, `startScreenShare()`, `stopScreenShare()`
3. ✅ `useVideoClass` hook — wraps LiveKitProvider, exposes reactive state (connectionState, participants, isCameraEnabled, isMicrophoneEnabled)
4. ✅ Live Studio view — camera preview, class info, Go Live button, recording indicator
5. ✅ ControlBar — camera toggle, mic toggle, end class button (screen share ready but hidden in this phase)
6. ✅ "Start Class" flow — clicks Go Live → validates → creates session → connects to LiveKit → updates DB → shows live UI
7. ✅ "End Class" flow — clicks End → confirms → disconnects → updates DB → shows post-class summary (basic)

### 6.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH1-HP-01 | Teacher opens Live Studio | Click "Start Class" on a scheduled class | Camera preview shows, mic meter works, class info displayed |
| PH1-HP-02 | Teacher goes live | Click "Go Live" button | LiveKit connects, DB updated, students notified (stub) |
| PH1-HP-03 | Teacher toggles camera | Click camera button | Camera feed turns off/on, icon updates |
| PH1-HP-04 | Teacher toggles microphone | Click mic button | Mic muted/unmuted, icon updates |
| PH1-HP-05 | Teacher ends class normally | Click "End Class", confirm | LiveKit disconnects, DB updated, navigates to summary |
| PH1-HP-06 | Timer shows correctly | Start class, wait | Elapsed time increments, scheduled duration shown |
| PH1-HP-07 | Recording indicator | (if is_recorded) | Red dot + elapsed time shown during live |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH1-NG-01 | Camera permission denied | Warning shown, class can start without video |
| PH1-NG-02 | Microphone permission denied | Warning shown, class can start without audio |
| PH1-NG-03 | Click "Go Live" with no camera/mic | Class starts, persistent "no device" indicator shown |
| PH1-NG-04 | LiveKit connection fails | Error message, retry option, class not marked as live |
| PH1-NG-05 | Token generation fails | Error message, class not started |
| PH1-NG-06 | Click "End Class" while disconnected | DB-only update, no LiveKit error |
| PH1-NG-07 | Try to start class that is already live | Error: "Class already in progress" |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH1-EC-01 | Teacher refreshes browser during live class | LiveKit reconnects (if within 5 min grace) |
| PH1-EC-02 | Class duration exceeds scheduled time | Warning shown at duration_min, auto-end at +30 min |
| PH1-EC-03 | Teacher opens studio but never clicks "Go Live" | Studio can be closed, class remains scheduled |

#### Reconnection
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH1-RC-01 | Teacher loses internet during broadcast | LiveKit auto-reconnects, "Reconnecting..." shown |
| PH1-RC-02 | Teacher doesn't reconnect within 5 min | Session auto-ends, students notified |

### 6.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Browser WebRTC incompatibility (Safari, Firefox) | Medium | High | Test on Chrome, Edge, Safari, Firefox before sign-off |
| LiveKit `room.connect()` hangs on certain networks | Low | High | 30-second timeout implemented in hook |
| `livekit-client` bundle size impact on teacher website | Low | Medium | Verify bundle analysis, code-split if needed |
| Desktop audio routing issues (HDMI, Bluetooth) | Medium | Low | System-level, not app-controlled |

### 6.8 Rollback Plan

1. **Feature flag:** Keep the old Live Studio modal behind a feature flag (`showOldStudio: true`) in case the new studio has critical issues
2. **Revert UI:** Restore `FacultyDashboard.tsx` from backup
3. **Revert packages:** `npm uninstall livekit-client @livekit/components-react` 
4. **Revert services:** Restore `teacherService.ts` to pre-Phase 1 state (old modal used it directly)

Full rollback time: ~2 hours. Feature flag toggle: immediate.

### 6.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | High |
| Testing Effort | 5 days |
| Risk Level | Medium |
| Priority | Critical |
| Dependencies | Phase 0 |
| Expected Duration | 12-14 days |

---

## 7. Phase 2 — Student Joins Scheduled Classes

### 7.1 Objective

Students can discover their scheduled live classes, enter a waiting room before the teacher joins, and participate in the live class with teacher's video/audio streaming. This replaces the POC `JoinRoomScreen` + `LiveRoomScreen` with production screens integrated with the class system.

### 7.2 Scope

- Create `LiveClassListScreen` — shows today's classes from timetable/batch membership
- Create `WaitingRoomScreen` — pre-class info, "Waiting for teacher" state
- Create production `LiveClassScreen` — teacher video, student controls (mic/cam disabled by default, leave button)
- Implement join validation (BR-010: join window, BR-012: late join, BR-014: max participants)
- Wire LiveKit connection with student role (subscribe-only)
- Create `useVideoProvider` hook (abstracted from useLiveKit)
- Remove POC `JoinRoomScreen` and `LiveRoomScreen`

### 7.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Student App** | `src/lib/video/index.ts` — NEW (barrel exports) |
| **Student App** | `src/lib/video/types.ts` — NEW (mirror web) |
| **Student App** | `src/lib/video/LiveKitProvider.ts` — NEW (RN impl) |
| **Student App** | `src/hooks/useVideoProvider.ts` — NEW (abstracted hook) |
| **Student App** | `src/screens/live/LiveClassListScreen.tsx` — NEW |
| **Student App** | `src/screens/live/WaitingRoomScreen.tsx` — NEW |
| **Student App** | `src/screens/live/LiveClassScreen.tsx` — NEW |
| **Student App** | `src/screens/live/index.ts` — NEW |
| **Student App** | `src/components/live/VideoGrid.tsx` — NEW |
| **Student App** | `src/components/live/ControlBar.tsx` — NEW (production) |
| **Student App** | `src/components/live/AttendanceBadge.tsx` — NEW |
| **Student App** | `src/features/livekit/` — DELETE (or archive) |
| **Student App** | `src/navigation/AppNavigator.tsx` — MODIFY (replace LiveKit stack) |
| **Student App** | `src/services/liveClassService.ts` — NEW |
| **Student App** | `src/hooks/useLiveClasses.ts` — MODIFY (real DB query) |
| **Teacher Website** | (no changes — already done in Phase 1) |

### 7.4 Dependencies

- Phase 1 complete (teacher can broadcast)
- Phase 0 complete (RLS allows student access)
- At least one scheduled class with batch → student mapping in DB

### 7.5 Deliverables

1. ✅ `LiveClassListScreen` — Today's classes with time, teacher name, status, "Join" button
2. ✅ `WaitingRoomScreen` — Class info, waiting state, auto-transition when teacher goes live
3. ✅ `LiveClassScreen` — Teacher video (primary), student controls, network indicator
4. ✅ `ControlBar` (student) — Raise Hand, Chat (stub), Leave Class
5. ✅ Join validation — checks window, late join, max participants before allowing in
6. ✅ LiveKit connection as subscriber (student role)
7. ✅ Remove POC screens — no user-visible POC artifacts
8. ✅ Deep link support — push notification tap opens correct class

### 7.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH2-HP-01 | View today's classes | Open student app, navigate to Live tab | List of today's classes with status |
| PH2-HP-02 | Join class in waiting room | Tap "Join" 15 min before class | Waiting room shown, "Waiting for teacher" |
| PH2-HP-03 | Auto-enter live class | Teacher goes live while student is waiting | Transition from waiting room to live class |
| PH2-HP-04 | Join live class directly | Tap "Join" after teacher started | Directly enter live class (skip waiting room) |
| PH2-HP-05 | View teacher video | In live class | Teacher's video visible, audio playing |
| PH2-HP-06 | Leave class | Tap "Leave" | Disconnected, return to dashboard |
| PH2-HP-07 | Rejoin after leaving | Tap "Join" again | Reconnected (new session_participants event) |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH2-NG-01 | Join before 15-min window | Button disabled, "Starts at [time]" shown |
| PH2-NG-02 | Join after late-join window | Error: "Class has already started, late join window closed" |
| PH2-NG-03 | Join with max participants reached | Error: "Class is full" |
| PH2-NG-04 | Not enrolled in batch | Class not visible in list |
| PH2-NG-05 | LiveKit token fetch fails | Error message, retry option |
| PH2-NG-06 | Class has already ended | Class shows as "Completed" with recording link |
| PH2-NG-07 | Join while class is cancelled | Class not visible or shows "Cancelled" badge |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH2-EC-01 | Join class that starts in 15 min exactly | Button becomes enabled, join allowed |
| PH2-EC-02 | Join at exactly class end time | Join blocked (late window) |
| PH2-EC-03 | Teacher starts class early | Students can join immediately |
| PH2-EC-04 | Multiple students join simultaneously | All connect successfully (if under limit) |

#### Reconnection
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH2-RC-01 | Student loses internet | "Reconnecting..." overlay, auto-reconnect |
| PH2-RC-02 | Student reconnects within 60 sec | Video resumes, no data loss |
| PH2-RC-03 | Student doesn't reconnect within 60 sec | "Connection Lost" screen with Retry/Leave options |
| PH2-RC-04 | Student reconnects after phone was locked | Session resumed correctly |

### 7.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| React Native video rendering performance | Medium | High | Test on low-end Android devices, use adaptiveStream |
| Audio routing (speaker vs earpiece) on mobile | High | Medium | Phase 1 already configured speaker-first; test on 10+ devices |
| Waiting Room → Live Class transition timing | Medium | Medium | Use Realtime subscription for immediate transition |
| iOS app background → disconnect | Medium | Medium | Handle gracefully, prompt rejoin on foreground |

### 7.8 Rollback Plan

1. **Feature flag:** Keep old POC screens accessible via dev menu
2. **Revert navigation:** Restore `AppNavigator.tsx` backup
3. **Revert screens:** Restore old LiveKit POC screens
4. **Keep DB changes:** They're needed by Phase 1 and are backward compatible

Full rollback time: ~2 hours. Feature flag toggle: immediate.

### 7.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | High |
| Testing Effort | 6 days |
| Risk Level | Medium |
| Priority | Critical |
| Dependencies | Phase 1 |
| Expected Duration | 14-16 days |

---

## 8. Phase 3 — Attendance Tracking

### 8.1 Objective

Track student join/leave events during a live class and compute attendance summaries when the class ends. Both teacher and student can view attendance reports.

### 8.2 Scope

- Create attendance computation RPC (Postgres function) or Edge Function
- Log `session_participants` events on student join/leave (including reconnects)
- Compute attendance on class end (auto or manual)
- Create attendance report UI on teacher website
- Create attendance summary UI on student app (post-class)
- Support manual override (teacher can mark absent student as present)

### 8.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Supabase** | `supabase/functions/compute-attendance/index.ts` — NEW |
| **Teacher Website** | `src/services/attendanceService.ts` — NEW |
| **Teacher Website** | `src/components/live-studio/AttendancePanel.tsx` — NEW |
| **Teacher Website** | `src/views/teacher/AttendanceReportView.tsx` — NEW |
| **Student App** | `src/services/attendanceService.ts` — NEW |
| **Student App** | `src/components/live/AttendanceIndicator.tsx` — NEW |
| **Student App** | `src/screens/live/LiveClassScreen.tsx` — MODIFY (add event logging) |

### 8.4 Dependencies

- Phase 2 complete (students can join/leave)
- Phase 0 complete (`session_participants` table available)
- `live_sessions` properly records start/end times

### 8.5 Deliverables

1. ✅ `compute-attendance` Edge Function — aggregates session_participants events, computes present/late/absent per student
2. ✅ Student join event logged on LiveKit connection (`INSERT INTO session_participants`)
3. ✅ Student leave event logged on disconnection (`UPDATE session_participants SET left_at`)
4. ✅ Reconnect events logged as new rows (multiple intervals per student)
5. ✅ Attendance computation triggered automatically when teacher ends class
6. ✅ Teacher attendance report — table with student name, status, join time, leave time, duration
7. ✅ Student attendance summary — "You attended 42 of 48 minutes", Present/Late/Absent status
8. ✅ Manual override — teacher can change a student's attendance status

### 8.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH3-HP-01 | Single student join/leave | Student joins, stays entire class, teacher ends | Status = Present, duration = class duration |
| PH3-HP-02 | Multiple students join at different times | Student A joins at start, B joins at 20 min | A = Present, B = Late (if >10 min threshold) |
| PH3-HP-03 | Student leaves early | Student leaves at 30 min of 60 min class | Duration = 30 min, Status = Late (<70%) |
| PH3-HP-04 | Teacher views attendance | End class, view post-class summary | All students listed with correct statuses |
| PH3-HP-05 | Student views own attendance | End class, student sees overlay | "You attended X of Y minutes", correct status |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH3-NG-01 | Student never joins | Status = Absent |
| PH3-NG-02 | Attendance computation while class is still live | Partial data returned, "Attendance in progress" message |
| PH3-NG-03 | Edge Function fails | Retry mechanism, manual trigger option |
| PH3-NG-04 | No session_participants events for any student | All enrolled = Absent |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH3-EC-01 | Student joins before teacher | Events logged but timer starts at session start |
| PH3-EC-02 | Student reconnects 10 times | All intervals summed, correct total duration |
| PH3-EC-03 | Teacher ends class early (30 min instead of 60) | Attendance prorated against actual 30 min |
| PH3-EC-04 | Student connected > class duration | Impossible, bounded by session start/end |
| PH3-EC-05 | Manual override applied | `is_manual_override = true`, override_by and reason populated |

### 8.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| High write volume to `session_participants` during large classes | Medium | Medium | Batch writes, connection pooling; test with 200 concurrent students |
| Attendance computation takes too long for large classes | Low | Medium | Optimize RPC, consider async queue |
| Student leaves without proper `left_at` event (app crash) | Medium | Medium | Use `left_at IS NULL` as proxy for "still connected", compute at end |

### 8.8 Rollback Plan

1. **Rollback Edge Function:** Re-deploy previous version
2. **Rollback attendance UI:** Remove attendance panels from post-class views
3. **No data loss:** `session_participants` data persists, can be recomputed later

Rollback time: ~1 hour.

### 8.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | Medium |
| Testing Effort | 4 days |
| Risk Level | Medium |
| Priority | High |
| Dependencies | Phase 2 |
| Expected Duration | 8-10 days |

---

## 9. Phase 4 — Notifications

### 9.1 Objective

Students receive timely push notifications for live class events: reminders before class, notification when teacher starts, cancellation notices, and recording availability.

### 9.2 Scope

- Implement push notification sender (Edge Function or service)
- Send 15-min and 5-min class reminders
- Send "Class Started" notification when teacher goes live
- Send "Class Cancelled" when class is cancelled
- Send "Recording Available" when recording is processed
- Implement notification suppression rules (don't notify if already joined)
- Test on both Android (FCM) and iOS (APNS)

### 9.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Supabase** | `supabase/functions/send-live-notification/index.ts` — NEW |
| **Supabase** | `supabase/functions/class-reminder-cron/index.ts` — NEW (scheduled function) |
| **Supabase** | `supabase/config.toml` — ADD scheduled function config |
| **Teacher Website** | `src/services/liveClassService.ts` — MODIFY (trigger notification on start/cancel) |
| **Student App** | `src/services/notificationService.ts` — MODIFY (handle new notification types) |
| **Student App** | `src/hooks/useNotifications.ts` — MODIFY (subscribe to live notification types) |
| **Student App** | `src/services/fcm/fcmService.ts` — VERIFY (foreground handling) |

### 9.4 Dependencies

- Phase 0 complete (`user_device_tokens` table from migration 048)
- Phase 1 complete (teacher can start/end classes — triggers for notifications)
- FCM/APNS credentials configured in Supabase or push service
- `user_device_tokens` has entries for test users

### 9.5 Deliverables

1. ✅ Push notification Edge Function — accepts `{ user_id, title, body, data }`, delivers via FCM/APNS
2. ✅ 15-min reminder — scheduled job checks upcoming classes, sends notification
3. ✅ 5-min reminder — scheduled job sends second reminder
4. ✅ "Class Started" — triggered when teacher clicks Go Live
5. ✅ "Class Cancelled" — triggered when class is cancelled
6. ✅ "Recording Available" — triggered when recording processing completes
7. ✅ Notification suppression — if student is in the class, skip push for that class
8. ✅ Deep link handling — tap notification opens correct class screen

### 9.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH4-HP-01 | 15-min reminder received | Schedule class 15 min in future | Notification received "Class starting in 15 min" |
| PH4-HP-02 | 5-min reminder received | Wait 10 min from previous test | Second notification received |
| PH4-HP-03 | "Class Started" notification | Teacher starts class | Notification received "Teacher has started class" |
| PH4-HP-04 | Deep link from notification | Tap "Class Started" notification | Opens correct class waiting room/live screen |
| PH4-HP-05 | "Recording Available" notification | Recording processing completes | Notification received |
| PH4-HP-06 | "Class Cancelled" notification | Teacher cancels class | Notification received |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH4-NG-01 | Student already in class | No push notification for that class |
| PH4-NG-02 | Class already ended | "Class Started" not sent |
| PH4-NG-03 | No device token | Notification silently skipped |
| PH4-NG-04 | FCM/APNS service down | Retry with backoff, log error |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH4-EC-01 | Multiple classes at same time | Both reminders sent |
| PH4-EC-02 | Student in different timezone | Reminder based on server time (class's scheduled_at) |
| PH4-EC-03 | Notification arrives while phone is locked | Shows on lock screen, opens app on tap |
| PH4-EC-04 | Student has no internet | Notification queued by FCM/APNS, delivered when online |

### 9.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| FCM delivery delays on Xiaomi/Oppo/Realme devices | High | Medium | Test on top 5 Chinese OEM devices; documented limitation |
| APNS sandbox vs production confusion | Medium | High | Use separate push configs for dev/prod |
| Scheduled function timing drift | Low | Medium | Use cron-within-cron tolerance (run every 1 min) |
| Notification spam (too many reminders) | Low | Medium | Suppression rules already defined |

### 9.8 Rollback Plan

1. **Disable scheduled function:** `supabase functions delete class-reminder-cron`
2. **Remove notification triggers:** Comment out notification calls in `liveClassService.ts`
3. **Revert notification types:** Remove new notification type registrations from student app

Rollback time: ~1 hour.

### 9.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | Medium |
| Testing Effort | 5 days |
| Risk Level | Medium |
| Priority | High |
| Dependencies | Phase 1, user_device_tokens |
| Expected Duration | 8-10 days |

---

## 10. Phase 5 — Recording & Playback

### 10.1 Objective

Automatically record live classes when the teacher goes live (if `is_recorded = true`). Process recordings via LiveKit Egress and webhooks, then make them available for student playback.

### 10.2 Scope

- Configure LiveKit Egress for recording (track composite or web container)
- Create `livekit-webhook` Edge Function to handle Egress events
- Update `recordings` table with processing status
- Create recording playback UI for students
- Create recording management UI for teacher
- Implement retention policy (30-day auto-delete)

### 10.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Supabase** | `supabase/functions/livekit-webhook/index.ts` — NEW |
| **Teacher Website** | `src/services/recordingService.ts` — NEW |
| **Teacher Website** | `src/components/live-studio/RecordingIndicator.tsx` — MODIFY |
| **Teacher Website** | `src/views/teacher/RecordingListView.tsx` — NEW |
| **Student App** | `src/services/recordingService.ts` — NEW |
| **Student App** | `src/screens/live/RecordingPlaybackScreen.tsx` — NEW |
| **Student App** | `src/screens/live/LiveClassScreen.tsx` — MODIFY (show recording indicator) |

### 10.4 Dependencies

- Phase 1 complete (teacher can go live — triggers recording start)
- LiveKit Egress feature enabled on account
- LiveKit webhook endpoint configured in LiveKit dashboard
- Storage bucket for recording files configured

### 10.5 Deliverables

1. ✅ LiveKit Egress configured — starts automatically when teacher goes live (if `is_recorded = true`)
2. ✅ `livekit-webhook` Edge Function — handles `egress.start`, `egress.complete`, `egress.failed`
3. ✅ `recordings` table properly populated — recording_id, egress_id, status, file_url, duration
4. ✅ Recording indicator shown on teacher's Live Studio during recording
5. ✅ Teacher can view recording list with status (processing/available/failed)
6. ✅ Student can view recording after class (from post-class overlay or dashboard)
7. ✅ "Recording Available" notification sent (trigger Phase 4)
8. ✅ 30-day retention enforced (cleanup cron job)

### 10.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH5-HP-01 | Recording starts automatically | Start class with `is_recorded = true` | Egress starts, recording indicator visible |
| PH5-HP-02 | Recording completes normally | End class | Egress completes, webhook received, recordings table updated |
| PH5-HP-03 | Teacher views recording | After processing, open recording list | Recording shown with "Available" status, duration, file size |
| PH5-HP-04 | Student views recording | After processing, tap "View Recording" | Video plays in player |
| PH5-HP-05 | Recording indicator during class | Teacher is live | Red dot + elapsed time shown |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH5-NG-01 | `is_recorded = false` | No recording starts, no indicator shown |
| PH5-NG-02 | Egress fails | Webhook reports failure, `recordings.status = 'failed'` |
| PH5-NG-03 | Webhook not received | Retry mechanism, manual check required |
| PH5-NG-04 | Recording file corrupted | Playback fails gracefully with error message |
| PH5-NG-05 | Unauthorized access to recording file | Storage RLS blocks access |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH5-EC-01 | Teacher reconnects during recording | Recording continues in same file |
| PH5-EC-02 | Very long class (3+ hours) | Egress handles large files (verify with LiveKit) |
| PH5-EC-03 | Recording processed faster than class duration (unlikely) | Status updated immediately |
| PH5-EC-04 | Recording storage quota exceeded | Egress fails, error logged, admin notified |

### 10.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| LiveKit Egress configuration complexity (codec, resolution, storage) | High | High | Follow LiveKit docs exactly, test in staging first |
| Egress costs at scale | Medium | Medium | Configure resolution/fps limits, estimate costs before launch |
| Webhook delivery delay (up to 5x class duration) | Medium | Medium | Communicate clearly "Recording may take up to [time] to process" |
| Storage bucket security misconfiguration | Low | Critical | Use RLS on files, never make bucket public |

### 10.8 Rollback Plan

1. **Disable Egress:** Set `is_recorded = false` on all classes
2. **Remove webhook:** Delete webhook endpoint from LiveKit dashboard
3. **Remove webhook Edge Function:** `supabase functions delete livekit-webhook`
4. **Revert recording UI:** Remove recording panels

Rollback time: ~2 hours.

### 10.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | High |
| Testing Effort | 5 days |
| Risk Level | High |
| Priority | High |
| Dependencies | Phase 1, LiveKit Egress config |
| Expected Duration | 10-12 days |

---

## 11. Phase 6 — Chat, Raise Hand & Teacher Controls

### 11.1 Objective

Enable interactive features during live class: text chat between students and teacher, raise hand workflow, and screen sharing by the teacher.

### 11.2 Scope

- Implement text chat via LiveKit DataChannel (real-time, low-latency)
- Persist chat messages to DB (optional — for post-class review)
- Build ChatPanel UI on teacher website (incoming messages + send)
- Build ChatPanel UI on student app (send messages to teacher)
- Implement Raise Hand (student → teacher via DataChannel)
- Build RaiseHandQueue UI on teacher website (list + approve/deny)
- Implement mic/cam approval flow (teacher approves → student unmuted)
- Implement screen sharing on teacher website
- Build screen share PIP overlay on student app

### 11.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Teacher Website** | `src/components/live-studio/ChatPanel.tsx` — NEW |
| **Teacher Website** | `src/components/live-studio/RaiseHandQueue.tsx` — NEW |
| **Teacher Website** | `src/components/live-studio/StudentControls.tsx` — NEW |
| **Teacher Website** | `src/components/live-studio/ControlBar.tsx` — MODIFY (add screen share) |
| **Teacher Website** | `src/components/live-studio/VideoStage.tsx` — MODIFY (PIP overlay) |
| **Teacher Website** | `src/hooks/useVideoClass.ts` — MODIFY (add DataChannel methods) |
| **Student App** | `src/components/live/ChatPanel.tsx` — NEW |
| **Student App** | `src/components/live/ControlBar.tsx` — MODIFY (add Raise Hand, Chat) |
| **Student App** | `src/screens/live/LiveClassScreen.tsx` — MODIFY (chat UI, raise hand) |
| **Student App** | `src/hooks/useVideoProvider.ts` — MODIFY (add DataChannel methods) |
| **Student App** | `src/lib/video/types.ts` — MODIFY (add DataChannel types) |

### 11.4 Dependencies

- Phase 2 complete (students in live class with video)
- LiveKit DataChannel support (included in `livekit-client`)

### 11.5 Deliverables

1. ✅ Chat Panel (teacher) — shows incoming messages, teacher can type responses
2. ✅ Chat Panel (student) — type messages, send to teacher, see teacher responses
3. ✅ Raise Hand button (student) — sends raise hand event via DataChannel
4. ✅ Raise Hand queue (teacher) — shows students with raised hands, approve/deny
5. ✅ Mic/cam approval — teacher approves → student's mic/cam enabled
6. ✅ Screen sharing (teacher) — click Share Screen, select window/application/screen
7. ✅ Screen share PIP (student) — shared screen as primary, teacher video as PIP
8. ✅ Chat messages persisted to DB (optional — for post-class review)

### 11.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH6-HP-01 | Student sends chat message | Student types message, taps Send | Teacher sees message in ChatPanel |
| PH6-HP-02 | Teacher responds | Teacher types response, taps Send | Student sees teacher's response |
| PH6-HP-03 | Student raises hand | Student taps "Raise Hand" | Teacher sees student in RaiseHandQueue |
| PH6-HP-04 | Teacher approves hand raise | Teacher taps "Allow" | Student's mic enabled, "You're live!" shown |
| PH6-HP-05 | Teacher denies hand raise | Teacher taps "Deny" | Student's hand lowered |
| PH6-HP-06 | Student lowers hand | Student taps "Lower Hand" | Student removed from queue |
| PH6-HP-07 | Teacher shares screen | Teacher clicks "Share Screen" | Students see shared screen as primary video |
| PH6-HP-08 | Teacher stops screen sharing | Teacher clicks "Stop Sharing" | Students see teacher's video again |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH6-NG-01 | Chat message send fails (DataChannel issue) | Message queued locally, retry sent |
| PH6-NG-02 | Raise hand while teacher is not looking | Hand remains in queue until approved or auto-lowered (60s) |
| PH6-NG-03 | Screen sharing permission denied by OS | Error message with instructions |
| PH6-NG-04 | Multiple students raise hand simultaneously | All appear in queue, teacher can approve one at a time |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH6-EC-01 | Student sends 100 messages rapidly | Messages delivered in order, no data loss |
| PH6-EC-02 | Teacher shares screen while student is speaking | Screen takes priority, teacher audio still heard |
| PH6-EC-03 | Student reconnects during screen share | Screen share continues, student sees it on reconnect |
| PH6-EC-04 | Chat history on reconnect | Last N messages re-fetched from DB |

### 11.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| DataChannel reliability on mobile networks | Medium | Medium | Implement message queue + retry, persist to DB as fallback |
| Screen sharing bandwidth impact | Medium | Medium | Recommend 720p or lower for shared screen |
| Multiple simultaneous raised hands management | Low | Low | Simple queue is sufficient for this phase |

### 11.8 Rollback Plan

1. **Disable DataChannel features:** Feature flag for chat/raise-hand/screen-share
2. **Revert UI:** Remove ChatPanel, RaiseHandQueue from live studio
3. **Keep DB changes:** Backward compatible

Rollback time: ~1 hour for feature flag toggle.

### 11.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | High |
| Testing Effort | 5 days |
| Risk Level | Medium |
| Priority | Medium |
| Dependencies | Phase 1, Phase 2 |
| Expected Duration | 12-14 days |

---

## 12. Phase 7 — Admin Monitoring & Reports

### 12.1 Objective

Provide administrators with visibility into live classes: real-time monitoring of active sessions, attendance reports across all classes, recording management, and basic analytics.

### 12.2 Scope

- Build admin live classes list view (with filters)
- Build active session detail view (real-time participant count, teacher status)
- Build attendance reports (per-class, per-student, export CSV)
- Build recording management (list, view, delete recordings)
- Build session logs (audit trail)
- Build basic analytics (classes conducted, attendance rates, peak usage)

### 12.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Teacher Website** | `src/components/admin/AdminLiveClassList.tsx` — NEW |
| **Teacher Website** | `src/components/admin/AdminSessionDetail.tsx` — NEW |
| **Teacher Website** | `src/components/admin/AdminAttendanceReport.tsx` — NEW |
| **Teacher Website** | `src/components/admin/AdminRecordingManager.tsx` — NEW |
| **Teacher Website** | `src/components/admin/AdminLiveAnalytics.tsx` — NEW |
| **Teacher Website** | `src/views/admin/AdminOverviewView.tsx` — MODIFY |
| **Teacher Website** | `src/services/adminService.ts` — MODIFY (add live class queries) |
| **Teacher Website** | `src/services/admin/dashboardService.ts` — MODIFY (add live stats) |

### 12.4 Dependencies

- Phase 3 complete (attendance data available)
- Phase 5 complete (recording data available)
- Admin account with proper RLS permissions

### 12.5 Deliverables

1. ✅ Admin live classes list — table with search, filter by date/status/teacher
2. ✅ Active session detail — real-time participant count, teacher connection status
3. ✅ Attendance reports — per-class summary, per-student across all classes, CSV export
4. ✅ Recording management — list, status, view, delete
5. ✅ Session audit logs — timeline of all events for a session
6. ✅ Analytics dashboard — classes conducted vs scheduled, attendance rate, peak participants

### 12.6 Test Cases

#### Happy Path
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| PH7-HP-01 | View all live classes | Admin opens Live Classes tab | All classes listed with correct statuses |
| PH7-HP-02 | Filter by status | Select "Live" filter | Only currently-live classes shown |
| PH7-HP-03 | View active session details | Click a "Live" class | Real-time participant list, teacher status, engagement metrics |
| PH7-HP-04 | View attendance report | Select completed class | Attendance summary with student details |
| PH7-HP-05 | Export attendance CSV | Click "Export" | CSV file downloaded with correct data |
| PH7-HP-06 | View recording | Click "View" on recording | Recording plays or downloads |
| PH7-HP-07 | View session logs | Open session logs tab | Timeline of events visible |

#### Negative Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH7-NG-01 | No live classes | Empty state shown with helpful message |
| PH7-NG-02 | Filter returns no results | "No classes match your filters" |
| PH7-NG-03 | View session that doesn't exist | 404 or error message |
| PH7-NG-04 | Delete recording without confirmation | Confirmation required before deletion |

#### Edge Cases
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH7-EC-01 | 500+ classes in date range | Pagination works correctly |
| PH7-EC-02 | CSV export with 10,000+ rows | Export completes, file is valid CSV |
| PH7-EC-03 | Session with 0 attendance | Shows all students as absent |

### 12.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Large data sets slow down queries | Medium | Medium | Add pagination, indexing strategy |
| Real-time data stale on admin view | Low | Low | Use polling (every 10s) instead of Realtime |
| RLS misconfiguration exposes data | Low | High | Test with admin/teacher/student accounts |

### 12.8 Rollback Plan

1. **Revert admin views:** Restore previous admin dashboard code
2. **Remove admin live views:** Feature flag admin features
3. **No DB changes:** All queries are read-only

Rollback time: ~1 hour.

### 12.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | Medium |
| Testing Effort | 4 days |
| Risk Level | Low |
| Priority | Medium |
| Dependencies | Phase 3, Phase 5 |
| Expected Duration | 10-12 days |

---

## 13. Phase 8 — Production Hardening

### 13.1 Objective

Prepare the entire Live Class module for production use. Address performance, security, monitoring, and operational readiness. This phase runs incrementally alongside all other phases but culminates in a final hardening sprint.

### 13.2 Scope

- **Performance:** Load testing (100+ concurrent participants), database query optimization, bundle size analysis
- **Security:** Penetration testing of token generation, RLS policy audit, storage bucket security review
- **Monitoring:** Add logging to all Edge Functions, set up Supabase error tracking, configure LiveKit metrics
- **Operational:** Write runbook, define incident response procedures, configure alerts
- **Reliability:** Test all 18 error scenarios from SDD, verify reconnection flows, test under bad network conditions
- **Cleanup:** Remove all console.log diagnostic calls, strip dev-only code from production builds
- **Accessibility:** Audit teacher website for WCAG compliance (especially live studio controls)

### 13.3 Files Likely to Change

| Project | Files |
|---------|-------|
| **Both** | All files — strip debug logs |
| **Both** | `.env.production` — VERIFY production env vars |
| **Teacher Website** | `src/components/live-studio/*` — Accessibility audit |
| **Student App** | `src/features/livekit/diagnostics/*` — REMOVE from production builds |
| **Infrastructure** | Runbook documentation |
| **Infrastructure** | Monitoring dashboards |

### 13.4 Dependencies

- All previous phases functional
- Test accounts for load testing (100+ simulated participants)
- Network throttling tools (Chrome DevTools, Charles Proxy)

### 13.5 Deliverables

1. ✅ Load test report — 100+ concurrent participants, all features functional
2. ✅ Security audit report — no critical or high vulnerabilities
3. ✅ Runbook — step-by-step incident response for all E-XX scenarios (SDD Section 12)
4. ✅ Monitoring configured — Supabase logs, LiveKit metrics, error alerts
5. ✅ Production build — all debug code stripped, optimized bundle
6. ✅ Accessibility report — WCAG 2.1 AA compliance (teacher website)
7. ✅ Rollback scripts — documented and tested for every phase

### 13.6 Test Cases

#### Performance
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH8-PF-01 | 100 students join simultaneously | All connect within 30 seconds, video plays |
| PH8-PF-02 | 50 chat messages per second | No message loss, delivery within 500ms |
| PH8-PF-03 | Teacher website bundle size | LiveKit module does not increase bundle by >200KB |
| PH8-PF-04 | Attendance computation for 200 students | Completes within 5 seconds |

#### Security
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH8-SC-01 | Invalid JWT used to connect to LiveKit | Connection rejected |
| PH8-SC-02 | Student tries to publish video/audio | LiveKit rejects (student role limits) |
| PH8-SC-03 | SQL injection via token request parameters | Edge Function sanitizes input |
| PH8-SC-04 | RLS bypass attempt (direct Supabase API call) | RLS blocks unauthorized access |

#### Reliability
| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| PH8-RL-01 | Network throttled to 3G (500 Kbps) | Video degrades gracefully, audio remains clear |
| PH8-RL-02 | Supabase goes down for 2 minutes | Active class continues, attendance events queued |
| PH8-RL-03 | LiveKit goes down for 2 minutes | Active session paused, reconnection attempted |
| PH8-RL-04 | Phone call interrupts mobile data | Class resumes after call ends |

### 13.7 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Load testing reveals performance bottlenecks | Medium | Medium | Identify and fix before Go Live |
| Security audit finds critical vulnerabilities | Low | Critical | Fix before Go Live — must-have criterion |
| Accessibility issues delay launch | Medium | Medium | Include accessibility testing in every phase, not just Phase 8 |

### 13.8 Rollback Plan

This phase does not introduce new features — rollback means reverting specific hardening changes.
- **Performance fixes:** Rollback individual query optimizations if they cause regressions
- **Security fixes:** Hot-patch — deploy immediately on detection
- **Monitoring/config:** No rollback needed — config changes are additive

### 13.9 Estimates

| Metric | Value |
|--------|-------|
| Development Complexity | Low (testing-heavy) |
| Testing Effort | 10 days |
| Risk Level | Medium |
| Priority | Critical |
| Dependencies | All previous phases |
| Expected Duration | 10-12 days (runs across all phases) |

---

## 14. Deployment Strategy

### 14.1 Environment Strategy

| Environment | Purpose | Config | Data |
|-------------|---------|--------|------|
| **Local** | Development | .env.local | Local Supabase + Mock data |
| **Staging** | Integration testing | Staging Supabase project | Synthetic data (100 students, 5 teachers, 3 batches) |
| **Production** | Live | Production Supabase project | Real data |

### 14.2 Deployment Pipeline

```
Developer Push → GitHub
  │
  ├──→ GitHub Actions: Lint + Type Check
  ├──→ GitHub Actions: Unit Tests (Jest)
  ├──→ GitHub Actions: Build (Next.js + React Native)
  │
  ├──→ Automatic Deploy to Staging:
  │      - Supabase Edge Functions (supabase functions deploy)
  │      - Teacher Website (Vercel preview)
  │      - Student App (TestFlight / Firebase App Distribution)
  │
  └──→ Manual Deploy to Production:
         - Supabase migrations (supabase db push)
         - Edge Functions (supabase functions deploy --project-ref prod)
         - Teacher Website (Vercel production deploy)
         - Student App (App Store / Play Store)
```

### 14.3 Phased Rollout

```
Phase 0-3 complete → Alpha Launch
   Only accessible to internal team + 5 test teachers
   ↓ (2 weeks of testing)
Phase 4-6 complete → Beta Launch
   10 test teachers + 50 test students
   ↓ (2 weeks of testing)
Phase 7-8 complete → Production Launch
   All teachers and students
```

---

## 15. Rollback Strategy

### 15.1 Rollback Levels

| Level | Scope | Time | Trigger |
|-------|-------|:----:|---------|
| **L1 — Feature Flag** | Disable a single feature (e.g., recording) | 5 min | Feature has bugs but core class works |
| **L2 — Phase Rollback** | Revert all changes from one phase | 1-2 hours | Phase introduces critical bug |
| **L3 — Full Rollback** | Revert Live Class module entirely | 4-6 hours | Catastrophic failure affecting core app |
| **L4 — Database Rollback** | Restore DB to pre-migration state | 1 hour | Data corruption or RLS failure |

### 15.2 Feature Flag Inventory

| Flag | Default | Purpose |
|------|:-------:|---------|
| `FEATURE_LIVE_CLASS` | OFF | Master switch — disables all live class UI |
| `FEATURE_LIVE_RECORDING` | ON | Enables/disables recording |
| `FEATURE_LIVE_CHAT` | ON | Enables/disables chat |
| `FEATURE_LIVE_RAISE_HAND` | ON | Enables/disables raise hand |
| `FEATURE_LIVE_SCREEN_SHARE` | ON | Enables/disables screen sharing |

### 15.3 Rollback Process

1. **Detect issue** via monitoring alert or user report
2. **Assess severity** — use L1-L4 level
3. **Toggle feature flag** (L1) or run rollback scripts (L2-L4)
4. **Verify rollback** — confirm core functionality works
5. **Communicate** — update status page, inform stakeholders
6. **Post-mortem** — document root cause and prevention

---

## 16. Testing Checkpoints & Go/No-Go Criteria

### 16.1 Phase-Level Testing Checkpoints

After each phase, a testing checkpoint is held. The phase is approved (Go) only if all criteria are met.

| Phase | Checkpoint | Go Criteria | No-Go Criteria |
|-------|------------|-------------|----------------|
| **Phase 0** | After migration + Edge Function deploy | All RLS tests pass, token generation works, Realtime enabled | Any RLS test fails, token Edge Function returns errors |
| **Phase 1** | After teacher Go Live flow complete | Teacher can start/end class, video/audio publishes, DB updates correctly | LiveKit connection fails, camera/mic not captured, DB not updated |
| **Phase 2** | After student join flow complete | Student can list/join/leave classes, video renders, waiting room works | Student cannot join, video not rendering, join validation missing |
| **Phase 3** | After attendance computation | Attendance events logged, computation correct for all edge cases | Events not logged, computation incorrect, report missing |
| **Phase 4** | After notification delivery verified | All 4 notification types delivered within expected time | Notifications not delivered, deep links broken, suppression broken |
| **Phase 5** | After recording pipeline verified | Recording starts/stops correctly, webhook processes, playback works | Egress fails, webhook not received, playback broken |
| **Phase 6** | After interactive features verified | Chat, raise hand, screen share all functional on both platforms | DataChannel not working, screen share fails on any browser |
| **Phase 7** | After admin views verified | All admin views load with correct data, filters work, CSV exports valid | Data incorrect, filters broken, export fails |
| **Phase 8** | After hardening complete | Load test passes, security audit clean, runbook written | Load test fails (>20% error rate), critical security vuln found |

### 16.2 Go-Live Gate Checklist

All of the following must be green before production launch:

| # | Item | Status |
|:--:|------|:------:|
| 1 | All Phase 0-8 Go criteria met | ⬜ |
| 2 | Load test: 100 concurrent users, <5% error rate | ⬜ |
| 3 | Security audit: No critical or high findings | ⬜ |
| 4 | RLS audit: All live tables have correct policies | ⬜ |
| 5 | Rollback scripts tested and documented | ⬜ |
| 6 | Runbook written and reviewed | ⬜ |
| 7 | Monitoring dashboards configured | ⬜ |
| 8 | Alerts configured for critical errors | ⬜ |
| 9 | Error tracking (Sentry or similar) configured | ⬜ |
| 10 | Production env vars set and verified | ⬜ |
| 11 | LiveKit production account configured | ⬜ |
| 12 | FCM/APNS production keys configured | ⬜ |
| 13 | Storage buckets with RLS configured | ⬜ |
| 14 | Alpha/Beta rollout plan approved | ⬜ |
| 15 | Stakeholder communication ready | ⬜ |

---

## 17. Production Readiness Checklist

### 17.1 Database

- [ ] All Domain 04 migrations applied
- [ ] RLS policies written and tested for all roles (teacher, student, admin)
- [ ] Indexes on frequently queried columns (`scheduled_at`, `teacher_id`, `class_id`, `student_id`)
- [ ] `room_name` UNIQUE constraint verified
- [ ] `profile_id` on `session_participants` verified
- [ ] Realtime enabled for `live_classes` and `live_sessions`

### 17.2 Backend (Supabase Edge Functions)

- [ ] `livekit-token` — accepts roomName, participantName, role; returns valid JWT + URL
- [ ] `livekit-webhook` — handles egress.complete, egress.failed, participant events
- [ ] `compute-attendance` — takes class_id, returns attendance summary per student
- [ ] `send-push-notification` — delivers via FCM/APNS
- [ ] `class-reminder-cron` — scheduled to run every 1 minute
- [ ] All Edge Functions have error handling and logging
- [ ] All Edge Functions have timeout > 30 seconds

### 17.3 LiveKit

- [ ] LiveKit Cloud (or self-hosted) account active
- [ ] Webhook endpoint configured pointing to Edge Function
- [ ] Egress configured for track composite
- [ ] API Key and API Secret stored securely
- [ ] Token lifetime set (recommended: 1 hour)
- [ ] Room cleanup configured (auto-delete after 5 min of last participant)

### 17.4 Teacher Website

- [ ] `livekit-client` installed and configured
- [ ] `lib/video/` abstraction layer complete
- [ ] Live Studio replaces old simulation modal
- [ ] Camera preview, mic meter, Go Live, End Class all functional
- [ ] Screen sharing functional
- [ ] Chat panel functional
- [ ] Raise hand queue functional
- [ ] Attendance report view functional
- [ ] Post-class summary functional
- [ ] Recording status indicator functional
- [ ] All debug logs removed from production build

### 17.5 Student Mobile App

- [ ] `@livekit/react-native` installed and configured
- [ ] `lib/video/` abstraction layer complete
- [ ] LiveClassListScreen functional with real data
- [ ] WaitingRoomScreen functional
- [ ] LiveClassScreen functional (teacher video, controls)
- [ ] Chat functional
- [ ] Raise hand functional
- [ ] Attendance summary functional
- [ ] Recording playback functional
- [ ] Reconnection UI functional
- [ ] Deep link handling from notifications
- [ ] POC screens removed
- [ ] Audio routing (speaker-first) verified on Android + iOS

### 17.6 Monitoring & Observability

- [ ] Error tracking configured (Sentry or similar)
- [ ] LiveKit metrics dashboard configured
- [ ] Supabase logs reviewed for errors
- [ ] Alerts configured for:
  - LiveKit connection failures
  - Egress failures
  - Token generation failures
  - Attendance computation failures
  - High error rate (>5%)

---

## 18. Risk Register

| # | Risk | Probability | Impact | Phase | Mitigation | Owner |
|:-:|------|:----------:|:------:|:----:|------------|:-----:|
| R01 | LiveKit Egress configuration fails in production | Medium | High | P5 | Test in staging, have LiveKit support contact ready | Backend |
| R02 | Android audio routing issues on specific devices | High | Medium | P1, P2 | Test on top 10 Android devices, document known issues | Mobile |
| R03 | iOS app background → disconnect → student misses content | Medium | Medium | P2 | Show "Reconnecting" UI, auto-rejoin | Mobile |
| R04 | Browser WebRTC incompatibility (Safari) | Medium | High | P1 | Test on Safari before launch, fallback to audio-only | Web |
| R05 | Scalability: 500+ concurrent participants | Low | High | P8 | Load test, upgrade LiveKit tier if needed | Backend |
| R06 | RLS misconfiguration exposes teacher token | Low | Critical | P0 | Audit RLS policies, use short-lived tokens | Backend |
| R07 | FCM delivery delays on Chinese OEM devices | High | Low | P4 | Test on Xiaomi, Oppo, Vivo, OnePlus; documented limitation | Mobile |
| R08 | Attendance computation takes >30 seconds for large classes | Medium | Medium | P3 | Optimize queries, consider async processing | Backend |
| R09 | Screen sharing bandwidth exceeds teacher's upload | Medium | Medium | P6 | Recommend 720p, show bandwidth warning | Web |
| R10 | Push notification deep link broken on some Android versions | Medium | Medium | P4 | Test on Android 10, 11, 12, 13, 14 | Mobile |

---

## 19. Resource Estimation

### 19.1 Effort by Phase (Person-Days)

| Phase | Backend | Web | Mobile | QA | Total |
|:-----:|:-------:|:---:|:------:|:--:|:-----:|
| P0 | 6 | 1 | 1 | 3 | **11** |
| P1 | 4 | 12 | 4 | 5 | **25** |
| P2 | 2 | 0 | 14 | 6 | **22** |
| P3 | 6 | 4 | 4 | 4 | **18** |
| P4 | 6 | 2 | 4 | 5 | **17** |
| P5 | 8 | 4 | 4 | 5 | **21** |
| P6 | 2 | 8 | 8 | 5 | **23** |
| P7 | 4 | 8 | 0 | 4 | **16** |
| P8 | 4 | 4 | 4 | 10 | **22** |
| **Total** | **42** | **43** | **43** | **47** | **175** |

### 19.2 Team Composition

| Role | Count | Phase(s) |
|------|:-----:|:--------:|
| Backend Engineer | 1-2 | P0-P8 |
| Web Engineer (Next.js) | 1-2 | P1, P3-P8 |
| Mobile Engineer (React Native) | 1-2 | P1-P6, P8 |
| QA Engineer | 1 | P0-P8 |
| DevOps (shared) | 0.5 | P0, P8 |
| Product Manager | 1 | All phases (oversight) |

### 19.3 Timeline Scenarios

| Scenario | Duration | Team Size | Risk |
|----------|:--------:|:---------:|:----:|
| **Conservative** | 20 weeks | 4 devs + 1 QA | Low |
| **Target** | 16 weeks | 5 devs + 1 QA | Medium |
| **Aggressive** | 12 weeks | 6 devs + 1 QA | High |

**Recommended:** Target timeline with team of 5 developers (1 backend + 2 web + 2 mobile) + 1 QA engineer.

---

## Appendix A: Acronyms & Terms

| Term | Definition |
|------|------------|
| **Egress** | LiveKit's recording pipeline that captures room audio/video to a file |
| **SFU** | Selective Forwarding Unit — WebRTC server that routes media between participants |
| **DataChannel** | WebRTC API for sending arbitrary data (text, events) separate from audio/video |
| **FCM** | Firebase Cloud Messaging — Android push notification service |
| **APNS** | Apple Push Notification Service — iOS push notification service |
| **RLS** | Row-Level Security — Supabase's per-row permission model |
| **PIP** | Picture-in-Picture — small overlay video window |
| **RPC** | Remote Procedure Call — database function executed on Supabase |
| **JWT** | JSON Web Token — used for authenticating with LiveKit |

## Appendix B: Key Contacts

| Resource | Contact | For |
|----------|---------|-----|
| LiveKit Support | support@livekit.io | Egress issues, scaling questions |
| Supabase Support | support@supabase.com | RLS, Realtime, Edge Function issues |
| FCM Console | Firebase Console | Push notification configuration |
| Apple Developer | developer.apple.com | APNS certificates |
