# Live Class Module — Software Design Document (SDD)

> **Version:** 1.0  
> **Date:** July 19, 2026  
> **Author:** Architecture Team  
> **Status:** Draft — Ready for Review  
> **Audience:** Engineering Team (Frontend, Backend, QA, DevOps)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview & Architecture](#2-system-overview--architecture)
3. [User Journeys](#3-user-journeys)
   - 3.1 Teacher Journey
   - 3.2 Student Journey
   - 3.3 Admin Journey
4. [Business Rules](#4-business-rules)
5. [Live Session Lifecycle & State Diagrams](#5-live-session-lifecycle--state-diagrams)
6. [Room Management](#6-room-management)
7. [Attendance Flow](#7-attendance-flow)
8. [Realtime Event Flow](#8-realtime-event-flow)
9. [Notification Strategy](#9-notification-strategy)
10. [Screen Flow](#10-screen-flow)
11. [API Interaction Flow (Sequences)](#11-api-interaction-flow-sequences)
12. [Error Handling](#12-error-handling)
13. [Cross-Platform Strategy](#13-cross-platform-strategy)
14. [Video Provider Abstraction Layer](#14-video-provider-abstraction-layer)
15. [Future Scalability](#15-future-scalability)
16. [Implementation Roadmap](#16-implementation-roadmap)

---

## 1. Executive Summary

This document defines the complete functional and technical design for the Live Class module of the MockTest Platform. The module enables **teachers** to conduct live video classes, **students** to join and participate, and **administrators** to monitor and manage the entire lifecycle.

The system uses **LiveKit** as the primary video provider with a **provider-agnostic abstraction layer** to allow future replacement with Agora, 100ms, Daily, Zoom, etc., without UI changes.

**Key Design Principles:**
- Provider-agnostic video abstraction
- Event-sourced attendance tracking
- Supabase-first data persistence
- Offline-resilient reconnection
- Real-time state synchronization via LiveKit events + Supabase Realtime
- Role-based access control (Teacher, Student, Admin)

---

## 2. System Overview & Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        TEACHER WEBSITE (Next.js)                         │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐     │
│  │ Today's      │  │ Live Studio  │  │ Post-Class                 │     │
│  │ Schedule     │  │ (Video Grid, │  │ (Attendance, Reports,      │     │
│  │              │  │  ControlBar, │  │  Recording)                │     │
│  │              │  │  Chat,       │  │                            │     │
│  │              │  │  Attendance) │  │                            │     │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┬──────────────┘     │
│         │                 │                         │                    │
│         └─────────────────┼─────────────────────────┘                    │
│                           │                                              │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │              Video Provider Abstraction Layer                     │  │
│  │              (lib/video/VideoProvider interface)                  │  │
│  └────────────────────────┬──────────────────────────────────────────┘  │
└───────────────────────────┼──────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────────┐
│                    SUPABASE (Primary Backend)                            │
│                                                                          │
│  ┌─────────────────────────────────────┐  ┌─────────────────────────┐   │
│  │  Database (Domain 04)               │  │  Edge Functions          │   │
│  │   live_classes                       │  │   livekit-token          │   │
│  │   live_sessions                      │  │   livekit-webhook        │   │
│  │   session_participants              │  │   compute-attendance     │   │
│  │   attendance                        │  │                         │   │
│  │   attendance_events                 │  │  Supabase Realtime       │   │
│  │   recordings                        │  │   (broadcast + presence) │   │
│  └─────────────────────────────────────┘  └─────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────────┐
│                    LIVEKIT CLOUD / SERVER                                │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌──────────────────┐    │
│  │ Room Management   │  │ WebRTC SFU        │  │ Egress (Record)  │    │
│  │ Token Auth (JWT)  │  │ Audio/Video Relay │  │ Webhooks         │    │
│  └───────────────────┘  └───────────────────┘  └──────────────────┘    │
└───────────────────────────┬──────────────────────────────────────────────┘
                            │
┌───────────────────────────┼──────────────────────────────────────────────┐
│                     STUDENT MOBILE APP (React Native)                    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐     │
│  │ Today's      │  │ Waiting Room │  │ Live Class                 │     │
│  │ Classes      │  │              │  │ (Video Grid, ControlBar,   │     │
│  │              │  │              │  │  Chat, Attendance)         │     │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┬──────────────┘     │
│         │                 │                         │                    │
│         └─────────────────┼─────────────────────────┘                    │
│                           │                                              │
│  ┌────────────────────────▼──────────────────────────────────────────┐  │
│  │              Video Provider Abstraction Layer                     │  │
│  │           (lib/video/VideoProvider interface - RN impl)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema (Domain 04 — Core Tables)

| Table | Purpose | Key Columns | Relationships |
|-------|---------|-------------|---------------|
| `live_classes` | Schedulable unit of live teaching | `class_id`, `teacher_id`, `subject_id`, `chapter_id`, `title`, `scheduled_at`, `duration_min`, `status`, `room_name`, `is_recorded`, `max_participants`, `meeting_id` | → teacher_details, subjects, chapters |
| `live_sessions` | Active provider session (1:1 with live_classes) | `session_id`, `class_id`, `provider`, `status`, `started_at`, `ended_at`, `ended_reason`, `room_url`, `host_token`, `participant_token`, `peak_participants`, `metadata` | → live_classes (UNIQUE) |
| `live_class_batch` | Junction: live_classes ↔ batches | `class_id`, `batch_id` | → live_classes (CASCADE), batches |
| `session_participants` | Real-time join/leave event log | `event_id`, `session_id`, `class_id`, `student_id`, `profile_id`, `joined_at`, `left_at`, `duration_seconds`, `device_type`, `connection_quality` | → live_sessions, live_classes, student_details |
| `recordings` | Recording metadata | `recording_id`, `class_id`, `egress_id`, `status`, `file_url`, `duration_seconds`, `file_size_bytes`, `started_at`, `completed_at` | → live_classes |
| `attendance` | Per-student per-class summary | `attendance_id`, `class_id`, `student_id`, `status` (present/late/absent), `join_time`, `leave_time`, `duration_seconds`, `is_manual_override`, `override_by`, `override_reason` | → live_classes, student_details |
| `attendance_events` | Raw join/leave event log (event sourcing) | `event_id`, `attendance_id`, `class_id`, `student_id`, `event_type` (join/leave/reconnect), `event_time`, `metadata` | → attendance, live_classes, student_details |

### 2.3 Status Enums

**live_classes.status:**
```
draft → scheduled → live → completed → cancelled
```

**live_sessions.status:**
```
pending → live → paused → ended → failed
```

**attendance.status:**
```
present | late | absent | excused
```

---

## 3. User Journeys

### 3.1 Teacher Journey

#### 3.1.1 Pre-Class Phase

**Step 1: Login & Dashboard**
- Teacher logs in via phone/OTP or email/password
- Role detection (`profiles.role = 'teacher'`)
- Dashboard loads with:
  - Next upcoming class card (countdown timer)
  - Today's class list (chronological)
  - Quick stats (total students, pending tasks)
  - "Enter Live Studio" quick action button (enabled only when a class is within 15 min of scheduled time)

**Step 2: Today's Schedule**
- Full-day view of scheduled live classes
- Each class card shows:
  - Title, subject, chapter
  - Batch name(s)
  - Scheduled time & duration
  - Enrolled student count
  - Status badge (Scheduled / Live / Completed / Cancelled)
  - Action button: "Start Class" (enabled 15 min before scheduled time)

#### 3.1.2 Pre-Broadcast Phase

**Step 3: Device Check (Pre-Studio)**
- When teacher clicks "Start Class," the system first performs a device readiness check:
  - Camera detection & permission check
  - Microphone detection & permission check
  - Network bandwidth estimation (optional: speed test)
- If any device is unavailable, show a clear error with fix instructions
- On success, proceed to Live Studio

**Step 4: Live Studio (Pre-Broadcast State)**
- Teacher sees:
  - **Camera Preview:** Self-view with mirroring
  - **Audio Meter:** Microphone level visualization
  - **Class Info Panel:** Title, batch, duration
  - **Controls:** Camera toggle, Mic toggle, Background blur (optional)
  - **"Go Live" Button:** Prominent, centered
- Status indicator: **"Pre-Broadcast"** — students do not see the teacher yet
- Teacher can wait in this state indefinitely

#### 3.1.3 Live Broadcast Phase

**Step 5: Going Live**
- Teacher clicks "Go Live"
- System:
  1. Creates/updates `live_sessions` record (status → `live`)
  2. Generates LiveKit token with `teacher` role (can publish video/audio)
  3. Connects to LiveKit room as publisher
  4. Starts recording (if `is_recorded = true`)
  5. Updates `live_classes.status` → `live`
  6. Sends push notification to all enrolled students: "Your class with [Teacher] has started!"
  7. Marks session start time

**Step 6: Live Studio (Broadcasting State)**
- Teacher sees:
  - **Main Video Stage:** Large self-view (or student spotlight)
  - **Participant Grid:** Thumbnails of students with video enabled (initially hidden behind tab)
  - **Chat Panel:** Student messages (text), ability to respond
  - **Raised Hands Queue:** Students requesting to speak, with "Allow" action
  - **Attendance Panel:** Live join/leave feed, student count
  - **Recording Indicator:** Red dot + elapsed time (REC 00:14:32)
  - **Timer:** Elapsed class time vs scheduled duration
  - **Controls:**
    - Camera On/Off
    - Mic Mute/Unmute
    - Screen Share (Start/Stop)
    - End Class (red button)
  - **Network Quality Indicator:** Green/Yellow/Red

**Step 7: During Class — Specific Actions**

**Screen Sharing:**
- Teacher clicks "Share Screen"
- System shares the selected application/window/entire screen
- Students see the shared screen as their primary video
- Teacher's camera moves to a thumbnail overlay (picture-in-picture)
- Chat and other panels remain accessible

**Student Spotlight (Future):**
- Teacher can pin a student's video to the main stage
- Useful for student presentations or doubt clarification

**Announcement:**
- Teacher can send a full-screen announcement to all students (text only)
- Students must dismiss it to continue seeing video

#### 3.1.4 Post-Class Phase

**Step 8: Ending the Class**
- Teacher clicks "End Class"
- Confirmation dialog: "End class for all students? This will disconnect everyone."
- On confirm:
  1. LiveKit room disconnection
  2. Recording stops (triggers Egress completion)
  3. `live_sessions.status` → `ended`, set `ended_at`
  4. `live_classes.status` → `completed`
  5. Attendance computation triggered (Edge Function or server-side RPC)
  6. Students see "Class Ended" overlay with attendance summary

**Step 9: Post-Class Summary**
- Teacher sees:
  - **Attendance Summary:**
    - Total enrolled: 48
    - Joined: 42
    - Late: 5
    - Absent: 6
    - Average attendance duration: 42 min
  - **Recording Status:** "Processing..." or "Available" with view link
  - **Student Engagement:**
    - Total chat messages
    - Questions asked
    - Raised hands count
  - **Quick Actions:**
    - Download attendance report (CSV)
    - View recording
    - Schedule next class
    - Send follow-up to absent students

### 3.2 Student Journey

#### 3.2.1 Pre-Class Phase

**Step 1: Login & Dashboard**
- Student logs in via phone/OTP
- Dashboard shows:
  - **Today's Live Classes:** List of scheduled classes for batches they belong to
  - **Upcoming Class Banner:** Countdown timer until the next class
  - **Class Cards:** Each shows:
    - Title, teacher name, subject
    - Time & duration
    - Status (Upcoming / Live / Completed)
    - "Join" button (enabled 15 min before start)

**Step 2: Class Reminder**
- 15 minutes before class: Push notification and in-app notification
- 5 minutes before class: Second push notification
- Both notifications have a "Join Now" deep link

**Step 3: Join Window**
- **15 min before** scheduled time: "Join" button becomes active
- Before this window: Button shows "Starts at [time]" (disabled, grayed out)

#### 3.2.2 Pre-Class Waiting

**Step 4: Waiting Room**
- Student taps "Join" → enters Waiting Room
- **If teacher has NOT started the class yet:**
  - Waiting Room shows:
    - Class title, teacher name, subject
    - "Waiting for teacher to join..."
    - Estimated start time
    - Connection status indicator
    - Background video/illustration
  - Student can leave the waiting room at any time
  - Student can rejoin within 15 min of class start

- **If teacher HAS started the class:**
  - Waiting Room is skipped
  - Student proceeds directly to the Live Class screen

**Step 5: Teacher Joined Notification**
- Student sees a visual cue: "Teacher is now live!"
- Brief animation/transition to Live Class screen

#### 3.2.3 Live Class Phase

**Step 6: Live Class Screen**
- Student sees:
  - **Main Video:** Teacher's video (large, primary)
  - **Screen Share (if active):** Shared screen replaces teacher video as primary; teacher video becomes PIP thumbnail
  - **Student Count:** "42 students attending"
  - **Controls:**
    - Mic Mute/Unmute (disabled by default, enabled only when teacher unmutes student)
    - Camera On/Off (disabled by default)
    - Raise Hand button
    - Chat (text messages to teacher)
    - Leave Class
  - **Network Indicator:** Connection quality (green/yellow/red)
  - **Recording Indicator:** Shown if class is being recorded
  - **Teacher's Mic/Cam Status:** Visible indicators

**Step 7: Raise Hand**
- Student taps "Raise Hand"
- Teacher sees the student in the raised hands queue
- Teacher can "Allow" the student to speak
- If allowed:
  - Student's mic is unmuted
  - Student's camera may be enabled (if student chose)
  - Student sees a "You're live!" indicator
- Student can lower hand at any time
- If teacher does not respond within 60 seconds, hand is automatically lowered (optional)

**Step 8: Chat**
- Student can send text messages to the teacher
- Teacher can respond publicly or privately (future)
- Chat persists for the duration of the class
- Chat is available for replay in recordings (future)

#### 3.2.4 Network Issues

**Step 9: Network Loss**
- If student loses internet:
  1. Video freezes → shows "Reconnecting..." overlay
  2. LiveKit client auto-reconnects (built-in)
  3. Supabase Realtime channel reconnects
  4. On reconnect: video resumes, chat history syncs
  5. Attendance records are updated with reconnect event
  6. If reconnect fails after 60 seconds: show "Connection Lost" screen with option to:
     - Retry
     - Leave class
     - View class recording later (if available)

#### 3.2.5 Post-Class Phase

**Step 10: Class Ended**
- Student sees:
  - **"Class Ended"** overlay with animation
  - **Attendance Summary:**
    - Total time attended
    - Late/On-time indicator
    - "You attended 42 of 48 minutes"
  - **Options:**
    - View recording (if available)
    - Submit feedback about the class
    - Go back to dashboard

**Step 11: Recording Availability**
- Push notification when recording is processed: "Recording for [Class Title] is now available"
- Student can view recording in the class details page
- Recording is accessible for 30 days (configurable)

### 3.3 Admin Journey

#### 3.3.1 Monitoring Dashboard

**Step 1: Admin Login & Dashboard**
- Admin logs in
- Dashboard shows:
  - **Live Now Count:** Number of active live sessions across the institute
  - **Today's Classes:** All scheduled classes in the institute
  - **Quick Stats:**
    - Total classes today
    - Total students attending live sessions currently
    - Classes starting in next hour
    - Recordings pending processing

**Step 2: Live Classes Overview**
- Full list of all live classes across the institute
- Filters:
  - Date range
  - Teacher
  - Batch
  - Status (scheduled, live, completed, cancelled)
- Columns:
  - Class title, teacher, batch, subject
  - Scheduled time, actual start time
  - Status
  - Student count (enrolled vs joined)
  - Recording status
  - Actions (view details)

#### 3.3.2 Session Monitoring

**Step 3: Active Session Detail**
- Click any "Live" class to see real-time details:
  - **Teacher Info:** Name, camera/mic status, connection quality
  - **Student List:** Currently joined, with join time
  - **Attendance Graph:** Students joined over time (line chart)
  - **Engagement Metrics:**
    - Chat messages count
    - Raised hands count
    - Average connection quality
  - **Actions:**
    - Force-end class (emergency)
    - View recording (when available)
    - Download attendance report

#### 3.3.3 Post-Class Reports

**Step 4: Attendance Reports**
- Per-class attendance summary
- Per-student attendance across all classes
- Export to CSV/Excel
- Filters: date range, teacher, batch, student

**Step 5: Recording Management**
- List of all recordings with:
  - Class title, teacher, date
  - Duration, file size
  - Processing status
  - View/Download/Delete actions
  - Retention expiry date

**Step 6: Analytics**
- **Teacher Activity:** Classes conducted vs scheduled per teacher
- **Student Attendance:** Average attendance rate across all classes
- **Peak Usage:** Concurrent live class participants over time
- **Recording Stats:** Total recordings, storage used, views

#### 3.3.7 Session Logs
- Full audit trail for every live session:
  - Session creation
  - Teacher join/leave events
  - Student join/leave events (paginated)
  - Recording start/stop events
  - Any errors or failures
- Useful for debugging and compliance

---

## 4. Business Rules

### 4.1 Class Scheduling Rules

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-001 | Teacher Authorization | Only users with `profiles.role = 'teacher'` can create and start live classes. Admin can create/schedule on behalf of a teacher. |
| BR-002 | Student Scope | Students can only see and join classes linked to batches they belong to (`batch_students`). |
| BR-003 | No Schedule Conflict | A teacher cannot have two `live` or `scheduled` classes at the same time. System must check for time overlap before creating/scheduling. |
| BR-004 | Duration Limit | A class cannot exceed `duration_min` by more than 30 minutes. After that, automatic force-end is triggered. |
| BR-005 | Class Cancellation | A class can be cancelled up to 5 minutes before scheduled start. After that, it must be "ended" (marked as completed with 0 attendance) or rescheduled. |

### 4.2 Join Rules

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-010 | Join Window | "Join" button is enabled 15 minutes before `scheduled_at`. Before that, button shows start time (disabled). |
| BR-011 | Early Entry | If teacher has started the class early (before scheduled time), students can join as soon as the class becomes `live`. |
| BR-012 | Late Join | Students can join up to `duration_min` after the class started. After that, join is blocked unless admin overrides. |
| BR-013 | Rejoin | Students who leave can rejoin at any time during the live session. Attendance tracking handles reconnects correctly. |
| BR-014 | Max Participants | If `max_participants` is reached, new join attempts are rejected with "Class is full." message. |

### 4.3 Teacher Rules

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-020 | Teacher Must Join | If the teacher does not start the class within 30 minutes of `scheduled_at`, the class is auto-cancelled and students are notified. |
| BR-021 | Teacher Disconnect | If teacher disconnects during a live session: (1) Students see "Teacher disconnected" banner, (2) 5-minute grace period starts, (3) After 5 min, if teacher hasn't reconnected, session auto-ends. |
| BR-022 | Teacher Reconnect | Teacher can reconnect within the 5-minute grace period. Session resumes, students see "Teacher reconnected." |
| BR-023 | Cannot Recreate | A teacher cannot start a new `live` session for a class that already has a `live` session. The existing session must be ended first. |
| BR-024 | Teacher Late | If teacher starts more than 15 min late, all students who joined on time are marked "Present" automatically, and teacher's punctuality is noted in analytics. |

### 4.4 Attendance Rules

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-030 | Attendance Start | Attendance tracking begins when the teacher clicks "Go Live" (session status → `live`). |
| BR-031 | Attendance End | Attendance tracking ends when the teacher clicks "End Class" (session status → `ended`). |
| BR-032 | Present Threshold | Student must be connected for at least 70% of the class duration to be marked "Present." |
| BR-033 | Late Threshold | Student joining after 10 minutes from session start is marked "Late." Configurable per institute. |
| BR-034 | Attendance Computation | Attendance is computed server-side when the session ends. An Edge Function or RPC aggregates `session_participants` events. |
| BR-035 | Manual Override | Teacher or Admin can manually override attendance status. `is_manual_override = true` is set with `override_by` and `override_reason`. |
| BR-036 | Multiple Reconnects | Each join/leave cycle is logged as separate `session_participants` events. Total attendance duration is the sum of all connected intervals. |

### 4.5 Recording Rules

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-040 | Recording Start | Recording starts automatically when teacher clicks "Go Live" IF `live_classes.is_recorded = true`. |
| BR-041 | Recording Stop | Recording stops when teacher clicks "End Class" OR session auto-ends. |
| BR-042 | Processing Time | Recordings may take up to 5× the class duration to process (Egress pipeline). Students see "Processing..." until complete. |
| BR-043 | Retention | Recordings are retained for 30 days. Configurable at the institute level. Automatically deleted after expiry. |
| BR-044 | Recording Pause | If teacher pauses the class (future feature), recording is paused as well. Resumes when class resumes. |

### 4.6 Edge Cases

| Rule ID | Rule | Description |
|---------|------|-------------|
| BR-050 | Teacher Never Joins | If teacher never starts the class: `live_classes.status` remains `scheduled` → auto-cancelled after 30 min → students get "Class cancelled" notification. |
| BR-051 | All Students Leave | If all students disconnect, session continues. Recording continues. Teacher can still teach to an empty room. |
| BR-052 | Class Over Duration | If class exceeds `duration_min + 30 min`, auto-end is triggered. Teacher sees a warning at `duration_min` mark. |
| BR-053 | Student Joined Before Teacher | Students in the waiting room before teacher joins: they remain in the waiting room. When teacher goes live, all waiting students are auto-joined to the live session. |
| BR-054 | Reconnect During Recording | If teacher reconnects while recording was running, recording continues seamlessly (single file per session). |

---

## 5. Live Session Lifecycle & State Diagrams

### 5.1 State Transition Diagram — Live Class

```
                    ┌─────────────┐
                    │   DRAFT     │
                    └──────┬──────┘
                           │ Schedule
                           ▼
                    ┌─────────────┐
              ┌────▶│  SCHEDULED  │◀──────────┐
              │     └──────┬──────┘           │
              │            │                  │
              │            ├──────────────────┤
              │            │ Start Class      │ Reschedule
              │            ▼                  │
              │     ┌─────────────┐           │
              │     │    LIVE     │           │
              │     └──────┬──────┘           │
              │            │                  │
              │            ├──────────────────┤
              │            │ End Class        │ Cancel
              │            ▼                  │
              │     ┌─────────────┐           │
              │     │  COMPLETED  │           │
              │     └─────────────┘           │
              │                               │
              └─────────── Cancel ────────────┘
              │
              ▼
        ┌─────────────┐
        │  CANCELLED  │
        └─────────────┘
```

### 5.2 State Transition Diagram — Live Session

```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │ Teacher clicks "Go Live"
                           ▼
                    ┌─────────────┐
              ┌────▶│    LIVE     │
              │     └──────┬──────┘
              │            │
              │            ├────────────────────┐
              │            │                    │
              │            │ Teacher disconnect │
              │            ▼                    │
              │     ┌─────────────┐             │
              │     │   PAUSED    │             │
              │     └──────┬──────┘             │
              │            │                    │
              │            ├────────────────────┘
              │            │ Teacher reconnects within 5 min
              │            │ OR auto-end after 5 min
              │            ▼
              │     ┌─────────────┐
              │     │   ENDED     │
              │     └──────┬──────┘
              │            │
              │            ├────────────────────┐
              │            │                    │
              │            ▼                    ▼
              │     ┌─────────────┐    ┌──────────────┐
              │     │  RECORDING  │    │  COMPLETED   │
              │     │  PROCESSING │    │  (No Record) │
              │     └──────┬──────┘    └──────────────┘
              │            │
              │            ▼
              │     ┌─────────────┐
              └────▶│  COMPLETED  │  (Recording done)
                    └─────────────┘
```

### 5.3 State Transition Table

| From | To | Trigger | Action |
|------|----|---------|--------|
| DRAFT | SCHEDULED | Teacher schedules class | Create `live_classes` row with `status = 'scheduled'`, assign batches |
| SCHEDULED | LIVE | Teacher clicks "Go Live" | Create `live_sessions`, generate LiveKit token, connect to room, notify students, start recording |
| SCHEDULED | CANCELLED | Teacher cancels (≥5 min before) | Update `live_classes.status = 'cancelled'`, notify students |
| SCHEDULED | CANCELLED | Auto-cancel (30 min after scheduled) | Edge Function checks & updates, notify students |
| LIVE | COMPLETED | Teacher clicks "End Class" | Disconnect room, stop recording, compute attendance, notify students |
| LIVE | PAUSED | Teacher disconnects | Set `live_sessions.status = 'paused'`, start 5-min timer, show "Teacher disconnected" to students |
| PAUSED | LIVE | Teacher reconnects (within 5 min) | Resume session, notify students |
| PAUSED | ENDED | Auto-end (5 min timeout) | End session, compute partial attendance |
| LIVE | ENDED | Auto-end (duration + 30 min exceeded) | Force-end session, notify all |
| LIVE | ENDED | Admin force-ends | Update session, notify all |
| ENDED | RECORDING_PROCESSING | Recording egress completes | Webhook from LiveKit starts processing |
| RECORDING_PROCESSING | COMPLETED | Processing done | Update `recordings.status = 'completed'`, notify students |

---

## 6. Room Management

### 6.1 Room Naming Strategy

**Pattern:** `{institute_slug}-{teacher_id_short}-{class_id_short}`

```
Example: iitphysics-tch_a3b-lc_x7k9
```

**Rules:**
- Must be unique across the entire LiveKit project
- Deterministic from class data (can be re-derived if needed)
- Max 64 characters (LiveKit limit)
- Lowercase alphanumeric + hyphens only
- No PII (personally identifiable information) in room name

**Storage:**
- Stored in `live_classes.room_name` (VARCHAR, UNIQUE)
- Generated when class is scheduled (not when started)
- Never reused — even if a class is cancelled, its room name is retired

### 6.2 Room Creation

- Room is **not** created in LiveKit at schedule time
- Room is created in LiveKit when the teacher clicks "Go Live" (first connection)
- LiveKit auto-creates rooms on first participant join (room doesn't need pre-creation)
- Alternative: Pre-create rooms for faster Go Live experience (configurable)

### 6.3 Room Expiration

| Event | Action |
|-------|--------|
| Session ends | Room remains in LiveKit for 5 minutes (grace period for reconnections) |
| 5 min after session ends | Room is deleted via LiveKit API (or auto-expires if configured) |
| Cleanup failure | Periodic cleanup job runs every hour to delete stale rooms |

### 6.4 Participant Roles in LiveKit

| Role | Permissions | Can Publish Video | Can Publish Audio | Can Share Screen | Can Subscribe |
|------|-------------|:-:|:-:|:-:|:-:|
| `teacher` | Full publisher | ✅ | ✅ | ✅ | ✅ |
| `student` | Subscriber + limited publish | ❌ (default) | ❌ (default) | ❌ | ✅ |
| `student_raised_hand` | Subscriber + mic allowed | ❌ | ✅ (when teacher approves) | ❌ | ✅ |
| `guest` (future) | Subscriber only | ❌ | ❌ | ❌ | ✅ |
| `moderator` (future) | Full publisher (except end class) | ✅ | ✅ | ✅ | ✅ |

### 6.5 Participant Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Default max participants | `live_classes.max_participants` (default: 100) | Configurable per class |
| LiveKit limit | Depends on server tier | 50-5000+ depending on plan |
| Simultaneous publishers | 2 (teacher + screen share) + student when raised hand approved | Prevents audio feedback |

---

## 7. Attendance Flow

### 7.1 Event Sourcing Model

Attendance is computed from **event sourcing** rather than real-time state.

**Events logged** (in `session_participants` and `attendance_events`):

| Event | When | Logged By |
|-------|------|-----------|
| `student_joined` | Student successfully joins LiveKit room | Client → Supabase |
| `student_left` | Student disconnects (gracefully or timeout) | Client → Supabase |
| `student_reconnected` | Student reconnects after disconnect | Client → Supabase |
| `teacher_started` | Teacher clicks "Go Live" | Server |
| `teacher_ended` | Teacher ends class | Server |

### 7.2 Attendance Computation

**Triggered when:**
1. Teacher ends class (primary trigger)
2. Auto-end (grace period expired)
3. Student requests attendance view during class (shows partial/in-progress data)

**Algorithm:**

```
For each student enrolled in the class's batches:
  1. Get all session_participant events for this student in this class
  2. Calculate total_connected_duration = SUM of (left_at - joined_at) for all intervals
  3. Calculate class_duration = session.ended_at - session.started_at
  4. attendance_percentage = (total_connected_duration / class_duration) * 100
  5. Determine status:
     - If first_join_time > session_started_at + 10 minutes → status = "late"
     - Else → status = "determined by percentage"
  6. If attendance_percentage >= 70% → status = "present"
  7. If attendance_percentage < 70% AND > 0% → status = "late"
  8. If no events at all → status = "absent"
```

### 7.3 Attendance Report Schema

**Student View:**
| Field | Source |
|-------|--------|
| Student name | `profiles.name` |
| Class title | `live_classes.title` |
| Date | `live_classes.scheduled_at` |
| Status (Present/Late/Absent) | Computed |
| Join time | First `joined_at` |
| Leave time | Last `left_at` |
| Total duration | Computed (`SUM of intervals`) |
| Reconnect count | Count of `student_reconnected` events |

### 7.4 Edge Cases

| Scenario | Handling |
|----------|----------|
| Student joined before teacher | Events are logged but attendance timer starts at session start, not student's first join |
| Student joined late (after 10 min) | Status = "Late" regardless of total duration |
| Student disconnected and returned | Each interval is added. Total duration = sum of intervals |
| Student was connected > 100% duration | Impossible — bounded by session start/end |
| Teacher ended early | Attendance is prorated. Student time is compared to actual session duration |
| Network drop for 2 seconds | Logged as a single short interval. If total ≥ 70%, status is "Present" |

---

## 8. Realtime Event Flow

### 8.1 Event Catalog

| Event | Source | Destination | Channel | Payload |
|-------|--------|-------------|---------|---------|
| `class:started` | Server (on Go Live) | All enrolled students | Push + Realtime | `{ class_id, teacher_name, title, session_id, room_name }` |
| `class:ended` | Server (on End Class) | All participants | Realtime | `{ class_id, session_id, duration_min }` |
| `class:cancelled` | Server | All enrolled students | Push + Realtime | `{ class_id, reason }` |
| `teacher:joined` | LiveKit webhook | Students in room | Realtime | `{ participant_identity }` |
| `teacher:disconnected` | LiveKit webhook | Students in room | Realtime | `{ participant_identity, grace_period_seconds }` |
| `teacher:reconnected` | LiveKit webhook | Students in room | Realtime | `{ participant_identity }` |
| `student:joined` | Client | Server (attendance log) | Supabase INSERT | `{ class_id, student_id, joined_at }` |
| `student:left` | Client | Server (attendance log) | Supabase INSERT | `{ class_id, student_id, left_at, duration }` |
| `hand:raised` | Client | Teacher | LiveKit DataChannel | `{ student_id, student_name, timestamp }` |
| `hand:lowered` | Client | Teacher | LiveKit DataChannel | `{ student_id, timestamp }` |
| `hand:approved` | Teacher | Specific student | LiveKit DataChannel | `{ student_id, can_speak: true }` |
| `chat:message` | Client | All participants | LiveKit DataChannel | `{ sender_id, sender_name, message, timestamp }` |
| `mic:toggled` | Client | Server (event log) | Realtime | `{ participant_id, enabled }` |
| `cam:toggled` | Client | Server (event log) | Realtime | `{ participant_id, enabled }` |
| `screen:started` | Teacher | All students | Realtime | `{ teacher_id }` |
| `screen:stopped` | Teacher | All students | Realtime | `{ teacher_id }` |
| `recording:started` | Server | Teacher | Realtime | `{ recording_id, timestamp }` |
| `recording:completed` | LiveKit webhook | Server + Teacher | Push + Realtime | `{ recording_id, file_url, duration }` |
| `recording:available` | Server | All enrolled students | Push + Realtime | `{ class_id, recording_url }` |
| `attendance:computed` | Server | Teacher | Realtime | `{ class_id, summary }` |

### 8.2 Event Flow Diagrams

**Teacher Starts Class:**
```
Teacher clicks "Go Live"
  │
  ├──→ Frontend: Validate device readiness
  ├──→ Frontend: Request LiveKit token (Edge Function)
  │     └──→ Edge Function: Validate teacher, generate token
  ├──→ Frontend: Connect to LiveKit room (teacher role, publisher)
  ├──→ Frontend: Enable camera + microphone
  ├──→ Frontend: Call API to start session
  │     └──→ API: Update live_classes.status → 'live'
  │     └──→ API: Create live_sessions record
  │     └──→ API: If is_recorded, start LiveKit Egress
  │     └──→ API: Broadcast 'class:started' event
  ├──→ Push Notification: Send to all enrolled students
  └──→ UI: Transition to broadcasting state
```

**Student Joins Class:**
```
Student taps "Join" (from dashboard or push notification)
  │
  ├──→ Frontend: Validate join window (BR-010, BR-012)
  ├──→ Frontend: Check max_participants (BR-014)
  ├──→ Frontend: Request media permissions (optional)
  ├──→ Frontend: Request LiveKit token (Edge Function)
  │     └──→ Edge Function: Validate student, generate subscriber token
  ├──→ Frontend: Log 'student:joined' event to Supabase
  ├──→ Frontend: Connect to LiveKit room (student role, subscriber)
  ├──→ Frontend: Subscribe to teacher's video/audio tracks
  ├──→ Frontend: Join Supabase Realtime channel for class events
  └──→ UI: Render Live Class screen
```

**Teacher Ends Class:**
```
Teacher clicks "End Class"
  │
  ├──→ Confirm dialog
  ├──→ Frontend: Disconnect from LiveKit room
  ├──→ Frontend: Call API to end session
  │     └──→ API: Update live_sessions → ended, set ended_at
  │     └──→ API: Update live_classes.status → 'completed'
  │     └──→ API: Stop LiveKit Egress
  │     └──→ API: Broadcast 'class:ended' event
  │     └──→ API: Trigger attendance computation (Edge Function or RPC)
  ├──→ All Students: See "Class Ended" overlay
  └──→ Teacher: Navigate to Post-Class Summary
```

---

## 9. Notification Strategy

### 9.1 Notification Types

| Type | Channel | Timing | Priority | Deep Link |
|------|---------|--------|----------|-----------|
| `live_class_reminder_15min` | Push + In-App | 15 min before `scheduled_at` | High | `mocktestapp://live-class/{class_id}` |
| `live_class_reminder_5min` | Push + In-App | 5 min before `scheduled_at` | High | `mocktestapp://live-class/{class_id}` |
| `live_class_started` | Push + In-App | When teacher goes live | Urgent | `mocktestapp://live-class/{class_id}` |
| `live_class_cancelled` | Push + In-App | When class is cancelled | High | `mocktestapp://dashboard` |
| `live_class_recording_available` | Push + In-App | When recording is processed | Normal | `mocktestapp://recording/{recording_id}` |
| `live_class_attendance_generated` | In-App | After attendance computation | Normal | `mocktestapp://live-class/{class_id}/attendance` |
| `live_class_missed` | Push + In-App | After class ends (for absent students) | Normal | `mocktestapp://recording/{recording_id}` |
| `teacher_disconnected` | In-App (Toast) | When teacher disconnects | Urgent | (none — shown in-app) |
| `teacher_reconnected` | In-App (Toast) | When teacher reconnects | High | (none — shown in-app) |

### 9.2 Notification Delivery Strategy

**Push Notifications (FCM/APNS):**
- Device tokens stored in `user_device_tokens` (migration 048)
- Sent via Supabase Edge Function or third-party push service
- Payload includes `class_id` for deep linking
- Silent push for non-critical updates (attendance generated)

**In-App Notifications:**
- Shown in the notification center within the app
- Displayed as banners/toasts during live class for real-time events
- Stored in `notifications` + `notification_recipients` tables
- Support read/unread state

**Notification Suppression:**
- If student is currently in the class: suppress push notifications for that class
- If student has joined the class: suppress reminder notifications
- If class is already ended: suppress start notifications

### 9.3 Notification Templates

```
live_class_reminder_15min:
  Title: "📺 Class Starting Soon"
  Body: "[Teacher Name] is starting "[Class Title]" in 15 minutes. Tap to join."
  Data: { class_id, type: "live_class_reminder" }

live_class_started:
  Title: "🔴 Live Now"
  Body: "[Teacher Name] has started "[Class Title]". Join now!"
  Data: { class_id, type: "live_class_started" }

live_class_cancelled:
  Title: "❌ Class Cancelled"
  Body: "[Teacher Name]'s class "[Class Title]" has been cancelled."
  Data: { class_id, type: "live_class_cancelled" }

live_class_recording_available:
  Title: "📹 Recording Available"
  Body: "The recording for "[Class Title]" is now available to watch."
  Data: { recording_id, class_id, type: "recording_available" }
```

---

## 10. Screen Flow

### 10.1 Teacher Screen Flow

```
┌──────────────────────────────────────┐
│           TEACHER LOGIN              │
│  Phone/Email + Password / OTP        │
└─────────────────┬────────────────────┘
                  ▼
┌──────────────────────────────────────┐
│         TEACHER DASHBOARD            │
│  - Welcome banner                    │
│  - Next class card (countdown)       │
│  - Today's classes list              │
│  - Quick analytics widgets           │
│  - "Enter Live Studio" button        │
└─────────────────┬────────────────────┘
                  │ Tap a class / "Start" button
                  ▼
┌──────────────────────────────────────┐
│         DEVICE CHECK SCREEN          │
│  - Camera detection                  │
│  - Mic detection                     │
│  - Network check (optional)          │
│  - Proceed / Fix issues              │
└─────────────────┬────────────────────┘
                  │ All checks passed
                  ▼
┌──────────────────────────────────────┐
│         LIVE STUDIO (Pre-Broadcast)  │
│  ┌────────────────────────────────┐  │
│  │     Camera Preview (self-view) │  │
│  │     Audio meter                │  │
│  │     "Go Live" button           │  │
│  └────────────────────────────────┘  │
│  Controls: [Cam] [Mic] [Bg Blur]    │
└─────────────────┬────────────────────┘
                  │ Click "Go Live"
                  ▼
┌──────────────────────────────────────┐
│         LIVE STUDIO (Broadcasting)   │
│  ┌──────────────┐ ┌───────────────┐  │
│  │ Main Video   │ │ Chat Panel    │  │
│  │ (Teacher)    │ │ Student msgs  │  │
│  │              │ │ Raise Hand    │  │
│  │              │ │ Queue         │  │
│  │              │ │               │  │
│  │ Participant  │ │ Attendance    │  │
│  │ Grid (tab)   │ │ Panel (tab)   │  │
│  └──────────────┘ └───────────────┘  │
│  Controls: [Cam][Mic][Share][End]    │
│  Timer: 00:14:32                     │
│  Recording: ● REC                    │
└─────────────────┬────────────────────┘
                  │ Click "End Class"
                  ▼
┌──────────────────────────────────────┐
│         POST-CLASS SUMMARY           │
│  - Attendance summary chart          │
│  - Recording status                  │
│  - Engagement stats (chats, hands)   │
│  - Actions:                          │
│    [Download Report] [View Recording]│
│    [Schedule Next] [Message Absent]  │
└──────────────────────────────────────┘
```

### 10.2 Student Screen Flow

```
┌──────────────────────────────────────┐
│          STUDENT LOGIN               │
│  Phone OTP                           │
└─────────────────┬────────────────────┘
                  ▼
┌──────────────────────────────────────┐
│         STUDENT DASHBOARD            │
│  - Today's live classes list         │
│  - Class cards with status           │
│  - "Join" button (enabled 15 min)    │
│  - Upcoming class banner (countdown) │
└─────────────────┬────────────────────┘
                  │ Tap "Join" on a class
                  ▼
┌──────────────────────────────────────┐
│          WAITING ROOM                │
│  - Class info: title, teacher, time  │
│  - "Waiting for teacher to join..."  │
│  - Connection status                 │
│  - Leave button                      │
└─────────────────┬────────────────────┘
                  │ Teacher goes live
                  ▼
┌──────────────────────────────────────┐
│          LIVE CLASS SCREEN           │
│  ┌────────────────────────────────┐  │
│  │   Teacher Video (main)        │  │
│  │   Screen Share (if active)    │  │
│  │   Student count: 42           │  │
│  └────────────────────────────────┘  │
│  Controls:                            │
│  [Raise Hand] [Chat] [Leave]         │
│  [Mic] [Cam] (disabled by default)   │
│  Network: 🟢                         │
└─────────────────┬────────────────────┘
                  │ Teacher ends class
                  ▼
┌──────────────────────────────────────┐
│        CLASS ENDED OVERLAY           │
│  - "Class Ended" message             │
│  - Your attendance: 42/48 min        │
│  - Status: Present                   │
│  - [View Recording (if available)]   │
│  - [Submit Feedback]                 │
│  - [Back to Dashboard]               │
└──────────────────────────────────────┘
```

### 10.3 Admin Screen Flow

```
┌──────────────────────────────────────┐
│          ADMIN LOGIN                 │
│  Email/Password                      │
└─────────────────┬────────────────────┘
                  ▼
┌──────────────────────────────────────┐
│         ADMIN DASHBOARD              │
│  - Live Now: 3 active sessions       │
│  - Today's classes: 12               │
│  - Students online: 156              │
│  - Quick stats cards                 │
└─────────────────┬────────────────────┘
                  │ Click "View All" or specific class
                  ▼
┌──────────────────────────────────────┐
│       LIVE CLASSES LIST              │
│  - Table: title, teacher, batch,     │
│    time, status, students, actions   │
│  - Filters: date, status, teacher    │
│  - Search                            │
└─────────────────┬────────────────────┘
                  │ Click a live class row
                  ▼
┌──────────────────────────────────────┐
│       LIVE SESSION DETAIL            │
│  - Teacher info & connection status  │
│  - Live student list                 │
│  - Attendance graph                  │
│  - Engagement metrics                │
│  - Action: [Force End]               │
└─────────────────┬────────────────────┘
                  │ Click class report
                  ▼
┌──────────────────────────────────────┐
│         ATTENDANCE REPORTS           │
│  - Per-class summary                 │
│  - Per-student report                │
│  - Export CSV                        │
│  - Filters: date, teacher, batch     │
└──────────────────────────────────────┘
```

---

## 11. API Interaction Flow (Sequences)

### 11.1 Teacher Starts Class

```
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│  Teacher  │        │  Client   │        │ Supabase │        │ LiveKit  │
│   UI     │        │  Logic   │        │ Backend  │        │  Server  │
└────┬─────┘        └────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                   │                   │
     │ 1. Click          │                   │                   │
     │ "Go Live"         │                   │                   │
     ├──────────────────▶│                   │                   │
     │                   │                   │                   │
     │                   │ 2. Verify teacher │                   │
     │                   │    owns this class│                   │
     │                   ├──────────────────▶│                   │
     │                   │   GET live_classes│                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 3. Check no       │                   │
     │                   │    conflicting    │                   │
     │                   │    active session │                   │
     │                   ├──────────────────▶│                   │
     │                   │   GET live_sessions│                  │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 4. Generate        │                   │
     │                   │    LiveKit token   │                   │
     │                   ├──────────────────▶│                   │
     │                   │   Edge Function:  │                   │
     │                   │   livekit-token   │                   │
     │                   │◀──────────────────┤                   │
     │                   │   { token, url }  │                   │
     │                   │                   │                   │
     │                   │ 5. Create          │                   │
     │                   │    live_sessions   │                   │
     │                   ├──────────────────▶│                   │
     │                   │   INSERT           │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 6. Update          │                   │
     │                   │    live_classes    │                   │
     │                   ├──────────────────▶│                   │
     │                   │   status → 'live'  │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 7. Connect to      │                   │
     │                   │    LiveKit room    │                   │
     │                   ├──────────────────────────────────────▶│
     │                   │   Room.connect(url, token)            │
     │                   │◀──────────────────────────────────────┤
     │                   │   Connected                           │
     │                   │                   │                   │
     │                   │ 8. Enable camera  │                   │
     │                   │    & microphone   │                   │
     │                   ├──────────────────────────────────────▶│
     │                   │   enableCamAndMic()                   │
     │                   │◀──────────────────────────────────────┤
     │                   │                   │                   │
     │                   │ 9. Start recording│                   │
     │                   │    (if is_recorded)│                  │
     │                   ├──────────────────▶│                   │
     │                   │   API: start-     │                   │
     │                   │   egress          │                   │
     │                   │◀──────────────────┤  ┌─────────────┐  │
     │                   │                   │  │ Supabase    │  │
     │                   │ 10. Send push     │  │ Realtime    │  │
     │                   │     notification  │  │ Broadcast   │  │
     │                   │     to students   │  └─────────────┘  │
     │                   │◀──────────────────▶                   │
     │                   │   class:started   │                   │
     │                   │                   │                   │
     │ 11. Show          │                   │                   │
     │ Broadcasting UI   │                   │                   │
     │◀──────────────────┤                   │                   │
     │                   │                   │                   │
```

### 11.2 Student Joins Class

```
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│  Student  │        │  Client   │        │ Supabase │        │ LiveKit  │
│   UI     │        │  Logic   │        │ Backend  │        │  Server  │
└────┬─────┘        └────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                   │                   │
     │ 1. Tap "Join"     │                   │                   │
     ├──────────────────▶│                   │                   │
     │                   │                   │                   │
     │                   │ 2. Validate access│                   │
     │                   │    (batch check)   │                   │
     │                   ├──────────────────▶│                   │
     │                   │   GET live_class_ │                   │
     │                   │   batch WHERE     │                   │
     │                   │   student in batch│                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 3. Generate        │                   │
     │                   │    LiveKit token   │                   │
     │                   │    (student role)  │                   │
     │                   ├──────────────────▶│                   │
     │                   │   Edge Function   │                   │
     │                   │◀──────────────────┤                   │
     │                   │   { token, url }  │                   │
     │                   │                   │                   │
     │                   │ 4. Log join event  │                   │
     │                   ├──────────────────▶│                   │
     │                   │   INSERT into      │                   │
     │                   │   session_         │                   │
     │                   │   participants     │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 5. Connect to      │                   │
     │                   │    LiveKit room    │                   │
     │                   ├──────────────────────────────────────▶│
     │                   │   Room.connect(url, token)            │
     │                   │◀──────────────────────────────────────┤
     │                   │   Connected                           │
     │                   │                   │                   │
     │                   │ 6. Subscribe to    │                   │
     │                   │    teacher's tracks│                   │
     │                   ├──────────────────────────────────────▶│
     │                   │   Auto-subscribe   │                   │
     │                   │◀──────────────────────────────────────┤
     │                   │   Video + Audio    │                   │
     │                   │                   │                   │
     │                   │ 7. Join Supabase   │                   │
     │                   │    Realtime channel│                   │
     │                   ├──────────────────▶│                   │
     │                   │   Subscribe to:    │                   │
     │                   │   class:{id}       │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │ 8. Show Live      │                   │                   │
     │ Class UI          │                   │                   │
     │◀──────────────────┤                   │                   │
     │                   │                   │                   │
```

### 11.3 Teacher Ends Class

```
┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
│  Teacher  │        │  Client   │        │ Supabase │        │ LiveKit  │
│   UI     │        │  Logic   │        │ Backend  │        │  Server  │
└────┬─────┘        └────┬─────┘        └────┬─────┘        └────┬─────┘
     │                   │                   │                   │
     │ 1. Click          │                   │                   │
     │ "End Class"       │                   │                   │
     ├──────────────────▶│                   │                   │
     │                   │                   │                   │
     │                   │ 2. Confirm dialog  │                   │
     │◀──────────────────┤                   │                   │
     │                   │                   │                   │
     │ 3. Confirm        │                   │                   │
     ├──────────────────▶│                   │                   │
     │                   │                   │                   │
     │                   │ 4. Disconnect from│                   │
     │                   │    LiveKit room   │                   │
     │                   ├──────────────────────────────────────▶│
     │                   │   Room.disconnect()                   │
     │                   │◀──────────────────────────────────────┤
     │                   │                   │                   │
     │                   │ 5. Stop recording │                   │
     │                   │    (if active)    │                   │
     │                   ├──────────────────▶│                   │
     │                   │   Stop Egress     │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 6. Update          │                   │
     │                   │    live_sessions   │                   │
     │                   ├──────────────────▶│                   │
     │                   │   status → 'ended' │                   │
     │                   │   ended_at = now() │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 7. Update          │                   │
     │                   │    live_classes    │                   │
     │                   ├──────────────────▶│                   │
     │                   │   status → 'completed'               │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 8. Broadcast      │                   │
     │                   │    'class:ended'  │                   │
     │                   ├──────────────────▶│                   │
     │                   │   Realtime        │                   │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │                   │ 9. Trigger         │                   │
     │                   │    attendance      │                   │
     │                   │    computation     │                   │
     │                   ├──────────────────▶│                   │
     │                   │   RPC / Edge Func  │                   │
     │                   │◀──────────────────┤                   │
     │                   │   { summary }      │                   │
     │                   │                   │                   │
     │                   │ 10. Notify         │                   │
     │                   │     absent students│                   │
     │                   ├──────────────────▶│                   │
     │                   │   Push notification│                  │
     │                   │◀──────────────────┤                   │
     │                   │                   │                   │
     │ 11. Show Post-    │                   │                   │
     │ Class Summary     │                   │                   │
     │◀──────────────────┤                   │                   │
     │                   │                   │                   │
```

---

## 12. Error Handling

### 12.1 Error Scenarios & Expected Behavior

| # | Error Scenario | User Impact | System Behavior | Recovery |
|---|---------------|-------------|-----------------|----------|
| E-01 | **Camera permission denied** | Teacher cannot start class | Show warning with "How to enable camera" instructions. Allow class to start without video (audio-only). | Retry permissions from settings. |
| E-02 | **Microphone permission denied** | Teacher cannot start class | Show warning with fix instructions. Allow class to start without audio (video-only) — but teacher receives persistent "Mic needed" reminder. | Retry permissions from settings. |
| E-03 | **No camera/mic hardware** | Teacher cannot publish video/audio | Detect missing hardware. Start class in "audio-only" or "screen-share only" mode. Allow class to proceed. | — |
| E-04 | **Internet lost (teacher)** | Video/audio freezes for students | LiveKit auto-reconnects. 5-min grace period. Students see "Teacher disconnected" banner. After 5 min, session auto-ends. | On reconnect, session resumes. Students see "Teacher reconnected." |
| E-05 | **Internet lost (student)** | Video/audio freezes | LiveKit auto-reconnects. "Reconnecting..." overlay. Attendance event logged as disconnect/reconnect pair. Chat re-synced on reconnect. | Auto-reconnect (up to 60 sec). After 60 sec, offer "Retry" or "Leave." |
| E-06 | **LiveKit token expired** | Cannot connect to room | Token lifetime = 1 hour (configurable). If expired during long class, request new token. Edge Function returns new token if session is still active. | Auto-refresh token 5 min before expiry. |
| E-07 | **Room not found** | Cannot connect | LiveKit returns 404. Edge Function creates a new room dynamically. Retry connection. | Auto-retry with new room. |
| E-08 | **Teacher leaves mid-class (intentional)** | Session pauses | Teacher can stop broadcasting without ending class. Students see "Teacher paused" banner. Teacher can resume within 30 min. | Resume button on teacher's side. If 30 min elapses, session auto-ends. |
| E-09 | **Student leaves mid-class (intentional)** | Returns to dashboard | Attendance logged with leave time. Student can rejoin within join window. | Rejoin button on dashboard. |
| E-10 | **LiveKit server down** | No one can start/join | Frontend detects connection failure. Show "Service temporarily unavailable" message. Notify admin. All active sessions are ended with status = 'failed'. | Monitor recovery. Manual resumption of affected classes. |
| E-11 | **Supabase down** | Auth, DB, Realtime unavailable | Pre-cached session data allows in-progress classes to continue. New joins fail because auth/tokens are unavailable. | Retry with exponential backoff. Queue attendance events locally (persistence queue). |
| E-12 | **Phone locked / app backgrounded (student)** | Student disconnected | iOS: Connection drops after ~30 sec. Android: Connection may persist longer. Student needs to rejoin. | Rejoin via deep link from notification. |
| E-13 | **Browser closed (teacher)** | Session ends abruptly | `beforeunload` handler triggers disconnect. If handler fails, LiveKit detects disconnect via WebSocket close. Grace period (5 min) starts. | Reconnect from the same device within 5 min. |
| E-14 | **Authentication failure** | Cannot access class | Token validation fails on Edge Function. Show "Session expired, please login again." Redirect to login. | Re-authenticate. |
| E-15 | **Max participants reached** | Student cannot join | Show "Class is full" message. Offer "Notify me when space opens" option. | Admin can increase limit, or student waits for someone to leave. |
| E-16 | **Recording egress fails** | No recording available | Webhook reports failure. `recordings.status` → 'failed'. Teacher sees "Recording failed" warning. Log error for admin. | Manual retry from admin dashboard. |
| E-17 | **Attendance computation fails** | Attendance not available | RPC/Edge Function returns error. `attendance` table not updated. Teacher sees "Computing..." status. Retry mechanism (3 attempts). | Manual trigger from admin. |
| E-18 | **Screen sharing fails** | Cannot share screen | Browser/OS restrictions may prevent screen sharing. Show error message with troubleshooting tips. | Try different browser/OS. |

### 12.2 Error Handling Matrix by Component

| Component | Error Strategy | User Feedback |
|-----------|---------------|---------------|
| **Video Provider Abstraction** | Catch all provider errors, map to `ProviderError` enum, surface to UI | Contextual error message with retry option |
| **LiveKit Client (Room)** | Built-in reconnection with `RoomEvent.Reconnecting` | "Reconnecting..." overlay with progress indicator |
| **Token Service** | Retry (3×) with exponential backoff (1s, 2s, 4s). Fail after 3 retries. | "Failed to connect. Please try again." |
| **Attendance Logger** | Queue events locally (persistence queue). Flush on reconnect. | Transparent to user |
| **Push Notification** | Retry with backoff. Fail silently after 3 retries. | No user feedback for delivery failure |
| **Supabase Realtime** | Auto-reconnect. Missed events are re-fetched via REST API on reconnect. | Transparent to user |

---

## 13. Cross-Platform Strategy

### 13.1 Shared Backend (Identical Across Platforms)

**The backend MUST remain identical** for all platforms. Differences exist only in the UI layer.

| Component | Platform-Agnostic | Teacher Web | Student Mobile |
|-----------|:-:|:-:|:-:|
| Supabase Database (Domain 04) | ✅ Identical | — | — |
| Edge Functions (livekit-token, webhook, attendance) | ✅ Identical | — | — |
| RLS Policies | ✅ Identical | — | — |
| Video Provider Interface | ✅ Identical interface | — | — |
| Business Rules | ✅ Identical | — | — |
| UI Components | ❌ | Next.js-specific | React Native-specific |
| Video Rendering | ❌ | HTML `<video>` / `@livekit/components-react` | `@livekit/react-native` `VideoTrack` |
| Screen Sharing API | ❌ | `navigator.mediaDevices.getDisplayMedia()` | React Native `react-native-screen-share` (future) |
| Push Notifications | ❌ | Web Push API / FCM | FCM + APNS |
| Device Permissions | ❌ | Browser Permissions API | React Native Permissions |

### 13.2 Shared Video Provider Implementation

```typescript
// Interface (identical across platforms)
interface VideoProvider {
  initialize(config: ProviderConfig): Promise<void>;
  createRoom(options: CreateRoomOptions): Promise<RoomInfo>;
  joinRoom(roomName: string, token: string): Promise<void>;
  leaveRoom(): Promise<void>;
  toggleCamera(enabled: boolean): Promise<boolean>;
  toggleMicrophone(enabled: boolean): Promise<boolean>;
  startScreenShare(): Promise<void>;
  stopScreenShare(): Promise<void>;
  onRoomStateChange(callback: (state: RoomState) => void): void;
  onParticipantChange(callback: (participants: Participant[]) => void): void;
  getRoomInfo(): RoomInfo | null;
  getParticipants(): Participant[];
}
```

**Teacher Web Implementation:**
- Uses `livekit-client` (npm package)
- Renders via `@livekit/components-react` or raw `<video>` elements
- Screen sharing via `createLocalVideoTrack()` or `getDisplayMedia()`

**Student Mobile Implementation:**
- Uses `livekit-client` + `@livekit/react-native`
- Renders via `<VideoTrack>` component
- Audio configuration via `AudioSession.configureAudio()` + `InCallManager`

### 13.3 Future Student Website

When a student website is built (e.g., Next.js), it reuses:
- Same `VideoProvider` interface
- Same Edge Functions
- Same database tables
- Same business rules
- Same Supabase client configuration
- Web-specific video rendering (HTML `<video>` elements)

**Only new code needed:**
- Student-specific UI components (but similar layout to mobile)
- Screen sharing (if allowed for students)
- Web Push Notification integration

---

## 14. Video Provider Abstraction Layer

### 14.1 Why an Abstraction Layer

The current architecture has a hard dependency on LiveKit. This abstraction layer ensures that:

1. **LiveKit can be replaced** without changing UI components
2. **Multiple providers can coexist** (e.g., LiveKit for live classes, Agora for 1:1 tutoring)
3. **Future providers** can be added by implementing the interface
4. **Testing** is easier — mock providers can be used in tests

### 14.2 Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│                   UI Components                      │
│  (VideoGrid, ControlBar, ChatPanel, etc.)            │
│  Only import from lib/video/ NOT directly from       │
│  livekit-client                                      │
└──────────────────────┬──────────────────────────────┘
                       │ uses
┌──────────────────────▼──────────────────────────────┐
│            useVideoClass (React Hook)               │
│  - Wraps VideoProvider for React use                │
│  - Provides reactive state (participants, etc.)     │
│  - Maps provider events to React state              │
└──────────────────────┬──────────────────────────────┘
                       │ uses
┌──────────────────────▼──────────────────────────────┐
│           VideoProvider Interface (types.ts)         │
│  Provider-agnostic contract. All UI components       │
│  depend on this interface, not on implementations.  │
└────┬─────────────────┬─────────────────┬────────────┘
     │                 │                 │
┌────▼────┐    ┌───────▼───────┐  ┌──────▼──────┐
│LiveKit  │    │   Agora       │  │   Mock      │
│Provider │    │   Provider    │  │   Provider   │
│(current)│    │   (future)    │  │   (testing)  │
└─────────┘    └───────────────┘  └─────────────┘
```

### 14.3 Provider Configuration

```typescript
interface ProviderConfig {
  provider: 'livekit' | 'agora' | '100ms' | 'daily' | 'zoom';
  serverUrl: string;           // Provider server URL
  tokenEndpoint: string;       // Backend endpoint for token generation
  options?: {
    adaptiveStream?: boolean;  // LiveKit-specific
    dynacast?: boolean;        // LiveKit-specific
    // ... provider-specific options in their own config objects
  };
}
```

### 14.4 Adding a New Provider

To add a new provider (e.g., Agora):

1. **Implement the `VideoProvider` interface** in `lib/video/AgoraProvider.ts`
2. **Add provider config** to `providerConfigs.ts`
3. **No UI changes needed** — all components depend on the interface

---

## 15. Future Scalability

### 15.1 Provider Replaceability

| Provider | Effort to Integrate | Notes |
|----------|:-------------------:|-------|
| LiveKit | ✅ Already integrated | Current default |
| Agora | Medium (1-2 weeks) | Different SDK, similar concepts |
| 100ms | Medium (1-2 weeks) | Similar to LiveKit |
| Daily | Low (3-5 days) | Very similar API surface |
| Zoom (Zoom Video SDK) | High (3-4 weeks) | Different auth model, no WebRTC freedom |

### 15.2 Multi-Teacher / Co-Host Support

**Design:**
- `live_classes` gets an optional `co_teacher_ids` UUID array
- Co-teachers receive `teacher` role tokens (full publish rights)
- UI shows all active teachers in a grid
- Only the primary teacher can end the class

**No schema changes needed** if roles are handled at the token level.

### 15.3 Teaching Assistants

- TAs receive `moderator` role tokens
- Can moderate chat, manage raised hands, but cannot end class
- TA identity is stored in `session_participants` with `profile_id`

### 15.4 Breakout Rooms

**Design:**
- New table: `breakout_rooms` (room_id, parent_session_id, name, created_at, ended_at)
- New table: `breakout_room_participants` (room_id, participant_id, joined_at, left_at)
- Each breakout room gets its own LiveKit room name
- Teacher can create, join, and end breakout rooms
- Students in breakout rooms can raise hand to call the teacher

### 15.5 Whiteboard & Annotation

- Future integration with a whiteboard library (e.g., Excalidraw, tldraw)
- Whiteboard state synchronized via LiveKit DataChannel
- Teacher can annotate over screen share or blank canvas
- Whiteboard state can be saved as a recording snapshot

### 15.6 Polls & Live Quiz

- Teacher can launch a poll during class
- Poll data embedded in `live_sessions.metadata` (JSONB) or a new `live_polls` table
- Students respond via the mobile app
- Results are shown in real-time to the teacher
- Poll results can be persisted to `assessment` domain tables for analytics

### 15.7 Multi-Camera Support

- Teacher can switch between multiple cameras
- Only one camera is broadcast at a time
- Implemented via LiveKit's track publish/unpublish workflow

### 15.8 AI Recording & Notes

- AI transcription via LiveKit's transcription integrations or third-party services
- AI-generated class notes sent to students after class
- AI-generated summary for absent students

### 15.9 Performance & Scalability

| Concern | Current Limit | Scalability Strategy |
|---------|:------------:|---------------------|
| Concurrent live classes | 50 (LiveKit Cloud) | Move to self-hosted LiveKit server |
| Participants per class | 100 | Upgrade LiveKit tier or use selective forwarding |
| Recording storage | 100 GB | Configure S3-compatible storage with lifecycle policies |
| Edge Function invocations | 500K/month (Supabase Free) | Upgrade Supabase plan or move to dedicated server |
| Database writes (attendance events) | Throttled at 100 writes/sec | Batch writes, use connection pooling |
| Push notifications | 1K/min (FCM free) | Upgrade FCM tier or use batch sending |

---

## 16. Implementation Roadmap

### Phase 0 — Foundation (Week 1-2)

**Objective:** Prepare infrastructure and shared services before any UI work.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Write RLS policies for all live_* tables | None | Low | 1 day |
| Add `room_name` column to `live_classes` | None | Low | 0.5 day |
| Add `profile_id` to `session_participants` (nullable) | None | Low | 0.5 day |
| Create `livekit-webhook` Edge Function | LiveKit account set up | Medium | 2 days |
| Create attendance computation RPC/Edge Function | Session participants table | Medium | 2 days |
| Create `lib/video/types.ts` (provider interface) in both projects | None | Low | 1 day |

**Testing:** Unit tests for Edge Functions, SQL migration tests, integration test for webhook parsing.

### Phase 1A — Teacher Website: LiveKit Integration (Week 3-4)

**Objective:** Replace simulation-only live studio with real LiveKit connection.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Install `livekit-client` on teacher website | Phase 0 | Low | 0.5 day |
| Implement `LiveKitProvider.ts` (implements VideoProvider) | types.ts | Low | 2 days |
| Create `useVideoClass` hook for teacher | LiveKitProvider | Medium | 2 days |
| Replace Live Studio modal with LiveKit-connected studio | useVideoClass | Medium | 3 days |
| Add ControlBar (cam, mic, screen share, end) | Live Studio | Low | 1 day |
| Integrate with timetable — "Start Class" flow | Phase 0 | Medium | 2 days |
| Add recording egress trigger | livekit-webhook | Medium | 1 day |

**Testing:** Manual testing with two browser tabs (teacher + student view), connection/disconnection scenarios.

### Phase 1B — Teacher Website: Live Studio UI (Week 5-6)

**Objective:** Full-featured live studio with all panels.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Build VideoStage (main video + screen share PIP) | Phase 1A | Low | 2 days |
| Build ParticipantGrid (student video tiles) | Phase 1A | Medium | 3 days |
| Build ChatPanel (text chat + send) | Phase 1A | Low | 2 days |
| Build RaiseHandQueue (with approve/deny actions) | ChatPanel | Medium | 2 days |
| Build AttendancePanel (live student list) | Phase 1A | Low | 1 day |
| Build post-class summary view | Phase 0 | Low | 2 days |
| Integrate recording status indicator | Phase 1A | Low | 1 day |

**Testing:** UI component testing, keyboard navigation, accessibility audit.

### Phase 1C — Student App: Production Integration (Week 5-7, parallel with 1B)

**Objective:** Replace POC screens with production-ready live class experience.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Refactor `useLiveKit` → abstract behind `useVideoProvider` | Phase 0 types.ts | Medium | 2 days |
| Create `LiveClassListScreen` (today's classes) | Phase 0 DB queries | Low | 2 days |
| Create `WaitingRoomScreen` | Phase 0 | Low | 1 day |
| Create production `LiveClassScreen` (replace POC LiveRoom) | useVideoProvider | Medium | 3 days |
| Create production `ControlBar` (with raise hand, chat) | LiveClassScreen | Low | 1 day |
| Add attendance join/leave event logging | Phase 0 RPC | Medium | 2 days |
| Add reconnection UI (Reconnecting... overlay) | LiveClassScreen | Low | 1 day |
| Remove POC screens (JoinRoom, old LiveRoom) | After integration | Low | 0.5 day |

**Testing:** Device testing (iOS + Android), network condition simulation, permission testing.

### Phase 2A — Notifications & Realtime (Week 8-9)

**Objective:** Complete notification and realtime synchronization.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Build push notification sender (Edge Function) | user_device_tokens table | Medium | 2 days |
| Implement 15-min and 5-min class reminder scheduling | Phase 1C | Low | 1 day |
| Implement "class started" push notification | Phase 1A | Low | 1 day |
| Implement "class cancelled" push notification | Phase 1A | Low | 0.5 day |
| Implement "recording available" push notification | Phase 1A | Low | 1 day |
| Implement Supabase Realtime channels for class events | Phase 0 | Medium | 2 days |
| Add in-app notification center | Phase 1C | Low | 2 days |

**Testing:** Push notification delivery testing (FCM/APNS), notification click deep link testing.

### Phase 2B — Attendance & Reports (Week 9-10)

**Objective:** Complete attendance tracking and reporting.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Finalize attendance computation Edge Function | Phase 0 | Low | 1 day |
| Build attendance report view (teacher) | Phase 1B | Low | 2 days |
| Build attendance report download (CSV) | Attendance | Low | 1 day |
| Build per-student attendance history (student app) | Phase 1C | Low | 2 days |
| Build attendance override (teacher) | Attendance | Low | 1 day |
| Build admin attendance reports | Admin dashboard | Medium | 2 days |

**Testing:** Edge case testing (late join, multiple reconnects, etc.), CSV export format validation.

### Phase 2C — Admin Dashboard (Week 10-11)

**Objective:** Admin monitoring and management interface.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Build admin live classes list view | Phase 0 | Low | 2 days |
| Build active session detail view | Phase 1A | Medium | 2 days |
| Build admin attendance reports | Phase 2B | Low | 1 day |
| Build recording management UI | Phase 1A | Low | 2 days |
| Build session logs/audit trail | Phase 0 | Low | 1 day |
| Build analytics dashboard (peak usage, engagement) | All data available | Medium | 3 days |

**Testing:** Permission boundary testing, data accuracy validation.

### Phase 3 — Advanced Features (Week 12-14)

**Objective:** Feature parity and platform maturity.

| Task | Dependencies | Risk | Effort |
|------|-------------|:----:|:------:|
| Screen sharing (teacher website) | Phase 1A | Low | 2 days |
| Raise hand flow (teacher approve/student unpublish) | Phase 1B, 1C | Medium | 3 days |
| In-class polling | Phase 1A, 1C | Medium | 4 days |
| Recording playback UI (student app) | Phase 2A | Low | 2 days |
| Recording playback UI (teacher website) | Phase 2A | Low | 1 day |
| Student feedback/submit after class | Phase 1C | Low | 1 day |
| Network quality indicators (detailed) | Phase 1A, 1C | Low | 1 day |

**Testing:** Full end-to-end testing, load testing, security audit.

### Phase 4 — Future & Scale (Future Releases)

| Task | Priority | Notes |
|------|:--------:|-------|
| Agora/Daily/Zoom provider implementation | Medium | When business requires |
| Breakout rooms | Medium | Requires LiveKit DataChannel work |
| Whiteboard/annotation | Low | Third-party integration |
| Multi-camera support | Low | Edge case |
| AI transcription & notes | Low | Third-party AI integration |
| Student website (Next.js) | Medium | Reuses all backend, new UI only |
| Co-host / Teaching Assistant support | Medium | Schema changes needed |
| Self-hosted LiveKit server | Medium | For cost optimization at scale |

### Implementation Dependency Graph

```
Phase 0 (Foundation)
  │
  ├──▶ Phase 1A (Teacher LiveKit) ──▶ Phase 1B (Teacher Studio UI)
  │                                        │
  │                                        └──▶ Phase 2B (Attendance) ──▶ Phase 2C (Admin)
  │
  └──▶ Phase 1C (Student App) ──▶ Phase 2A (Notifications + Realtime)
                                       │
                                       └──▶ Phase 3 (Advanced Features)
```

---

## Appendix A: Key Assumptions

1. **LiveKit Cloud** is used for Phase 1. Self-hosting can be evaluated later.
2. **Supabase Edge Functions** are used for server-side logic. If rate limits are hit, migrate to a dedicated backend.
3. **Each class has exactly one teacher** and one `live_sessions` record.
4. **Attendance is computed post-class**, not in real-time (except for the live counter shown during class).
5. **Push notifications require FCM** on Android and **APNS** on iOS. Web push is not in scope for Phase 1.
6. **Students default to subscriber-only** (cannot publish video/audio) unless teacher approves raise hand.

## Appendix B: Open Questions for Engineering

1. Should we pre-create LiveKit rooms at schedule time for faster "Go Live" experience?
2. Should attendance computation be an Edge Function or a database RPC?
3. Should recordings be stored in LiveKit's built-in Egress or custom pipeline?
4. Should chat be persisted to the database or only available during the live session?
5. Should we support class join via deep link from SMS/WhatsApp?

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **SFU** | Selective Forwarding Unit — server that routes video/audio streams |
| **Egress** | LiveKit's recording/streaming output pipeline |
| **DataChannel** | WebRTC channel for sending arbitrary data (chat, events) apart from audio/video |
| **RLS** | Row-Level Security — Supabase's per-row permission system |
| **PIP** | Picture-in-Picture — a small overlay video window |
| **RPC** | Remote Procedure Call — database function callable from client |
| **JWT** | JSON Web Token — used for LiveKit authentication |
| **FCM** | Firebase Cloud Messaging — Android push notifications |
| **APNS** | Apple Push Notification Service — iOS push notifications |
