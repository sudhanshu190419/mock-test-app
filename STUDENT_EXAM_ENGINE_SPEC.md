# Student Exam Engine Specification

> **Document Version:** 1.0  
> **Target Quality:** Physics Wallah, Unacademy, Allen Digital, Aakash BYJU'S, ExamGoal  
> **Stack:** React Native (TypeScript) · Supabase (PostgreSQL 16) · Edge Functions  
> **Status:** Architecture & Design Specification  

---

## Table of Contents

1. [Exam Assignment](#1-exam-assignment)
2. [Availability Rules](#2-availability-rules)
3. [Attempt Limits](#3-attempt-limits)
4. [Resume Rules](#4-resume-rules)
5. [Timer & Time Synchronization](#5-timer--time-synchronization)
6. [Question Loading](#6-question-loading)
7. [Question Palette](#7-question-palette)
8. [Question Navigation](#8-question-navigation)
9. [Answer Selection](#9-answer-selection)
10. [Autosave](#10-autosave)
11. [Background Sync](#11-background-sync)
12. [Offline Cache](#12-offline-cache)
13. [Network Recovery](#13-network-recovery)
14. [Image Questions](#14-image-questions)
15. [Bookmarks](#15-bookmarks)
16. [Mark for Review](#16-mark-for-review)
17. [Clear Response](#17-clear-response)
18. [Question Status](#18-question-status)
19. [Section Navigation](#19-section-navigation)
20. [Progress Tracking](#20-progress-tracking)
21. [Submit Flow](#21-submit-flow)
22. [Auto Submit](#22-auto-submit)
23. [Result Generation](#23-result-generation)
24. [Negative Marking](#24-negative-marking)
25. [Partial Marking](#25-partial-marking)
26. [Evaluation](#26-evaluation)
27. [Leaderboard](#27-leaderboard)
28. [Analytics](#28-analytics)
29. [Rank & Percentile](#29-rank--percentile)
30. [Detailed Solution Review](#30-detailed-solution-review)
31. [Performance Charts](#31-performance-charts)
32. [Topic Analysis](#32-topic-analysis)
33. [Chapter Analysis](#33-chapter-analysis)
34. [Subject Analysis](#34-subject-analysis)
35. [Attempt History](#35-attempt-history)
36. [Reattempt Rules](#36-reattempt-rules)
37. [Security & Cheating Prevention](#37-security--cheating-prevention)
38. [Clock Manipulation Prevention](#38-clock-manipulation-prevention)
39. [Session Expiry](#39-session-expiry)
40. [Multiple Devices](#40-multiple-devices)
41. [App Kill Recovery](#41-app-kill-recovery)
42. [Token Refresh](#42-token-refresh)
43. [Performance & Caching](#43-performance--caching)
44. [Lazy Loading & Prefetching](#44-lazy-loading--prefetching)
45. [Memory Optimization](#45-memory-optimization)
46. [Battery Optimization](#46-battery-optimization)
47. [Large Test Handling (1000+ Questions)](#47-large-test-handling-1000-questions)
48. [Accessibility](#48-accessibility)
49. [Dark Mode](#49-dark-mode)
50. [Landscape & Tablet Support](#50-landscape--tablet-support)
51. [Internationalization](#51-internationalization)
52. [Push Notifications](#52-push-notifications)
53. [Background Tasks](#53-background-tasks)
54. [Crash Recovery](#54-crash-recovery)
55. [Monitoring & Logging](#55-monitoring--logging)
56. [Scalability](#56-scalability)
57. [Future Features](#57-future-features)
58. [Implementation Priority Order](#58-implementation-priority-order)

---

## 1. Exam Assignment

### Purpose
Define how exams are assigned to students — manually by teachers, automatically by the system via batch enrollment, or through self-purchase of PYQ packs.

### UX
- **Assigned Tab** (Dashboard): Shows tests assigned by teachers/auto-assigned. Badge shows count of new/available tests.
- **Purchase Tab**: Shows PYQ packs and mock test bundles the student can unlock.
- **Card Layout**: Each test card shows title, duration, questions count, marks, deadline, and attempt status.

### Backend Dependency
- `mock_tests` table with `status = 'published'`
- Batch-test assignments via `batch_test_mappings` (or `mock_tests.batch_id`)
- `student_pyq_purchases` for self-purchased packs
- `student_test_assignments` for individual assignments

### Database Tables
- `mock_tests` — test metadata
- `student_test_assignments` — individual student ↔ test link
- `batch_students` + `mock_tests.batch_id` — batch-wide assignments
- `student_pyq_purchases` — purchased pack access
- `mock_attempts` — to check if already attempted

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get assigned tests | GET | `/api/tests/assigned` | List tests assigned to student |
| Get available packs | GET | `/api/packs/available` | List PYQ packs student can purchase |
| Get test detail | GET | `/api/tests/:testId` | Full test metadata + instructions |

### Client State
- `assignedTests: MockTest[]` — tests fetched at dashboard mount
- `availablePacks: PyqPack[]` — packs available for purchase
- `attemptedTestIds: Set<string>` — test IDs already attempted (derived from attempt history)

### Server State
- React Query cache with key `['assigned-tests', studentId]`
- Stale time: 30 seconds (re-fetched on dashboard focus)
- Invalidated after completing an attempt

### Offline Strategy
- Cache last-fetched assigned test list in AsyncStorage
- Show cached data when offline with "offline" indicator
- Allow navigation to test instructions only if test metadata is cached

### Edge Cases
- Student was removed from batch after assignment → test disappears on next sync
- Test was archived after assignment → show "Test Unavailable" with reason
- Student already reached max attempts → show "Attempted" badge

### Failure Scenarios
- API timeout → retry with exponential backoff (3 attempts)
- 500 error → show "Something went wrong" with retry button
- 403 → student not authorized for this test

### Recovery Strategy
- Poll for new assignments every 60 seconds while on dashboard
- Pull-to-refresh to force reload

### Testing Checklist
- [ ] Batch-assigned tests appear correctly
- [ ] Individually assigned tests appear correctly
- [ ] Purchased PYQ packs appear correctly
- [ ] Archived tests show correct message
- [ ] Max-attempted tests show correct badge
- [ ] Pull-to-refresh re-fetches assignments

### Acceptance Criteria
- Student sees all published tests they are entitled to
- Attempted/max-attempted tests are clearly distinguished
- Test list updates within 30 seconds of teacher assignment

### Performance Requirements
- Initial load < 1.5 seconds (with 50 tests)
- FlatList with pagination (20 per page)
- Skeleton loading state during fetch

---

## 2. Availability Rules

### Purpose
Control when a test can be started and completed based on `availableFrom`, `availableUntil`, and `durationMin`.

### UX
- **Before availableFrom**: Show "Available from [date]" with countdown
- **Within window**: Show "Start Test" button
- **After availableUntil**: Show "Expired" with date
- **Ongoing attempt**: Show "Resume" button (see Resume Rules)

### Backend Dependency
- `mock_tests.availableFrom` (TIMESTAMPTZ, nullable)
- `mock_tests.availableUntil` (TIMESTAMPTZ, nullable)
- Server-side validation on attempt creation

### Database Tables
- `mock_tests` — availability columns
- `mock_attempts` — to check existing in-progress attempts

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Check availability | GET | `/api/tests/:testId/availability` | Returns window status + server time |

### Client State
- `serverTimeOffset: number` — difference between client and server time (critical for timer sync)
- `availabilityStatus: 'upcoming' | 'available' | 'expired' | 'in-progress'`

### Server State
- Server clock is canonical. Client always compares against `serverTimeOffset`.
- `availableFrom` and `availableUntil` use UTC timestamps.

### Offline Strategy
- Cache availability status when last fetched
- If offline when test window opens, show cached status (may be stale)
- Block test start when offline (to prevent clock cheating)

### Edge Cases
- Test has no `availableFrom`/`availableUntil`: always available
- Student starts test 1 second before `availableUntil`: full duration granted (no truncation)
- Timezone differences: all timestamps are UTC, display in local timezone

### Sequence Diagram

```
Client                          Server
  |                               |
  |--- GET /tests/:id/avail ----->|
  |<--- { availableFrom,          |
  |       availableUntil,         |
  |       serverTime,             |
  |       status }                |
  |                               |
  | Calculate serverTimeOffset    |
  | Check status locally          |
  |                               |
  | [Show Start/Resume/Expired]   |
```

### Failure Scenarios
- Server time not reachable → use last known offset or block start
- Clock drift > 30 seconds → warn user and block test start

### Recovery Strategy
- Re-check availability on app foreground
- Periodic server time sync (every 60 seconds on dashboard)

### Testing Checklist
- [ ] Test before window shows "Available from X"
- [ ] Test within window shows "Start Test"
- [ ] Test after window shows "Expired"
- [ ] No expiry dates = always available
- [ ] Starts 1 second before expiry grants full duration

### Acceptance Criteria
- Students cannot start tests outside the availability window
- Server clock is authoritative — client clock manipulation cannot extend the window
- Clear visual indicators for each availability state

---

## 3. Attempt Limits

### Purpose
Enforce the maximum number of attempts per student per test, as defined by `mock_tests.attemptLimit`.

### UX
- **Unlimited** (`attemptLimit = NULL`): "Start Test" always available
- **Limited + attempts remaining**: "Start Test (Attempt X of Y)"
- **Max reached**: "Used All Attempts" with disabled button, link to attempt history

### Backend Dependency
- `mock_tests.attemptLimit` (INTEGER, nullable)
- COUNT query on `mock_attempts` for this student + test
- Server-side rejection on attempt creation if limit reached

### Database Tables
- `mock_tests` — attempt limit column
- `mock_attempts` — count rows where `studentId = X AND testId = Y`

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get attempt count | GET | `/api/tests/:testId/attempts/count` | Returns remaining attempts |

### Client State
- `remainingAttempts: number` — derived from count vs limit
- `attemptsExhausted: boolean`

### Offline Strategy
- Cache last known remaining attempts
- Block new attempt creation when offline (could allow limit bypass)
- Allow viewing past attempt results from cache

### Edge Cases
- Admin resets attempt count → student must pull-to-refresh
- Attempt was abandoned (no submission) — does it count? → Yes, after timeout grace period
- Draft attempt was deleted by admin → re-count on next load

### Failure Scenarios
- Attempt creation rejected → show "Maximum attempts reached" toast

### Testing Checklist
- [ ] Unlimited attempts allow infinite starts
- [ ] Limited attempts decrement correctly
- [ ] Attempts exhausted blocks new starts
- [ ] Abandoned attempts count toward limit after timeout
- [ ] Admin reset of limit re-enables test

### Acceptance Criteria
- Students cannot exceed `attemptLimit`
- Remaining attempts are clearly displayed
- Past attempts are reviewable even after exhausting limit

---

## 4. Resume Rules

### Purpose
Allow students to resume an in-progress attempt if they navigated away, app was killed, or session expired.

### UX
- Dashboard shows "Resume" button for in-progress tests
- On resume: restore to exact question, timer, and answers as last auto-save
- If timer expired while away → show "Time's Up" screen on resume

### Backend Dependency
- `mock_attempts.timeRemainingSeconds` — last known timer value
- `mock_answers` — last saved answers per question
- Server-side attempt status check on resume

### Database Tables
- `mock_attempts` — status, timeRemainingSeconds, updatedAt
- `mock_answers` — isAnswered, isMarkedForReview, selectedOption, timeSpentSeconds

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Resume attempt | GET | `/api/attempts/:attemptId/resume` | Returns full attempt state |
| Create new attempt | POST | `/api/attempts` | Start fresh attempt |

### Resume Response Schema

```typescript
interface ResumeResponse {
  attemptId: string;
  status: AttemptStatus; // 'in_progress' | 'submitted' | 'timed_out'
  timeRemainingSeconds: number;
  currentQuestionIndex: number;
  answers: Array<{
    questionIndex: number;
    questionId: string;
    selectedOptionId: string | null;
    isMarkedForReview: boolean;
    isAnswered: boolean;
    timeSpentSeconds: number;
  }>;
  questions: QuestionSnapshot[]; // frozen at publish time
  sections: SubjectSection[];
}
```

### Client State
- Full attempt state restored from server
- Timer set to `timeRemainingSeconds`
- Answers map rebuilt from server response
- Current question index restored

### Server State
- React Query key `['attempt', attemptId]`
- Stale time: 0 (always fetch fresh on resume)

### Offline Strategy
- If in-progress attempt exists locally but server is unreachable → resume from local cache
- On next online sync, reconcile with server state

### Edge Cases
- Student resumes on different device → see Multiple Devices section
- Student resumes after app kill during auto-save → timer deducted based on server clock
- Student resumes after `availableUntil` → allow to finish if timer still running (grace period)
- attempt was submitted from another device → show "Already Submitted" screen

### Sequence Diagram

```
Client                    Server
  |                         |
  |--- GET /attempts/:id -->|
  |<-- ResumeResponse ------| (status: in_progress)
  |                         |
  | Restore state locally   |
  | Resume timer            |
  |                         |
  | [Student continues]     |
```

### Failure Scenarios
- Attempt not found (deleted/expired) → show "Attempt Unavailable"
- Student ID mismatch → security error, log + block

### Recovery Strategy
- On resume failure, allow starting new attempt if within limits
- Log resume failures for debugging

### Testing Checklist
- [ ] Resume restores exact question and answers
- [ ] Timer resumes correctly (accounting for elapsed server time)
- [ ] Resume after app kill restores state
- [ ] Resume after timer expiry shows "Time's Up"
- [ ] Resume on different device works

### Acceptance Criteria
- Students never lose progress — every resume restores the exact state
- Timer cannot be cheated by repeatedly resuming
- Resume is seamless (< 2 seconds load)

---

## 5. Timer & Time Synchronization

### Purpose
Provide an accurate, cheat-resistant countdown timer that works offline and syncs with the server.

### UX
- Header: Display formatted time (HH:MM:SS or MM:SS)
- Color transitions:
  - Normal: dark text
  - Warning (< 5 min): amber/orange with gentle pulse animation
  - Critical (< 1 min): red with stronger pulse + "Hurry up!" text
- On expiry: auto-submit (see Auto Submit)

### Backend Dependency
- `mock_attempts.timeRemainingSeconds` — authoritative timer value
- Server-side timeout validation on submit (server recalculates elapsed time)
- Timer sync heartbeat endpoint

### Database Tables
- `mock_attempts.timeRemainingSeconds` — updated via heartbeat
- `mock_attempts.status` — transitions to `timed_out` via edge function

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Sync timer | POST | `/api/attempts/:id/sync-timer` | Send current client timer value |
| Get server time | GET | `/api/time` | Get authoritative server timestamp |

### Client State (useTestTimer hook)
```typescript
interface TimerState {
  timeRemaining: number;       // seconds
  formattedTime: string;
  isPaused: boolean;
  progress: number;            // 0–1
  isSynced: boolean;           // timer has been synced with server
  warningLevel: 'normal' | 'warning' | 'critical';
}
```

### Timer Architecture

```
┌─────────────────────────────────────────────────┐
│                  Timer Engine                     │
│                                                   │
│  useTestTimer(initialSeconds, onTimeUp)           │
│                                                   │
│  ┌──────────────┐    ┌──────────────────┐        │
│  │  setInterval  │    │  useRef(callback) │        │
│  │  (1000ms)     │    │  (no stale closure)│       │
│  └──────┬───────┘    └──────────────────┘        │
│         │                                         │
│         ▼                                         │
│  ┌──────────────┐                                 │
│  │  State:       │    ┌──────────────────┐        │
│  │  timeRemaining│───►│  useEffect       │        │
│  │  isPaused     │    │  (timeRemaining  │        │
│  └──────────────┘    │   === 0 → fire)   │        │
│                      └──────────────────┘        │
│                                                   │
│  ┌──────────────────────────────────────┐        │
│  │  Background Timer                    │        │
│  │  AppState 'background' → pause timer │        │
│  │  AppState 'active' → resume + sync   │        │
│  └──────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
```

### Time Synchronization Flow

```
Start Test:
  1. Client gets server time via GET /api/time
  2. Client calculates offset = serverTime - clientTime
  3. Timer starts with initial duration from server
  4. Timer ticks down client-side

Heartbeat (every 60 seconds):
  1. POST /api/attempts/:id/sync-timer { timeRemaining }
  2. Server calculates expected = initialDuration - (serverNow - startedAt)
  3. If client timeRemaining deviates by > 5 seconds:
     - Server returns corrected timeRemaining
     - Client adjusts timer to server value
     - Flag "timer corrected" event for analytics

On Submit:
  1. Client sends final timeRemaining
  2. Server independently computes elapsed time using server clock
  3. If discrepancy > 30 seconds: flag for review (possible cheating)
  4. Server value is authoritative for result
```

### Offline Strategy
- Timer continues ticking offline
- Sync failures are queued and retried when online
- On reconnection: server may correct the timer if client drifted
- Maximum offline grace period: 30 seconds of drift allowed

### Edge Cases
- Device falls asleep → timer pauses via AppState listener
- Device time changed manually → drift detection catches it
- Network glitch causes late heartbeat → no action needed (best-effort)
- Student switches apps → timer continues but syncs on return

### Failure Scenarios
- Heartbeat fails → queue for retry, continue client timer
- Server rejects timer value → adjust to server value, log warning
- Extended offline (> 5 min) → timer continues but submit may be flagged

### Recovery Strategy
- On heartbeat success: clear any adjustment flags
- On reconnection after extended offline: immediate sync
- Force sync on every question navigation

### Testing Checklist
- [ ] Timer counts down correctly (1 second per second)
- [ ] Timer pauses/resumes correctly
- [ ] Warning threshold triggers at 5 minutes
- [ ] Critical threshold triggers at 1 minute
- [ ] Auto-submit fires at zero
- [ ] Heartbeat syncs timer correctly
- [ ] Timer drift > 5 seconds is corrected
- [ ] Timer continues after app background/foreground
- [ ] Manual time change does not affect total duration
- [ ] Auto-submit works when offline

### Acceptance Criteria
- Timer accuracy within ±1 second over 3 hours
- Clock manipulation does not extend test duration
- Student never loses more than 5 seconds of timer due to sync issues
- Auto-submit always fires, even offline

### Performance Requirements
- Timer tick: no re-renders on parent components (use useRef + targeted state update)
- Heartbeat: maximum 500ms latency budget
- Timer correction: no visual jumps (smooth transition)

---

## 6. Question Loading

### Purpose
Load questions for the test attempt from the frozen snapshot efficiently, supporting large tests (1000+ questions).

### UX
- After starting/resuming: show full-screen loading state with progress indicator
- Questions appear as a flat list backed by the snapshot
- Each question renders the stem + options from the snapshot

### Backend Dependency
- `mock_test_questions.questionSnapshot` — JSONB frozen at publish time
- `mock_tests.shuffleQuestions` — randomization flag
- `mock_tests.shuffleOptions` — option randomization flag

### Database Tables
- `mock_test_questions` — junction table with snapshot

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Load questions | GET | `/api/attempts/:id/questions` | Get all questions for this attempt (from snapshot) |
| Load single question | GET | `/api/attempts/:id/questions/:questionIndex` | Lazy-load single question (for 1000+) |

### Client State
- `questions: QuestionDisplay[]` — all questions in memory (or paginated for 1000+)
- `currentQuestion: QuestionDisplay` — currently displayed question
- `isLoadingQuestions: boolean`

### Server State
- React Query key `['attempt', attemptId, 'questions']`
- Stale time: Infinity (snapshot is immutable, never refetches)
- Cache permanently in memory during attempt

### Offline Strategy
- Cache full question list locally at attempt start
- If offline after start, questions are already loaded
- Prevents offline start of new attempts

### Sequence Diagram

```
Attempt Start:
Client                    Server
  |                         |
  |--- POST /attempts ----->|  (create attempt)
  |<-- { attemptId } ------ |
  |                         |
  |--- GET /attempts/:id --->|  (resume if exists)
  |<-- { state + questions }|
  |                         |
  | Apply shuffle (client)  |
  | |                      |
  | Render question 1      |
```

### Edge Cases
- Question snapshot is missing (draft not published) → show error, cannot start
- Question references deleted images → show placeholder, log error
- Shuffle seeds differ → NO! Shuffle seed is deterministic (attemptId)

### Shuffle Algorithm (Deterministic)

```typescript
function shuffleQuestions<T>(items: T[], seed: string): T[] {
  // Seeded PRNG using attemptId + testId
  const rng = seedRandom(seed);
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleOptions(options: Option[], seed: string): Option[] {
  // Use attemptId + questionId as seed
  // Ensures same student sees same option order on resume
  return shuffleQuestions(options, seed);
}
```

### Failure Scenarios
- Question snapshot corrupted → fallback to live `questions` table (with warning)
- Network fails on initial load → show retry screen (cannot attempt offline)

### Recovery Strategy
- Retry load with exponential backoff (3 attempts)
- If all retries fail → allow resume from local cache if exists

### Testing Checklist
- [ ] Questions load from snapshot correctly
- [ ] Shuffle produces different order for different attempts
- [ ] Same shuffle order on resume
- [ ] Options shuffle consistently on resume
- [ ] Empty test (0 questions) shows message

### Acceptance Criteria
- Questions load within 2 seconds for 300 questions
- Shuffle is deterministic and consistent on resume
- Snapshot immutability ensures all students see the same questions

### Performance Requirements
- 300 questions: load < 2 seconds
- 1000+ questions: lazy-load with window size of 50
- Shuffle 1000 items: < 50ms (computed in web worker if needed)

---

## 7. Question Palette

### Purpose
Provide an interactive overview of all questions with status indicators, enabling quick navigation and section filtering.

### UX
- **Desktop**: Side panel (right 1/3 of screen) with palette always visible
- **Mobile**: Modal overlay that slides up from bottom
- **Status colors**:
  - ⬜ White/Outline: Not visited
  - 🟢 Green fill: Answered
  - 🟣 Purple fill: Marked for Review
  - 🟣 Purple + border: Answered + Marked for Review
  - 🔵 Blue fill: Current question
- **Section tabs**: Filter palette by section/subject
- **Question count**: Shows answered/total per section
- **Submit button**: At bottom of palette (triggers confirm dialog)

### Backend Dependency
- `mock_answers` — sources of truth for status
- `mock_test_questions.sectionName` — section grouping

### Database Tables
- `mock_answers.isAnswered`
- `mock_answers.isMarkedForReview`
- `mock_test_questions.sectionName`

### Required APIs
- No separate API — status is derived from local answers state and synced answers

### Client State
- `answeredIndices: Set<number>` — derived from selectedOption map
- `markedForReviewIndices: Set<number>`
- `visitedIndices: Set<number>`
- `currentIndex: number`
- `activeSubject: string | null` — current section filter

### Server State
- Synced via autosave (see Autosave section)

### Palette Component Structure

```
┌──────────────────────────────┐
│  Question Palette            │
│                              │
│  ┌─────────────────────┐    │
│  │ Section Tabs         │    │
│  │ [Physics][Chemistry] │    │
│  │ [Mathematics]        │    │
│  └─────────────────────┘    │
│                              │
│  ┌───┬───┬───┬───┬───┐     │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │     │  ← Grid of numbered buttons
│  ├───┼───┼───┼───┼───┤     │     with status colors
│  │ 6 │ 7 │ 8 │ 9 │10 │     │
│  ├───┼───┼───┼───┼───┤     │
│  │11 │12 │13 │14 │15 │     │
│  └───┴───┴───┴───┴───┘     │
│                              │
│  Legend:                     │
│  ● Answered  ● Not Visited  │
│  ● Marked for review        │
│                              │
│  Answered: 15/30             │
│                              │
│  [Submit Test]               │
└──────────────────────────────┘
```

### Offline Strategy
- Palette is fully client-side (no server dependency)
- All state updates are local and queued for sync

### Edge Cases
- Section with 0 questions → hide section tab
- All questions answered → "Answered: All" with green header
- Palette open while timer expires → auto-close palette, show submit dialog

### Failure Scenarios
- N/A (palette is local state only)

### Testing Checklist
- [ ] All status colors display correctly
- [ ] Section filter works correctly
- [ ] Palette scrollable for many questions (>30)
- [ ] Mobile modal opens/closes smoothly
- [ ] Legend matches actual statuses
- [ ] Answered count updates in real-time

### Acceptance Criteria
- Student can see all question statuses at a glance
- Navigation via palette is instant (< 100ms)
- Section filtering accurately groups questions

### Performance Requirements
- Render 100+ palette buttons: < 50ms
- Status updates reflected immediately (< 16ms frame budget)

---

## 8. Question Navigation

### Purpose
Allow students to move between questions using Previous/Next buttons, palette, and keyboard shortcuts (desktop).

### UX
- **Previous button**: Left side of action bar (disabled on question 1)
- **Save & Next button**: Right side of action bar
- **Palette**: Tap any question number to navigate
- **Desktop keyboard**: Left/Right arrow keys
- **Auto-scroll**: Scroll to top of question card on navigation

### Backend Dependency
- Navigation events logged for analytics
- Time-spent tracking per question

### Database Tables
- `mock_answers.timeSpentSeconds` — incremented on navigation away

### Required APIs
- N/A (navigation is client-side)

### Client State
- `currentIndex: number` — 0-based index
- Navigation handlers calculate new index, scroll position

### Navigation Logic

```typescript
function handleNavigate(index: number) {
  // 1. Save time spent on current question
  recordTimeSpent(currentIndex, elapsedTime);
  
  // 2. Mark as visited
  markVisited(index);
  
  // 3. Update currentIndex
  setCurrentIndex(index);
  
  // 4. Scroll to top
  scrollRef.current?.scrollTo({ y: 0, animated: false });
  
  // 5. Trigger autosave
  triggerAutosave();
}
```

### Offline Strategy
- Navigation is fully offline-capable
- Time-spent records are queued for sync

### Edge Cases
- Navigate to question that hasn't loaded yet (lazy loading) → show skeleton, load
- Navigate away before autosave completes → last known state is preserved
- Navigate during submit → block navigation
- Palette navigation while timer expired → blocked (submit only)

### Testing Checklist
- [ ] Previous/Next navigation works correctly
- [ ] Palette navigation works correctly
- [ ] Scroll resets to top on navigation
- [ ] Time spent tracked correctly on navigation away
- [ ] Navigation blocked after submit

### Acceptance Criteria
- Navigation is instant (< 50ms UX response)
- No visual flicker or layout shift during navigation
- Keyboard shortcuts work on desktop

---

## 9. Answer Selection

### Purpose
Enable students to select/deselect answers for different question types: MCQ, MSQ, True/False, Numerical.

### UX
- **MCQ**: Radio buttons — exactly one selectable
- **MSQ**: Checkboxes — multiple selectable, deselectable
- **True/False**: Two radio buttons (True/False)
- **Numerical**: Text input with numeric keyboard
- **Selected state**: Green border + filled radio/check

### Backend Dependency
- `mock_answers.isAnswered` — set TRUE when at least one option selected
- `mock_answer_options` — junction table for selected options
- `mock_answers.numericalAnswer` — for numerical type

### Database Tables
- `mock_answers` — answer state
- `mock_answer_options` — selected options (MCQ: 1, MSQ: many)

### Required APIs
- `POST /api/attempts/:id/answers` — save answer selection

### Client State
- `selectedOption: Record<number, string | null>` — for MCQ and TF
- `selectedOptions: Record<number, string[]>` — for MSQ
- `numericalAnswers: Record<number, number | null>` — for numerical

### Selection Logic

```typescript
function handleOptionSelect(questionIndex: number, optionId: string) {
  const question = questions[questionIndex];
  
  switch (question.questionType) {
    case 'mcq':
    case 'true_false':
      // Toggle: if same option, deselect; otherwise select
      if (selectedOption[questionIndex] === optionId) {
        setSelectedOption(prev => ({ ...prev, [questionIndex]: null }));
      } else {
        setSelectedOption(prev => ({ ...prev, [questionIndex]: optionId }));
      }
      break;
      
    case 'msq':
      // Toggle in array
      setSelectedOptions(prev => {
        const current = prev[questionIndex] || [];
        const exists = current.includes(optionId);
        return {
          ...prev,
          [questionIndex]: exists
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      });
      break;
      
    case 'numerical':
      // Handled by text input
      setNumericalAnswers(prev => ({
        ...prev,
        [questionIndex]: parseFloat(value) || null,
      }));
      break;
  }
  
  triggerAutosave();
}
```

### Offline Strategy
- Answer selection is fully local
- Synced to server via autosave

### Edge Cases
- Student selects answer then clears (Clear Response)
- MSQ: select all options then deselect all → isAnswered = FALSE
- Numerical: type non-numeric characters → filter to numeric only
- Rapid selection changes → debounce autosave

### Testing Checklist
- [ ] MCQ: selecting deselects previous
- [ ] MCQ: tapping same option deselects
- [ ] MSQ: multiple selection works
- [ ] MSQ: deselect individual options
- [ ] TF: two options only, mutually exclusive
- [ ] Numerical: keyboard is numeric-only
- [ ] Numerical: decimal input works
- [ ] Numerical: negative values allowed
- [ ] isAnswered set correctly for all types

### Acceptance Criteria
- All question types are fully functional
- Selection state persists correctly through navigation and resume
- No accidental deselection on navigation

---

## 10. Autosave

### Purpose
Persist student answers to the server automatically at regular intervals and on key events, preventing data loss.

### UX
- **Indicator**: Small "Saving..." text in header, replaced by "Saved" checkmark
- **On error**: "Save failed" toast with retry option
- **Transparent**: No blocking UI during save

### Backend Dependency
- `mock_answers` table — update or insert per question
- `mock_answer_options` table — manage selected options

### Database Tables
- `mock_answers` — answer state
- `mock_answer_options` — selected options

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Save answers | POST | `/api/attempts/:id/autosave` | Batch save all changed answers |

### Autosave Strategy

```typescript
// Triggered by:
// 1. Timer interval: every 30 seconds
// 2. Question navigation (Save & Next, Previous, Palette)
// 3. App backgrounding
// 4. Answer selection (debounced 2 seconds)

// Batched payload:
interface AutosavePayload {
  timeRemainingSeconds: number;
  answers: Array<{
    questionIndex: number;
    questionId: string;
    selectedOptionIds: string[];
    isMarkedForReview: boolean;
    timeSpentSeconds: number;
    numericalAnswer?: number;
  }>;
  currentQuestionIndex: number;
}

// Debounce mechanism:
const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_INTERVAL_MS = 30000;

// On navigation: immediate save (no debounce)
// On answer change: wait 2 seconds after last change
// On timer: save every 30 seconds regardless
```

### Client State
- `dirtyAnswers: Map<number, Answer>` — answers changed since last save
- `isSaving: boolean`
- `lastSavedAt: number` — timestamp of last successful save
- `saveQueue: AutosavePayload[]` — pending saves when offline

### Server State
- Server processes autosave payload, returns confirmation
- Server also saves current `timeRemainingSeconds`

### Offline Strategy
- Queue autosave payloads in AsyncStorage when offline
- On reconnection: flush queue in order
- Queue size limit: 50 entries (after that, only latest per question)

### Sequence Diagram

```
Client                          Server
  |                               |
  | [Question change]             |
  |   ↓                          |
  | Debounce 2000ms               |
  |   ↓                          |
  |--- POST /autosave ----------->|
  | { answers: [...],             |
  |   timeRemaining: 5432 }       |
  |<-- { status: 'ok' } ---------|
  |                               |
  | [Timer interval: 30s]         |
  |   ↓                          |
  |--- POST /autosave ----------->|
  | { answers: [...] }            |
  |<-- { status: 'ok' } ---------|
```

### Failure Scenarios
- Network error → queue for retry, show warning after 3 consecutive failures
- Server 500 → retry with backoff (2s, 4s, 8s), then show error
- Conflict (answer was modified from another device) → server returns latest, client reconciles

### Recovery Strategy
- Flush queue on reconnection
- After 5 consecutive failures: show persistent banner "Connection issues — answers saved locally"

### Testing Checklist
- [ ] Autosave fires on answer selection (debounced)
- [ ] Autosave fires on navigation
- [ ] Autosave fires on timer interval
- [ ] Autosave fires on app background
- [ ] "Saving"/"Saved" indicator works
- [ ] Queue works when offline
- [ ] Queue flushes on reconnection
- [ ] Multiple quick changes only save latest

### Acceptance Criteria
- No answer loss under normal conditions
- Maximum data loss of 30 seconds in worst case (crash between saves)
- Autosave is transparent to the student (< 500ms network, non-blocking)

---

## 11. Background Sync

### Purpose
Continue syncing answers and timer when the app is in the background, ensuring no data loss when switching apps.

### UX
- AppState change to background → trigger immediate autosave
- AppState change to foreground → trigger immediate sync + timer check
- No visible indicator during background sync

### Backend Dependency
- `mock_attempts.timeRemainingSeconds` — synced on background

### Required APIs
- Same as autosave (POST /api/attempts/:id/autosave)

### Implementation

```typescript
import { AppState, AppStateStatus } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', 
    (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        // Save immediately
        triggerAutosaveImmediate();
        // Pause timer
        timer.pause();
      } else if (nextState === 'active') {
        // Resume timer
        timer.resume();
        // Sync with server
        syncWithServer();
      }
    }
  );
  return () => subscription.remove();
}, []);
```

### Background Timer Handling
- Timer pauses when app backgrounds (student cannot cheat by leaving app)
- On return: timer resumes from last synced value
- If app was killed: see App Kill Recovery

### Edge Cases
- Background sync fails → queue for retry on foreground
- App stays in background for extended period → timer effectively pauses
- Phone call interrupts test → same as background

### Testing Checklist
- [ ] App background triggers autosave
- [ ] App foreground triggers sync
- [ ] Timer pauses on background
- [ ] Timer resumes on foreground
- [ ] No data loss after background/kill

### Acceptance Criteria
- Zero data loss when app is backgrounded gracefully
- Timer is fair — does not run while app is backgrounded

---

## 12. Offline Cache

### Purpose
Enable the test engine to function during intermittent network outages, ensuring the student can continue answering without interruption.

### UX
- **Offline Banner**: Subtle orange bar at top when offline
- **All features work**: Answer selection, navigation, palette, mark for review
- **Indicator**: "Saving offline" icon on save indicator
- **On reconnect**: "Syncing..." then clears

### Backend Dependency
- Offline cache is entirely client-side
- Uses AsyncStorage (or MMKV for performance)

### Cached Data

```typescript
interface OfflineCache {
  attemptId: string;
  testId: string;
  questions: QuestionDisplay[];
  answers: Record<number, Answer>;
  markedForReview: Set<number>;
  visitedQuestions: Set<number>;
  timeRemaining: number;
  currentIndex: number;
  lastSyncedAt: number;
}
```

### Cache Strategy
- **Write-through cache**: Every answer change writes to local storage + queues server sync
- **Read**: Always reads from local cache (source of truth during attempt)
- **On resume**: Fetch from server, reconcile with local, use server version
- **Cache size**: ~100KB for 300 questions (snapshot JSON)

### Offline Queue

```typescript
interface SyncQueueItem {
  type: 'answer' | 'timer' | 'mark_review';
  payload: any;
  timestamp: number;
  retryCount: number;
}

// Queue persists in AsyncStorage
// On reconnect: process queue FIFO
// Max queue size: 100 items
// On overflow: compact (keep latest per question)
```

### Testing Checklist
- [ ] All answer operations work offline
- [ ] Navigation works offline
- [ ] Palette works offline
- [ ] Timer continues offline
- [ ] Queue accumulates off-line changes
- [ ] Queue flushes on reconnect
- [ ] Queue compaction works correctly
- [ ] Cache is cleared after successful submit

### Acceptance Criteria
- Student can complete entire test offline
- No data loss when transitioning between online/offline
- Sync is transparent with no manual intervention needed

---

## 13. Network Recovery

### Purpose
Gracefully handle the transition from offline to online, reconciling local changes with server state.

### UX
- **Reconnection detection**: Automatic via NetInfo listener
- **Sync progress**: "Syncing X changes..." for large queues
- **Conflicts**: Server wins for answers, client timer wins within tolerance
- **Completion**: "All changes saved" toast

### Backend Dependency
- Conflict resolution logic on server
- Timestamp-based conflict detection

### Sync Flow

```
1. NetInfo detects connectivity change
2. Check for pending queue items
3. Process queue items sequentially (oldest first)
4. For each answer:
   a. Server checks if answer timestamp > stored timestamp
   b. If server has newer: return server version, client accepts
   c. If client has newer: accept client version
5. After queue processed: full sync of current state
6. Clear offline banner
```

### Conflict Resolution Matrix

| Scenario | Resolution |
|----------|------------|
| Client answer newer | Accept client |
| Server answer newer (other device) | Accept server, update client |
| Both changed (same time) | Accept server (authoritative) |
| Client offline, server timeout | Accept client |

### Testing Checklist
- [ ] Reconnection triggers sync automatically
- [ ] Queue items are processed in order
- [ ] Conflicts resolved correctly
- [ ] No data loss during recovery
- [ ] Banner transitions clear correctly

### Acceptance Criteria
- Recovery is automatic and transparent
- Maximum sync time: 5 seconds for 50 queued changes
- No duplicate or lost answers

---

## 14. Image Questions

### Purpose
Support questions with embedded images (diagrams, graphs, figures) and images in answer options.

### UX
- **Image in stem**: Rendered above question text
- **Image in option**: Rendered within the option card
- **Loading**: Progressive JPEG loading with blur placeholder
- **Zoom**: Pinch-to-zoom on images (modal)
- **Alt text**: Accessibility label for screen readers
- **Failed load**: Broken image icon with retry

### Backend Dependency
- `question_images` table — image metadata
- Supabase Storage — actual image files
- Signed URLs with expiry (renewed on each resume)

### Database Tables
- `question_images` — storage bucket, path, role, alt text
- Supabase Storage bucket — actual images

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get signed URLs | POST | `/api/images/signed-urls` | Batch generate signed URLs for images |
| Renew signed URL | GET | `/api/images/:imageId/signed` | Renew expired signed URL |

### Image Loading Strategy

```typescript
// Prefetching: load images for current + next 2 questions
// On navigation: prefetch images for next 3 visible questions
// On resume: prefetch images for first 5 questions

const IMAGE_PREFETCH_WINDOW = 3;

useEffect(() => {
  const startIndex = Math.max(0, currentIndex - 1);
  const endIndex = Math.min(
    questions.length - 1,
    currentIndex + IMAGE_PREFETCH_WINDOW
  );
  
  for (let i = startIndex; i <= endIndex; i++) {
    const q = questions[i];
    if (q.imageUrl) {
      Image.prefetch(q.imageUrl);
    }
  }
}, [currentIndex]);
```

### Offline Strategy
- Cache downloaded images to device storage (AsyncStorage or FileSystem)
- Max cache size: 200MB
- LRU eviction policy
- On low storage: disable image caching, show on every load

### Edge Cases
- Image URL expires during long test → auto-renew on display
- Very large image (5MB+) → show low-res placeholder first, load full
- Image deleted from storage → show placeholder, log error
- Student on slow connection → show progressive loading

### Testing Checklist
- [ ] Images render correctly in stem
- [ ] Images render correctly in options
- [ ] Pinch-to-zoom works
- [ ] Alt text available for screen readers
- [ ] Failed image shows placeholder + retry
- [ ] Signed URL renewal works
- [ ] Offline image cache works
- [ ] Cache eviction works correctly

### Acceptance Criteria
- Images load within 2 seconds on 3G
- Zoom is smooth (60fps)
- Accessibility requirements met (WCAG 2.1 AA)

---

## 15. Bookmarks

### Purpose
Allow students to bookmark questions for later review — separate from "Mark for Review" (which implies they want to review before submitting). Bookmarks are persistent across attempts.

### UX
- **Bookmark icon**: Bookmark outline in question header
- **Tap**: Toggles bookmark (outline → filled)
- **Palette indicator**: Small bookmark icon on bookmarked question numbers
- **Dashboard**: "Bookmarked Questions" filter in attempt history

### Backend Dependency
- `student_bookmarks` table — student's bookmarks with question reference
- Separate from `mock_answers.isMarkedForReview`

### Database Tables
- `student_bookmarks` — studentId, questionId, testId, createdAt

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Toggle bookmark | POST | `/api/bookmarks/toggle` | Add/remove bookmark |
| Get bookmarks | GET | `/api/tests/:testId/bookmarks` | Get all bookmarks for a test |

### Client State
- `bookmarkedIndices: Set<number>` — local bookmark state
- Synced to server on toggle

### Offline Strategy
- Bookmark toggles are queued (same as answer saves)
- Bookmarks displayed from local state immediately

### Edge Cases
- Bookmark a question that no longer exists (test updated) → bookmark removed on sync
- Bookmark count in dashboard should consider only active tests

### Testing Checklist
- [ ] Bookmark toggle works
- [ ] Palette shows bookmark indicator
- [ ] Bookmarks persist across sessions
- [ ] Bookmarks sync correctly

### Acceptance Criteria
- Bookmarks are reliable and persistent
- Visual indicator is clear and unambiguous

---

## 16. Mark for Review

### Purpose
Allow students to flag questions they want to revisit before submitting, distinct from answering.

### UX
- **Button**: "Mark for Review" in action bar
- **Toggle**: Purple highlight when active
- **Palette**: Purple indicator on marked questions
- **Combined state**: If answered + marked, show purple ring with green fill
- **Submit warning**: "X questions are marked for review — have you reviewed them?"

### Backend Dependency
- `mock_answers.isMarkedForReview` — boolean column

### Database Tables
- `mock_answers.isMarkedForReview`

### Client State
- `markedForReview: Set<number>`

### Offline Strategy
- Fully local, synced via autosave

### Interaction with Answer State

| Answered | Marked for Review | Palette Color | Behavior on Submit |
|----------|-------------------|---------------|-------------------|
| No | No | White/Outline | Counted as unattempted |
| No | Yes | Purple | Counted as unattempted + warning |
| Yes | No | Green | Counted as attempted |
| Yes | Yes | Green + Purple ring | Counted as attempted + warning |

### Testing Checklist
- [ ] Toggle mark for review works
- [ ] Palette shows correct color for all states
- [ ] Combined states display correctly
- [ ] Submit warning for marked questions
- [ ] State persists across navigation

### Acceptance Criteria
- Mark for review is intuitive and responsive
- Combined states are visually distinct

---

## 17. Clear Response

### Purpose
Allow students to clear their selected answer for a question, resetting it to unattempted state.

### UX
- **Button**: "Clear Response" in action bar (disabled when no answer selected)
- **On tap**: Clears all selections for current question
- **Confirmation**: No (unlike submit — clearing is low-risk)
- **State reset**: Question returns to "Not Answered" in palette

### Backend Dependency
- DELETE from `mock_answer_options` for this question
- Update `mock_answers.isAnswered = FALSE`

### Required APIs
- Same as autosave (updated payload)

### Client State
- Removes entry from `selectedOption[currentIndex]`

### Edge Cases
- MSQ: clear all selections → isAnswered = FALSE
- Numerical: clear input → isAnswered = FALSE
- Already submitted → no action allowed

### Testing Checklist
- [ ] Clear response works for all question types
- [ ] MSQ: clears all selected options
- [ ] Numerical: clears input
- [ ] Button disabled when no answer selected
- [ ] State persists correctly after clear + navigate

### Acceptance Criteria
- Clear response is immediate and reliable
- Combined with mark-for-review, question shows as "Not Answered + Marked"

---

## 18. Question Status

### Purpose
Define and track the lifecycle status of each question during an attempt.

### States

```
NOT_VISITED ──► VISITED ──► ANSWERED
                    │            │
                    │            ├──► ANSWERED + MARKED
                    │            │
                    ▼            ▼
               MARKED       ANSWERED + MARKED
               ONLY
```

### Status Definitions

| Status | Palette Color | Description |
|--------|--------------|-------------|
| `not-visited` | White/Outline | Student has never viewed this question |
| `visited` | Light gray | Student viewed but didn't answer |
| `answered` | Green filled | At least one option selected |
| `marked-for-review` | Purple filled | Flagged for review, not answered |
| `answered + marked` | Green + Purple ring | Answered and flagged |
| `current` | Blue border | Currently displayed question |

### Edge Cases
- Status changes on answer → answered
- Status changes on clear → visited (if was visited before) or not-visited (if never viewed)
- Status changes on mark → marked

### Testing Checklist
- [ ] All status transitions work correctly
- [ ] Palette reflects current statuses
- [ ] Status persists on navigation and resume
- [ ] Status is correct after clear response

### Acceptance Criteria
- Status is accurate at all times
- Palette provides instant visual feedback

---

## 19. Section Navigation

### Purpose
Support multi-section tests (like NEET: Physics, Chemistry, Biology) with section-level filtering and navigation.

### UX
- **Section tabs**: Above question palette or as horizontal scroll tabs
- **Section info**: Section name, question range, answered count
- **Section switching**: Tap section tab → palette filters to that section
- **Section completion**: Visual indicator when all questions in section are answered
- **Cross-section navigation**: "Next" goes to next question in same section; "Next Section" at section end

### Backend Dependency
- `mock_test_questions.sectionName` — section grouping
- `mock_tests.shuffleQuestions` — section-aware shuffling (shuffle within sections, keep section order)

### Database Tables
- `mock_test_questions.sectionName`

### Client State
- `activeSection: string | null` — current section filter
- `sections: SubjectSection[]` — loaded from test config

### Section Shuffle Algorithm

```typescript
function shuffleWithinSections(
  questions: QuestionDisplay[],
  sections: SubjectSection[],
  seed: string,
): QuestionDisplay[] {
  const result: QuestionDisplay[] = [];
  
  for (const section of sections) {
    const sectionQuestions = questions.slice(
      section.questionStartIndex,
      section.questionEndIndex + 1
    );
    const shuffled = shuffleQuestions(sectionQuestions, seed + section.id);
    result.push(...shuffled);
  }
  
  return result;
}
```

### Edge Cases
- Single-section test → hide section UI entirely
- Empty section → show message, disable tab
- Navigate to next question at section boundary → go to next section's first question

### Testing Checklist
- [ ] Section tabs render correctly
- [ ] Section filtering shows correct questions
- [ ] Section question counts are accurate
- [ ] "Next Section" works at section end
- [ ] Single-section test hides section UI
- [ ] Section-based shuffling works

### Acceptance Criteria
- Section navigation is intuitive
- Questions are correctly grouped by section
- Shuffle preserves section boundaries

---

## 20. Progress Tracking

### Purpose
Give students real-time visual feedback on their overall progress through the test.

### UX
- **Progress bar**: Thin bar below header, fills green as questions are answered
- **Answered count**: "15/30 Answered" text
- **Section progress**: Per-section answer count in palette
- **Desktop**: Progress percentage + bar

### Progress Bar Component

```
┌─────────────────────────────────────────┐
│  15/30 Answered  ████████░░░░░░  50%    │
└─────────────────────────────────────────┘
```

### Client State
- `answerProgress: number` — answeredIndices.size / questions.length

### Formula

```typescript
const answeredCount = Object.values(selectedOption)
  .filter(id => id !== null).length;
const progress = questions.length > 0 
  ? answeredCount / questions.length 
  : 0;
```

### Testing Checklist
- [ ] Progress bar updates in real-time
- [ ] Count text is accurate
- [ ] Section progress is accurate
- [ ] Progress persists on resume

### Acceptance Criteria
- Progress tracking is real-time and accurate

---

## 21. Submit Flow

### Purpose
Handle the manual submission of a test attempt with proper validation, confirmation, and transition to results.

### UX
1. Student taps "Submit Test" (in palette or action bar)
2. Confirmation dialog:
   - Answered: X of Y
   - Unanswered: Z questions
   - Marked for review: W questions
   - Warning if unanswered > 0
3. If confirmed:
   - Show full-screen loading overlay "Submitting your test..."
   - Submit payload to server
   - On success: navigate to result screen
   - On failure: show error, allow retry

### Backend Dependency
- `mock_attempts.status` → `submitted`
- `mock_attempts.submittedAt` → current timestamp
- Result generation triggered (see Result Generation)

### Database Tables
- `mock_attempts` — status update
- `mock_answers` — final sync

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Submit attempt | POST | `/api/attempts/:id/submit` | Submit the test for evaluation |

### Submit Payload

```typescript
interface SubmitPayload {
  timeRemainingSeconds: number;
  answers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    numericalAnswer?: number;
    isMarkedForReview: boolean;
    timeSpentSeconds: number;
  }>;
  clientTimestamp: string; // ISO 8601
}
```

### Server-Side Validation
1. Verify attempt status is `in_progress`
2. Verify student owns this attempt
3. Check timer hasn't expired (server-side elapsed calculation)
4. Validate all answers match question types
5. Persist all answers (final sync)
6. Set status to `submitted`
7. Trigger async result generation
8. Return result reference

### Confirmation Dialog

```
┌──────────────────────────────────┐
│  Submit Test                      │
│                                   │
│  You have answered 45 of 75      │
│  questions. 30 unanswered.       │
│  5 marked for review.            │
│                                   │
│  Unanswered questions will be    │
│  marked as incorrect.            │
│                                   │
│         [Cancel]  [Submit]       │
└──────────────────────────────────┘
```

### Edge Cases
- All questions answered: "You have answered all questions. Submit?"
- No questions answered: "You haven't answered any questions. Submit?"
- Already submitted: show result screen (navigate, don't re-submit)
- Timer expired: auto-submit (see Auto Submit)

### Testing Checklist
- [ ] Submit button triggers confirmation dialog
- [ ] Dialog shows correct counts
- [ ] Confirmation submits successfully
- [ ] Submit failure shows error + retry
- [ ] Loading overlay during submission
- [ ] Navigation to result screen on success
- [ ] Re-submit blocked

### Acceptance Criteria
- Submit is reliable and atomic
- Student cannot accidentally submit without confirmation
- Zero data loss on submission

---

## 22. Auto Submit

### Purpose
Automatically submit the test when the timer reaches zero, preventing answers from being lost.

### UX
- Timer reaches 0:00
- Show "Time's Up!" banner for 2 seconds
- Auto-trigger submit flow
- No confirmation dialog (timer expiry is final)
- Same loading overlay as manual submit
- Attempt status set to `timed_out`

### Backend Dependency
- Server-side timeout validation (defense against client-side timer manipulation)
- Background job for force-submitting stale in_progress attempts

### Database Tables
- `mock_attempts.status` → `timed_out`

### Required APIs
- Same as submit (POST /api/attempts/:id/submit with `autoSubmit: true`)

### Server-Side Timeout Job

```sql
-- Cron job (every 5 minutes)
UPDATE mock_attempts
SET 
  status = 'timed_out',
  submittedAt = NOW(),
  updatedAt = NOW()
WHERE 
  status = 'in_progress'
  AND (startedAt + (SELECT durationMin FROM mock_tests 
       WHERE mock_tests.test_id = mock_attempts.test_id) * INTERVAL '1 minute')
       < NOW() - INTERVAL '5 minutes'  -- 5 minute grace period
  AND updatedAt < NOW() - INTERVAL '5 minutes';
```

### Edge Cases
- Auto-submit during offline → queue submission, complete when online
- Auto-submit while navigating → complete current action, then submit
- Student submits manually 1 second before timer → manual submission wins
- Server timeout job submits attempt that was already submitted → idempotent (check status)

### Testing Checklist
- [ ] Auto-submit fires when timer reaches 0
- [ ] "Time's Up!" banner displayed
- [ ] No confirmation dialog on auto-submit
- [ ] Status set to `timed_out`
- [ ] Server-side timeout job works
- [ ] Manual submit before expiry prevents auto-submit

### Acceptance Criteria
- Every test is eventually submitted (either manually or automatically)
- No answers lost due to timer expiry
- Server-side timeout job catches any missed submissions

---

## 23. Result Generation

### Purpose
Compute the test result from submitted answers — score, accuracy, breakdowns, and rankings.

### Backend Dependency
- Edge Function triggered on attempt submission
- Computes: score per question, total score, subject breakdown, chapter breakdown
- Stores result in `mock_results` table
- Triggers ranking update for this test

### Database Tables
- `mock_results` — computed result
- `mock_answers.isCorrect` — updated during evaluation
- `mock_answers.marksAwarded` — updated during evaluation

### Result Generation Flow

```
1. Attempt submitted (manual or timeout)
2. Edge Function: evaluate_attempt(attemptId)
3. For each answer:
   a. Compare selected option(s) with correct option(s)
   b. Set mock_answers.isCorrect
   c. Compute mock_answers.marksAwarded
   d. Accumulate subject/chapter breakdown
4. Compute aggregate:
   - totalScore, maxScore, percentage
   - correctCount, wrongCount, skippedCount
   - totalTimeSeconds, avgTimePerQuestion
5. Compute breakdowns:
   - subjectBreakdown (JSONB)
   - chapterBreakdown (JSONB)
6. Insert into mock_results
7. If testType = 'practice' AND resultReleaseMode = 'immediate':
   - Set isReleased = TRUE
   - releasedAt = NOW()
8. Trigger async ranking update
```

### Result Schema (mock_results)

```typescript
interface MockResult {
  resultId: string;
  attemptId: string;
  testId: string;
  studentId: string;
  instituteId: string;
  
  totalScore: number;
  maxScore: number;
  percentage: number;
  
  rank: number | null;
  percentile: number | null;
  
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  
  totalTimeSeconds: number;
  avgTimePerQuestion: number;
  
  subjectBreakdown: SubjectBreakdownItem[] | null;
  chapterBreakdown: ChapterBreakdownItem[] | null;
  
  isReleased: boolean;
  generatedAt: string;
  releasedAt: string | null;
}
```

### Edge Cases
- All answers wrong → score = 0 (or negative with negative marking)
- All answers skipped → score = 0
- Test with no negative marking → score = correctCount * marksPerQuestion
- Result already exists → idempotent (skip if already generated)

### Testing Checklist
- [ ] Score computed correctly
- [ ] Subject breakdowns accurate
- [ ] Chapter breakdowns accurate
- [ ] Negative marking applied correctly
- [ ] Partial marking applied correctly
- [ ] Result marked as released for immediate mode
- [ ] Idempotent for duplicate triggers

### Acceptance Criteria
- Results are generated within 5 seconds of submission
- Scores are mathematically accurate
- Breakdowns match individual answer evaluations

---

## 24. Negative Marking

### Purpose
Apply penalty for incorrect answers as configured in the test configuration.

### Configuration
- `mock_tests.negativeMarking` — default negative marks per wrong answer (0 = no penalty)
- `mock_test_questions.negativeMarksOverride` — per-question override (nullable)

### Application Rules

```typescript
function computeMarksAwarded(
  isCorrect: boolean,
  isAnswered: boolean,
  questionMarks: number,
  testNegativeMarking: number,
  questionNegativeOverride: number | null,
): number {
  if (!isAnswered) return 0; // Skipped: 0 marks
  
  if (isCorrect) return questionMarks; // Correct: full marks
  
  // Incorrect: apply negative marking
  const negativeMarks = questionNegativeOverride ?? testNegativeMarking;
  return -negativeMarks;
}
```

### Edge Cases
- Negative marks exceed total score → total score can be negative (display as 0)
- Per-question override is 0 → no negative for that question even if test has default
- Numerical question with tolerance → within tolerance = correct, else incorrect + negative
- MSQ: partially correct → see Partial Marking

### Testing Checklist
- [ ] Negative marking applied to wrong answers
- [ ] Per-question override respected
- [ ] Skipped questions get 0 (no negative)
- [ ] Negative total score handled correctly

### Acceptance Criteria
- Negative marking is mathematically accurate
- No negative marking for skipped questions

---

## 25. Partial Marking

### Purpose
Award partial marks for MSQ (Multiple Select Questions) where the student selected some but not all correct options.

### Configuration
- Determined by `mock_tests.partialMarkingEnabled` (boolean)
- Default: FALSE (MSQ requires all correct options)

### Partial Marking Logic

```typescript
function computeMSQMarks(
  selectedOptionIds: string[],
  correctOptionIds: string[],
  totalMarks: number,
): number {
  if (selectedOptionIds.length === 0) return 0;
  
  const correctSelections = selectedOptionIds.filter(id => 
    correctOptionIds.includes(id)
  ).length;
  
  const incorrectSelections = selectedOptionIds.filter(id => 
    !correctOptionIds.includes(id)
  ).length;
  
  if (correctSelections === correctOptionIds.length && incorrectSelections === 0) {
    // All correct, no incorrect
    return totalMarks;
  }
  
  if (incorrectSelections > 0) {
    // Any incorrect selection → 0 marks (or negative)
    return -negativeMarking; // Per test configuration
  }
  
  // Partial: (correct selected / total correct) * totalMarks
  const fraction = correctSelections / correctOptionIds.length;
  return fraction * totalMarks;
}
```

### Edge Cases
- Student selects no options → 0 marks
- Student selects all options (correct + incorrect) → 0 marks (incorrect present)
- Partial marking disabled → must get all correct or 0

### Testing Checklist
- [ ] Full correct MSQ gets full marks
- [ ] Partial correct (no wrong) gets proportional marks
- [ ] Any wrong selection gets 0 (or negative)
- [ ] No selection gets 0

### Acceptance Criteria
- Partial marking is fair and mathematically correct
- Configurable per test

---

## 26. Evaluation

### Purpose
The complete scoring pipeline from answer submission to result storage.

### Evaluation Pipeline

```
┌─────────────────────────────────────────────┐
│            Evaluation Pipeline                │
│                                              │
│  POST /attempts/:id/submit                   │
│         │                                     │
│         ▼                                     │
│  ┌─────────────────┐                         │
│  │ Validate Attempt │── Invalid → 400 error  │
│  └────────┬────────┘                         │
│           │ Valid                             │
│           ▼                                   │
│  ┌─────────────────┐                         │
│  │ Persist Answers  │                         │
│  │ (Final sync)     │                         │
│  └────────┬────────┘                         │
│           │                                   │
│           ▼                                   │
│  ┌─────────────────┐                         │
│  │ Update Status    │                         │
│  │ → submitted     │                         │
│  └────────┬────────┘                         │
│           │                                   │
│           ▼                                   │
│  ┌─────────────────┐                         │
│  │ Trigger Edge Fn  │                         │
│  │ (Async)          │                         │
│  └────────┬────────┘                         │
│           │                                   │
│           ▼                                   │
│  ┌─────────────────────────────────┐         │
│  │ evaluate_attempt(attemptId)      │         │
│  │                                 │         │
│  │ For each answer:                │         │
│  │  • Compare with correct options │         │
│  │  • Set isCorrect                │         │
│  │  • Compute marksAwarded         │         │
│  │                                 │         │
│  │ Accumulate:                     │         │
│  │  • totalScore                   │         │
│  │  • correct/wrong/skipped counts │         │
│  │  • subjectBreakdown             │         │
│  │  • chapterBreakdown             │         │
│  │                                 │         │
│  │ Insert mock_results row         │         │
│  │                                 │         │
│  │ IF immediate release:           │         │
│  │  • isReleased = true            │         │
│  │  • Trigger ranking update       │         │
│  └─────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

### Consistency Guarantees
- All or nothing: if evaluation fails, attempt remains `submitted` but result not generated
- Manual retry available for admins
- Evaluation is idempotent (can re-run)

### Testing Checklist
- [ ] Full pipeline works end-to-end
- [ ] Scores are accurate
- [ ] Subject breakdowns match
- [ ] Chapter breakdowns match
- [ ] Result generation is idempotent

---

## 27. Leaderboard

### Purpose
Display student rankings for a test, showing relative performance among all test-takers.

### UX
- **My Rank**: Hero card showing rank (e.g., #42 of 1,230)
- **Leaderboard List**: Scrollable list of top students (top 100)
- **Near Me**: Show 5 ranks above and below the student
- **Filters**: By batch, by section, by attempt number
- **Refreshing**: Pull-to-refresh with rate limiting

### Backend Dependency
- Ranking computed by batch job after result generation
- `mock_results.rank` and `mock_results.percentile` columns

### Database Tables
- `mock_results` — rank, percentile columns
- `student_details` — student name, avatar

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get leaderboard | GET | `/api/tests/:testId/leaderboard` | Get top students + my rank |
| Get my rank | GET | `/api/tests/:testId/my-rank` | Get current student's rank context |

### Leaderboard Response

```typescript
interface LeaderboardResponse {
  myRank: {
    rank: number;
    totalParticipants: number;
    percentile: number;
    score: number;
  };
  topStudents: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    avatarUrl?: string;
    score: number;
    percentage: number;
    totalTimeSeconds: number;
  }>;
  nearbyStudents: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    avatarUrl?: string;
    score: number;
    percentage: number;
  }>;
  lastUpdated: string;
}
```

### Offline Strategy
- Cache last-fetched leaderboard
- Show cached data with "Last updated X minutes ago"
- Rankings may be stale — show refresh prompt

### Edge Cases
- Only 1 participant → rank = 1
- Tied scores → same rank, next rank is skipped (1, 1, 3)
- Leaderboard not yet computed → show "Computing rankings..." with estimated time
- Test type 'practice' → no leaderboard (practice tests are unranked)

### Testing Checklist
- [ ] My rank displays correctly
- [ ] Leaderboard list loads correctly
- [ ] Near Me section works
- [ ] Tied scores handled correctly
- [ ] Practice tests hide leaderboard
- [ ] Pull-to-refresh works

### Acceptance Criteria
- Leaderboard loads within 3 seconds
- Rankings are accurate and consistent
- Tied scores follow standard competition ranking

---

## 28. Analytics

### Purpose
Provide comprehensive performance analytics across tests, subjects, chapters, and time.

### UX
- **Dashboard**: Performance summary with key metrics
- **Trends**: Line charts showing score/accuracy over time
- **Distribution**: Bar charts for subject/chapter performance
- **Comparison**: Compare with batch average, toppers
- **Export**: Share analytics as image or PDF

### Backend Dependency
- `performance_reports` — pre-computed aggregate analytics
- `subject_performances` — per-subject analytics
- `chapter_performances` — per-chapter analytics
- `progress_history` — time-series performance data

### Database Tables
- `performance_reports`
- `subject_performances`
- `chapter_performances`
- `progress_history`

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get performance report | GET | `/api/analytics/performance` | Full analytics dashboard |
| Get subject analysis | GET | `/api/analytics/subjects` | Per-subject breakdown |
| Get chapter analysis | GET | `/api/analytics/chapters` | Per-chapter breakdown |
| Get progress trend | GET | `/api/analytics/trends` | Score/accuracy over time |

### Analytics Dashboard

```
┌─────────────────────────────────────────┐
│  Performance Dashboard                    │
│                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 68%  │ │ 85%  │ │ 4.2m │ │ #42  │   │
│  │Score │ │Accur.│ │AvgT  │ │ Rank │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Score Trend (Line Chart)         │    │
│  │  ▁▂▃▅▆█▇▆▅▃▂▁                 │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ Subject Performance (Bar Chart)   │    │
│  │  Physics: ██████░░ 60%           │    │
│  │  Chem:    ████████ 80%           │    │
│  │  Math:    ███████░ 75%           │    │
│  └──────────────────────────────────┘    │
│                                          │
│  [Export as PDF]  [Share]                │
└─────────────────────────────────────────┘
```

### Offline Strategy
- Cache last-fetched analytics
- Chart data can be large → optimize payload, paginate history

### Edge Cases
- No tests attempted → show empty state with "Start your first test!"
- Single test → trend chart shows single point
- Insufficient data for analytics → show "Complete more tests for insights"

### Testing Checklist
- [ ] Performance summary displays correctly
- [ ] Charts render with correct data
- [ ] Subject analysis accurate
- [ ] Chapter analysis accurate
- [ ] Trend analysis shows progress over time
- [ ] Export works correctly

### Acceptance Criteria
- Analytics load within 3 seconds
- Charts are interactive (tap for details)
- Data is accurate and up-to-date

---

## 29. Rank & Percentile

### Purpose
Calculate and display the student's rank and percentile for ranked tests.

### Rank Calculation
```sql
-- UPDATE mock_results SET rank = calculated_rank, percentile = calculated_percentile
WITH ranked AS (
  SELECT 
    result_id,
    ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
    PERCENT_RANK() OVER (ORDER BY total_score DESC) * 100 as percentile
  FROM mock_results
  WHERE test_id = :testId AND is_released = true
)
UPDATE mock_results mr
SET 
  rank = r.rank,
  percentile = ROUND(r.percentile::numeric, 2)
FROM ranked r
WHERE mr.result_id = r.result_id;
```

### Display
- **Rank**: "#42 of 1,230" or "42nd"
- **Percentile**: "98.2% — You scored higher than 98.2% of students"
- **Rank change**: "↑ 5 positions from last attempt" or "↓ 3 positions"
- **Predicted rank**: For competitive exams, predicted AIR (All India Rank)

### Edge Cases
- Same score → same rank (competition ranking: 1, 2, 2, 4)
- Only student → rank 1, percentile 100
- Scores with negative marking → can be negative overall

### Testing Checklist
- [ ] Rank calculated correctly
- [ ] Percentile calculated correctly
- [ ] Tied scores handled correctly
- [ ] Rank change indicator works

### Acceptance Criteria
- Rank and percentile are accurate
- Updated within 30 seconds of result generation

---

## 30. Detailed Solution Review

### Purpose
Allow students to review each question with correct answers, their selected answer, and the explanation after submission.

### UX
- **Question List**: All questions with their status (correct/wrong/skipped)
- **Per-Question Review**:
  - Question stem and options
  - Student's selected answer (highlighted)
  - Correct answer (green highlight)
  - Mark for correct/wrong/skipped badge
  - Explanation text
  - Video explanation (if available)
  - Time spent on this question
- **Navigation**: Same palette + previous/next as test engine
- **Filter**: Correct, Wrong, Skipped, All

### Backend Dependency
- `question_explanations` — explanation text and video URL
- `mock_answers.isCorrect` — scoring result
- `mock_answers.marksAwarded` — per-question marks

### Database Tables
- `question_explanations`
- `mock_answers`
- `mock_answer_options`

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get solution review | GET | `/api/attempts/:id/review` | Full solution review data |

### Review Response

```typescript
interface ReviewResponse {
  questions: Array<{
    index: number;
    questionText: string;
    questionType: QuestionType;
    options: Array<{
      optionId: string;
      optionText: string;
      isCorrect: boolean;
      isSelected: boolean;
    }>;
    selectedOptionIds: string[];
    correctOptionIds: string[];
    isCorrect: boolean;
    isSkipped: boolean;
    marksAwarded: number;
    marks: number;
    timeSpentSeconds: number;
    explanation: {
      text: string;
      videoUrl?: string;
    } | null;
    subjectName?: string;
    chapterName?: string;
  }>;
  filters: {
    correct: number;
    wrong: number;
    skipped: number;
    total: number;
  };
}
```

### Offline Strategy
- Explanation content can be cached (immutable after publish)
- Video explanations: stream, don't cache (large files)

### Edge Cases
- Explanation not available → "Explanation coming soon" placeholder
- Video explanation fails → fallback to text
- Question was from deleted image → show placeholder

### Testing Checklist
- [ ] All questions show correct/wrong/skipped status
- [ ] Student's answer highlighted correctly
- [ ] Correct answer highlighted correctly
- [ ] Explanation displays correctly
- [ ] Video explanation plays
- [ ] Filter by status works
- [ ] Time spent per question displayed

### Acceptance Criteria
- Solution review is comprehensive and informative
- Explanations are helpful and accurate

---

## 31. Performance Charts

### Purpose
Visualize performance data through interactive charts for better understanding of strengths and weaknesses.

### Chart Types

| Chart | Type | Purpose |
|-------|------|---------|
| Score Trend | Line | Score over time (multiple attempts) |
| Subject Comparison | Bar | Performance across subjects |
| Accuracy Trend | Line | Accuracy over time |
| Time Distribution | Pie | Time spent per subject |
| Question Distribution | Stacked Bar | Correct/wrong/skipped per subject |
| Difficulty Analysis | Radar | Performance by difficulty level |

### Required APIs
- Same as Analytics section (pre-computed data)
- Client-side charting library (react-native-chart-kit or victory-native)

### Data Format

```typescript
interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color: string;
    label: string;
  }>;
}
```

### Edge Cases
- Single data point → line chart shows single point
- Zero values → handle gracefully (0% bar shows minimal height)
- Very large values → auto-scale axis

### Testing Checklist
- [ ] Line chart renders correctly
- [ ] Bar chart renders correctly
- [ ] Pie chart renders correctly
- [ ] Radar chart renders correctly
- [ ] Legend displays correctly
- [ ] Touch interactions work (tap for detail)

### Acceptance Criteria
- Charts are performant (60fps on mid-range devices)
- Charts are interactive and informative

---

## 32. Topic Analysis

### Purpose
Break down performance by individual topics (sub-chapter level) to identify specific weak areas.

### UX
- **Topic List**: All topics with performance metrics
- **Mastery Level**: Strong (green), Moderate (amber), Weak (red)
- **Filter**: By subject, by chapter
- **Action**: "Practice Topic" button (navigates to topic practice)

### Backend Dependency
- `chapter_performances` or computed from `mock_results.chapterBreakdown`
- Topics are sub-chapter; `mock_test_questions` linking to `topics`

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get topic analysis | GET | `/api/analytics/topics` | Per-topic performance breakdown |

### Mastery Calculation

```typescript
function getMasteryLevel(accuracy: number): 'strong' | 'moderate' | 'weak' {
  if (accuracy >= 80) return 'strong';
  if (accuracy >= 50) return 'moderate';
  return 'weak';
}
```

### Edge Cases
- No questions from a topic → "No data"
- Insufficient questions (< 3) → "Insufficient data"
- Topic appears in multiple tests → aggregate across all

### Testing Checklist
- [ ] Topic analysis displays correctly
- [ ] Mastery levels are accurate
- [ ] Filter by subject/chapter works
- [ ] "Practice Topic" navigates correctly

### Acceptance Criteria
- Topic analysis is accurate and actionable
- Students can identify weak areas quickly

---

## 33. Chapter Analysis

### Purpose
Break down performance by chapter to show which chapters need more practice.

### UX
- Similar to Topic Analysis but at chapter level
- Chapter list with subject grouping
- Performance bars (correct/wrong/skipped per chapter)
- Chapter-wise time spent

### Backend Dependency
- `mock_results.chapterBreakdown` — computed at result generation
- `subject_performances` — aggregated chapter data

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get chapter analysis | GET | `/api/analytics/chapters` | Per-chapter performance |

### Edge Cases
- Chapter has questions from multiple attempts → aggregate
- Chapter has only 1 question attempted → show with disclaimer

### Testing Checklist
- [ ] Chapter analysis displays correctly
- [ ] Subject grouping works
- [ ] Performance bars accurate

---

## 34. Subject Analysis

### Purpose
Break down performance by subject (Physics, Chemistry, Mathematics, etc.).

### UX
- **Subject Cards**: Each with score, accuracy, time spent
- **Subject Comparison**: Side-by-side performance chart
- **Strengths/Weaknesses**: Top 3 strong and weak subjects

### Backend Dependency
- `mock_results.subjectBreakdown` — computed at result generation
- `subject_performances` — aggregated across all attempts

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get subject analysis | GET | `/api/analytics/subjects` | Per-subject performance |

### Testing Checklist
- [ ] Subject cards display correctly
- [ ] Strength/weakness identification is accurate
- [ ] Charts render correctly

---

## 35. Attempt History

### Purpose
Show a chronological list of all test attempts with key results.

### UX
- **Attempt List**: Chronological list with test name, date, score, percentage, rank
- **Attempt Detail**: Tap to view full result/solution review
- **Comparison**: Compare multiple attempts of the same test
- **Filters**: By test, by date range, by status

### Backend Dependency
- `mock_attempts` + `mock_results` joined query

### Database Tables
- `mock_attempts`
- `mock_results`

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Get attempt history | GET | `/api/attempts/history` | Paginated attempt history |

### Attempt History Response

```typescript
interface AttemptHistoryResponse {
  attempts: Array<{
    attemptId: string;
    testId: string;
    testTitle: string;
    attemptNumber: number;
    status: AttemptStatus;
    startedAt: string;
    submittedAt: string | null;
    score: number | null;
    maxScore: number | null;
    percentage: number | null;
    rank: number | null;
    correctCount: number | null;
    wrongCount: number | null;
    totalQuestions: number;
    isReviewed: boolean;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}
```

### Edge Cases
- No attempts → empty state "No tests attempted yet"
- Attempt in progress → show "In Progress" badge, "Resume" action
- Attempt without result (not yet evaluated) → "Evaluating..."

### Testing Checklist
- [ ] Attempt history loads and paginates correctly
- [ ] Status badges display correctly
- [ ] Tap navigates to result/solution review
- [ ] Filters work correctly
- [ ] Comparison view works

### Acceptance Criteria
- Attempt history loads within 2 seconds
- Pagination is smooth with infinite scroll

---

## 36. Reattempt Rules

### Purpose
Define when and how students can reattempt a test, considering attempt limits and cool-down periods.

### Rules

| Condition | Action |
|-----------|--------|
| Unlimited attempts | Always available |
| Limited + remaining | Available |
| Limited + exhausted | Blocked |
| Cool-down period active | Show countdown |
| Test archived | Blocked |

### Cool-Down Period
- Optional: `mock_tests.attemptCooldownMinutes` (nullable)
- If set: student must wait N minutes after submission before next attempt
- Display countdown on attempt button

### UX
- **Available**: "Start Attempt X of Y"
- **Cool-down**: "Next attempt available in X minutes"
- **Exhausted**: "All attempts used — Review your answers"
- **Blocked**: "Test no longer available"

### Backend Dependency
- `mock_tests.attemptLimit`
- `mock_tests.attemptCooldownMinutes`
- COUNT of `mock_attempts` + MAX `submittedAt`

### Testing Checklist
- [ ] Unlimited attempts work
- [ ] Limited attempts decrement correctly
- [ ] Cool-down period enforced
- [ ] Exhausted attempts blocked
- [ ] Archived tests blocked

### Acceptance Criteria
- Reattempt rules are consistently enforced
- Student is informed of all restrictions clearly

---

## 37. Security & Cheating Prevention

### Purpose
Prevent common cheating techniques and ensure exam integrity.

### Measures

| Measure | Implementation | Deterrence |
|---------|---------------|------------|
| **Tab Switching Detection** | AppState listener: if app backgrounds > 3 seconds, log event. After 5 switches: flag for review | Prevents looking up answers |
| **Screenshot Detection** | Android: detect screenshots. iOS: detect screenshot notification. Log event | Prevents sharing questions |
| **Copy/Paste Blocking** | Disable copy/paste on question text and options | Prevents copying questions |
| **Screen Recording Detection** | iOS: detect screen recording (UIScreen.isCaptured). Android: use MediaProjection callback | Prevents recording |
| **Device Fingerprinting** | Hash device ID + store with attempt | Detects multiple accounts from same device |
| **IP Monitoring** | Store IP at attempt start. Check for same IP across accounts | Detects proxy/VPN abuse |
| **Time Cheating** | Server-side timer validation + drift detection | Prevents clock manipulation |
| **Auto-Submit Flagging** | Flag attempts with suspicious answer patterns (same answer for all, too fast) | Detects automated answering |

### Flagging Criteria

```typescript
function shouldFlagAttempt(attempt: Attempt): boolean {
  const flags: string[] = [];
  
  // Time anomalies
  if (attempt.totalTimeSeconds < attempt.totalQuestions * 5) {
    flags.push('COMPLETED_TOO_FAST');
  }
  
  // Answer patterns
  const sameAnswerCount = countSameAnswers(attempt.answers);
  if (sameAnswerCount > attempt.totalQuestions * 0.8) {
    flags.push('SUSPICIOUS_PATTERN');
  }
  
  // Tab switches
  if (attempt.tabSwitchCount > 10) {
    flags.push('EXCESSIVE_TAB_SWITCHES');
  }
  
  return flags;
}
```

### Database Tables
- `mock_attempts.ipAddress`, `deviceFingerprint`
- `security_events` — log of security events per attempt
- `flagged_attempts` — attempts flagged for review

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Log security event | POST | `/api/attempts/:id/security-event` | Log a security event |

### Edge Cases
- False positives: student genuinely switches tabs to check calculator → log but educate
- Accessibility tools: screen readers may trigger detection → whitelist accessibility APIs
- VPN for legitimate reasons → flag but don't block automatically

### Testing Checklist
- [ ] Tab switching detected and logged
- [ ] Copy/paste blocked
- [ ] Screenshot detected and logged
- [ ] Device fingerprint stored with attempt
- [ ] Timer drift detection works
- [ ] Flagged attempts are reviewable

### Acceptance Criteria
- Security measures are non-intrusive for honest students
- Cheating is detected and logged for review
- False positive rate < 1%

---

## 38. Clock Manipulation Prevention

### Purpose
Prevent students from extending the test timer by changing their device clock.

### Strategy

1. **Server Time on Start**: Record server timestamp when attempt starts
2. **Heartbeat Drift Detection**: On each heartbeat, compare
   - Expected elapsed = current server time - start server time
   - Client-reported elapsed = initial duration - client timeRemaining
   - If |expected - client| > 5 seconds → correct timer
   - If |expected - client| > 30 seconds → flag for cheating
3. **Device Time Check**: On answer load, compare device time with last known server time
   - If device time changed by > 60 seconds → log event, correct timer
4. **Submit Validation**: At submit, server recalculates elapsed time from its own clock
   - Server value is authoritative

### Sequence Diagram

```
Client                    Server
  |                         |
  | Start Test              |
  |--- POST /attempts ----->|  Record server time T0
  |<-- { serverTime: T0 }  |
  |                         |
  | Timer ticks down        |
  |                         |
  |--- Heartbeat ---------->|  Send client timeRemaining
  |                         |  Server calculates:
  |                         |  expected = D - (Tnow - T0)
  |                         |  diff = client - expected
  |                         |  If |diff| > 5s: correct
  |<-- { corrected: diff } |
  |                         |
  | Adjust timer            |
  |                         |
  |--- Submit ------------->|  Server recalculates
  |                         |  Uses own elapsed time
```

### Testing Checklist
- [ ] Forward clock change does not extend timer
- [ ] Backward clock change does not extend timer
- [ ] Drift detection corrects within 5 seconds
- [ ] Excessive drift is flagged
- [ ] Server timer is authoritative on submit

### Acceptance Criteria
- Clock manipulation is ineffective
- Honest students are not affected by drift correction

---

## 39. Session Expiry

### Purpose
Handle expired authentication sessions during a test attempt.

### Strategy
- **Token Refresh**: Supabase auto-refresh handles this for short sessions
- **Long Tests (> 2 hours)**: Refresh token before expiry (60 minutes before)
- **Expired Session During Test**: 
  - Queue current answer changes locally
  - Show "Session expired" snackbar
  - Auto-refresh using refresh token
  - On success: flush queue, continue
  - On failure (refresh token expired): Block, force re-login
- **On Re-login**: Resume attempt from last synced state

### Token Refresh Flow

```
1. Interceptor detects 401 response
2. Attempt token refresh (Supabase handles)
3. If success: retry original request
4. If failure: show login screen
5. After login: navigate back to test engine
6. Resume from last saved state
```

### Edge Cases
- Refresh token also expired → force re-login
- Student logs out during test → attempt continues (can resume on re-login)
- Token expires during submit → queue submit, retry after refresh

### Testing Checklist
- [ ] Token refresh works during test
- [ ] Expired session shows appropriate message
- [ ] Re-login redirects back to test
- [ ] No data loss during session expiry

### Acceptance Criteria
- Session expiry does not cause data loss
- Re-authentication is seamless

---

## 40. Multiple Devices

### Purpose
Handle the scenario where a student starts a test on one device and attempts to resume on another.

### Strategy

| Scenario | Behavior |
|----------|----------|
| Resume on different device | Allow. State restored from server (source of truth) |
| Start new attempt while another in progress | Block. Show "You have an in-progress attempt on another device" |
| Same device, same browser | Normal resume |
| Previous device attempt timed out | Allow new start (within limits) |

### Backend Implementation
- On attempt creation, check for existing `in_progress` attempts
- If exists: return error with reference to existing attempt
- On resume, update `deviceFingerprint` and `ipAddress`

### Conflict Resolution
- If two devices submit simultaneously: first submission wins, second is rejected
- Answer conflicts: last write wins (server timestamp)

### Edge Cases
- Device A has answers not yet synced, Device B resumes → B gets server state (may lose A's unsynced answers)
- Student intentionally uses two devices to extend time → timer is server-authoritative, so ineffective

### Testing Checklist
- [ ] Resume on second device restores state
- [ ] New attempt while in-progress is blocked
- [ ] Simultaneous submission handled correctly
- [ ] Timer is consistent across devices

### Acceptance Criteria
- Multiple device support is seamless
- No advantage gained by using multiple devices

---

## 41. App Kill Recovery

### Purpose
Recover gracefully when the app is killed (force closed, crash, system termination) during a test.

### Recovery Strategy

```
1. App is killed
2. Student reopens app
3. Check for in-progress attempts (from AsyncStorage cache)
4. If found: show "Resume Attempt" dialog
5. On resume: fetch state from server
6. Server returns last auto-saved state
7. Reconcile with local state (server wins)
8. Resume test from restored state
```

### State Restoration

```typescript
async function recoverFromCrash(): Promise<boolean> {
  // 1. Check local cache for in-progress attempt
  const cached = await AsyncStorage.getItem('activeAttempt');
  if (!cached) return false;
  
  const { attemptId } = JSON.parse(cached);
  
  // 2. Fetch current state from server
  try {
    const serverState = await api.resumeAttempt(attemptId);
    
    // 3. Reconcile
    restoreFromServerState(serverState);
    
    // 4. Navigate to test engine
    navigation.navigate('TestEngine', { attemptId });
    
    return true;
  } catch {
    // Server unavailable — attempt may be lost
    return false;
  }
}
```

### Data Loss Calculation

| Event | Max Data Loss |
|-------|--------------|
| Graceful background + save | 0 seconds |
| App kill (crashed) | Up to 30 seconds (autosave interval) |
| App kill during autosave | Up to 30 seconds |
| Server unreachable at kill | None (if sync queue intact) |

### Testing Checklist
- [ ] App kill during test shows resume dialog
- [ ] Resume restores correct state
- [ ] Local cache is cleared on successful submit
- [ ] Server state recovery works
- [ ] Data loss within acceptable limits

### Acceptance Criteria
- Maximum data loss of 30 seconds in any crash scenario
- Resume is intuitive and reliable

---

## 42. Token Refresh

### Purpose
Maintain authentication throughout a long test session (3+ hours) without interrupting the student.

### Implementation

```typescript
// Supabase auto-refresh handles this automatically
// Default session expiry: 1 hour
// Token refresh happens before expiry

// For tests > 1 hour, ensure refresh happens:
useEffect(() => {
  const REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes
  
  const interval = setInterval(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Token refresh failed:', error.message);
      // Show warning to student
    }
  }, REFRESH_INTERVAL);
  
  return () => clearInterval(interval);
}, []);
```

### Failure Handling
- Token refresh fails → retry after 10 seconds, 30 seconds, 60 seconds
- All retries fail → show "Session expired" with login redirect
- After re-login: resume test from last saved state

### Testing Checklist
- [ ] Token refresh happens during test
- [ ] Refresh failure shows appropriate message
- [ ] Re-login after expiry resumes test

### Acceptance Criteria
- Student never loses test progress due to token expiry

---

## 43. Performance & Caching

### Purpose
Ensure the test engine performs well on mid-range and low-end devices.

### Strategies

| Strategy | Implementation | Impact |
|----------|---------------|--------|
| **Snapshot Immutability** | Questions loaded once, never re-fetched | Reduces network calls |
| **FlatList Optimization** | `getItemLayout`, `windowSize=3`, `removeClippedSubviews` | Smooth scrolling |
| **Image Caching** | `Image.prefetch`, `FastImage` for cached images | Fast image loading |
| **State Memoization** | `useMemo`, `useCallback` on computed values | Reduced re-renders |
| **Minimal Re-renders** | Isolated state updates (only affected components re-render) | 60fps UI |
| **Payload Compression** | Gzip API responses | Faster network |
| **AsyncStorage** | Question snapshot and answers cached locally | Instant resume |

### React Optimization

```typescript
// Use React.memo on all test engine sub-components
const QuestionCard = React.memo(function QuestionCard(props) {
  // Only re-renders when props change
});

// Use useCallback for all event handlers
const handleOptionSelect = useCallback((optionId: string) => {
  // ...
}, [dependencies]);

// Use useMemo for derived state
const answeredIndices = useMemo(() => {
  return computeAnsweredIndices(selectedOption);
}, [selectedOption]);
```

### Performance Budgets

| Metric | Budget |
|--------|--------|
| Initial test load (300 questions) | < 2 seconds |
| Question navigation | < 50ms |
| Answer selection → palette update | < 16ms (60fps) |
| Autosave request | < 500ms |
| Timer tick | No re-render of parent |
| Palette render (100 buttons) | < 50ms |
| Submit request | < 3 seconds |
| Image load (first paint) | < 2 seconds on 3G |

### Testing Checklist
- [ ] FlatList scrolls smoothly with 300 items
- [ ] `getItemLayout` provides fast scrolling
- [ ] Image caching works
- [ ] Memoization prevents unnecessary re-renders
- [ ] Performance budgets met

### Acceptance Criteria
- Test engine runs at 60fps on mid-range devices
- No jank during navigation, selection, or palette interaction

---

## 44. Lazy Loading & Prefetching

### Purpose
Load content efficiently for large tests (1000+ questions) without blocking the UI.

### Lazy Loading Strategy

```typescript
// For 1000+ questions: load in chunks of 50
const CHUNK_SIZE = 50;
const PREFETCH_AHEAD = 3; // chunks

// Questions array is built incrementally
const [loadedQuestions, setLoadedQuestions] = useState<QuestionDisplay[]>([]);
const [loadedUpTo, setLoadedUpTo] = useState(CHUNK_SIZE);

// Load next chunk when approaching boundary
useEffect(() => {
  if (currentIndex > loadedUpTo - PREFETCH_AHEAD * CHUNK_SIZE) {
    loadNextChunk();
  }
}, [currentIndex]);

// Prefetch images for upcoming questions
useEffect(() => {
  const end = Math.min(currentIndex + 10, loadedQuestions.length);
  for (let i = currentIndex; i < end; i++) {
    const q = loadedQuestions[i];
    if (q.imageUrl) {
      Image.prefetch(q.imageUrl);
    }
  }
}, [currentIndex]);
```

### Prefetch Strategy

| Content | When | Strategy |
|---------|------|----------|
| Question data | On resume/start | Load all for < 300, chunked for 1000+ |
| Images | On navigation | Prefetch current + next 10 |
| Next chunk (lazy) | When 2 chunks ahead | Load next chunk in background |
| Palette data | On start | Load all (lightweight metadata only) |

### Edge Cases
- Student navigates faster than chunks load → show skeleton loading for that question
- Network slow → chunks may take time, show loading indicator
- Prefetch fails → image may be slow to load when needed

### Testing Checklist
- [ ] Chunked loading works for 1000+ questions
- [ ] Prefetch loads images before navigation
- [ ] Skeleton shows during chunk loading
- [ ] Smooth UX during chunk transitions

### Acceptance Criteria
- No visible loading for tests under 300 questions
- Chunked loading is seamless for 1000+ questions

---

## 45. Memory Optimization

### Purpose
Keep memory usage low, especially for large tests and on low-end devices.

### Strategies

| Strategy | Implementation | Impact |
|----------|---------------|--------|
| **FlatList Recycling** | `removeClippedSubviews={true}` | Off-screen questions removed from render tree |
| **Image Downsampling** | Resize images to display size (use `FastImage` resize mode) | Reduces memory per image |
| **String Interning** | Reuse common strings (option labels A, B, C, D) | Reduces string allocations |
| **Weak References** | Use WeakRef for non-essential callbacks | Allows GC |
| **Array Pooling** | Reuse arrays for computed state where possible | Reduces allocations |
| **Batch State Updates** | Group related state changes in single `setState` | Reduces render cycles |
| **Clear Cache on Submit** | Remove question data from memory after submit | Frees memory |

### Memory Budgets

| Scenario | Budget |
|----------|--------|
| Idle (test not started) | < 50MB |
| Test active (300 questions) | < 100MB |
| Test active (1000+ questions) | < 150MB |
| With images (20 images) | < 200MB |
| After submit (cleanup) | < 60MB |

### Testing Checklist
- [ ] Memory stays within budget
- [ ] No memory leaks during navigation
- [ ] Images are properly sized
- [ ] Cache clears on submit

### Acceptance Criteria
- App does not exceed 200MB during test
- No crashes on low-end devices (2GB RAM)

---

## 46. Battery Optimization

### Purpose
Minimize battery drain during long test sessions (3+ hours).

### Strategies

| Strategy | Implementation |
|----------|---------------|
| **Reduced Timer Resolution** | Use 1-second interval instead of sub-second |
| **Batch Network Calls** | Debounce autosave (30s interval + 2s debounce) |
| **Image Quality** | Load appropriately sized images (not full resolution) |
| **Animations Disabled** | No Reanimated/lottie during test (static UI) |
| **Background Behavior** | Timer pauses when app in background |
| **Network Idle** | No polling when idle (no unnecessary network calls) |

### Battery Impact

| Feature | Battery Cost |
|---------|-------------|
| Timer (1s interval) | Very low |
| Autosave (30s) | Low |
| Image loading | Medium (one-time) |
| Network calls | Low (small payloads) |

### Testing Checklist
- [ ] Battery drain < 10% per hour on mid-range device
- [ ] No unnecessary network calls
- [ ] Timer does not prevent sleep mode

### Acceptance Criteria
- Student can complete a 3-hour test with < 30% battery drain

---

## 47. Large Test Handling (1000+ Questions)

### Purpose
Support tests with 1000+ questions (e.g., full-length NEET/UPSC with multiple sections) without performance degradation.

### Architecture

```
┌─────────────────────────────────────────────┐
│           Large Test Architecture             │
│                                              │
│  ┌──────────────────┐                        │
│  │  Question Chunks  │  50 questions each    │
│  │  Loaded lazily    │  Async load on demand │
│  └──────────────────┘                        │
│                                              │
│  ┌──────────────────┐                        │
│  │  Answer Map       │  Record<number, ...>  │
│  │  (sparse)         │  Only stores answered │
│  └──────────────────┘                        │
│                                              │
│  ┌──────────────────┐                        │
│  │  Palette          │  Lightweight metadata │
│  │  (sectioned)      │  1000 items in grid   │
│  └──────────────────┘                        │
│                                              │
│  ┌──────────────────┐                        │
│  │  Section Tabs     │  Filter palette       │
│  │                   │  Reduces visible      │
│  │                   │  items per section    │
│  └──────────────────┘                        │
└─────────────────────────────────────────────┘
```

### Palette for 1000+ Questions

```typescript
// Section-filtered palette reduces visible items
// Each section tab shows only that section's questions

// Example: NEET has Physics (50), Chemistry (50), Biology (100)
// Without filter: 200 items in grid (scrollable)
// With section filter: 50-100 items per section

// Virtualized list inside palette for 200+ items
const PaletteList = () => {
  const sectionQuestions = useMemo(() => {
    return activeSection 
      ? questions.filter(q => q.sectionName === activeSection)
      : questions;
  }, [activeSection, questions]);
  
  return (
    <FlatList
      data={sectionQuestions}
      renderItem={renderPaletteItem}
      numColumns={5}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      windowSize={5}
    />
  );
};
```

### Edge Cases
- Student jumps to question 950 → load chunk containing that question
- Palette with 1000 items → section-filtered + virtualized
- Submit with 1000 answers → chunked API payload

### Testing Checklist
- [ ] 1000+ questions load without crash
- [ ] Lazy loading chunks work correctly
- [ ] Palette is usable with section filters
- [ ] Navigation to any question is fast
- [ ] Submit handles 1000 answers

### Acceptance Criteria
- 1000+ question tests are fully functional
- No performance degradation compared to 100-question test

---

## 48. Accessibility

### Purpose
Ensure the test engine is usable by students with disabilities, meeting WCAG 2.1 Level AA standards.

### Requirements

| Requirement | Implementation |
|-------------|---------------|
| **Screen Reader Support** | `accessibilityLabel` on all interactive elements |
| **Keyboard Navigation** | Full keyboard support on desktop (Tab, Enter, Arrow keys) |
| **Focus Management** | Focus moves to question content on navigation |
| **Color Contrast** | All text meets 4.5:1 contrast ratio |
| **Touch Targets** | Minimum 44x44pt for all interactive elements |
| **Alt Text** | All images have meaningful `alt` text |
| **Reduce Motion** | Respect `prefers-reduced-motion` |
| **Font Scaling** | Support dynamic type (up to 200%) |
| **Focus Indicators** | Visible focus ring on all interactive elements |

### Screen Reader Labels

```typescript
// Question card
accessibilityLabel={`Question ${question.index}. ${question.text}`}
accessibilityRole="region"

// Option
accessibilityLabel={`Option ${option.label}: ${option.text}${isSelected ? '. Selected' : ''}`}
accessibilityRole="radio"
accessibilityState={{ selected: isSelected }}

// Palette button
accessibilityLabel={`Question ${index + 1}. Status: ${status}`}
accessibilityRole="button"
accessibilityState={{ current: index === currentIndex }}

// Timer
accessibilityLabel={`Time remaining: ${formattedTime}`}
accessibilityLiveRegion="polite"

// Submit button
accessibilityLabel="Submit test"
accessibilityRole="button"
```

### Testing Checklist
- [ ] Screen reader announces all elements correctly
- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Focus management is correct
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets are minimum 44x44pt
- [ ] Images have alt text
- [ ] Font scaling works up to 200%
- [ ] Reduced motion is respected

### Acceptance Criteria
- WCAG 2.1 Level AA compliance
- Test is fully usable with screen readers

---

## 49. Dark Mode

### Purpose
Provide a dark color scheme for the test engine, reducing eye strain during long exams.

### Color Tokens

```typescript
const darkTheme = {
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceVariant: '#3A3A3C',
  
  text: {
    primary: '#FFFFFF',
    secondary: '#EBEBF5',
    tertiary: '#8E8E93',
    inverse: '#000000',
  },
  
  palette: {
    // Question status colors (adjusted for dark background)
    notVisited: '#3A3A3C',
    answered: '#34C759',
    markedForReview: '#AF52DE',
    combined: '#34C759' + '#AF52DE' ring,
    current: '#007AFF',
  },
  
  timer: {
    normal: '#FFFFFF',
    warning: '#FF9F0A',
    critical: '#FF453A',
  },
};
```

### System Preference Detection

```typescript
import { useColorScheme } from 'react-native';

const colorScheme = useColorScheme();
const isDarkMode = colorScheme === 'dark';
const theme = isDarkMode ? darkTheme : lightTheme;
```

### Testing Checklist
- [ ] All screens have dark mode variants
- [ ] Dark mode respects system settings
- [ ] Color contrast maintained in dark mode
- [ ] Images/illustrations work in dark mode
- [ ] No hardcoded light colors in dark mode

### Acceptance Criteria
- Dark mode is consistently implemented across all test screens
- Readability is maintained in dark mode

---

## 50. Landscape & Tablet Support

### Purpose
Support landscape orientation and tablet form factors with optimized layouts.

### Layout Strategy

```typescript
const DESKTOP_BREAKPOINT = 768;
const isDesktop = screenWidth >= DESKTOP_BREAKPOINT;

// Mobile (< 768): Full-width question, modal palette
// Desktop (≥ 768): Question (2/3) + Palette sidebar (1/3)
// Tablet (768–1024): More compact sidebar
// Large Tablet (1024+): Full desktop layout
```

### Landscape Optimization

```typescript
// In landscape on phone:
// - Question area takes full width
// - Palette available via button (modal)
// - Progress bar is thinner
// - Action bar is horizontal

const isLandscape = useWindowDimensions().width > useWindowDimensions().height;

if (isLandscape && !isDesktop) {
  // Compact header (smaller font)
  // Full-width question
  // No palette sidebar
}
```

### Tablet Layout

```
┌─────────────────────────────────────────┐
│  Header [Title]          [Timer] [Menu] │
├──────────────────────┬──────────────────┤
│                      │   Question       │
│   Question Area      │   Palette        │
│   (2/3 width)        │   (1/3 width)    │
│                      │                  │
│   [Option A]         │   ┌──┬──┬──┐    │
│   [Option B]         │   │1 │2 │3 │    │
│   [Option C]         │   ├──┼──┼──┤    │
│   [Option D]         │   │4 │5 │6 │    │
│                      │   └──┴──┴──┘    │
│                      │                  │
├──────────────────────┴──────────────────┤
│  [< Prev]  [Mark for Review]  [Next >]  │
└─────────────────────────────────────────┘
```

### Testing Checklist
- [ ] Landscape works on phones
- [ ] Tablet layout displays correctly
- [ ] All breakpoints render correctly
- [ ] No content cutoff in any orientation
- [ ] Keyboard covers no content

### Acceptance Criteria
- Optimal layout for all screen sizes and orientations
- Palette always accessible

---

## 51. Internationalization

### Purpose
Support multiple languages for the test engine UI and question content.

### i18n Strategy

```typescript
// Use i18next or react-native-i18n
// Languages: English (default), Hindi, etc.

const resources = {
  en: {
    translation: {
      test: {
        submit: 'Submit Test',
        timeRemaining: 'Time Remaining',
        answered: 'Answered',
        unanswered: 'Unanswered',
        markedForReview: 'Marked for Review',
        question: 'Question',
        of: 'of',
        previous: 'Previous',
        saveAndNext: 'Save & Next',
        clearResponse: 'Clear Response',
        markForReview: 'Mark for Review',
      },
    },
  },
  hi: {
    translation: {
      test: {
        submit: 'परीक्षा सबमिट करें',
        timeRemaining: 'शेष समय',
        answered: 'उत्तर दिया गया',
        unanswered: 'उत्तर नहीं दिया गया',
        markedForReview: 'समीक्षा के लिए चिह्नित',
        question: 'प्रश्न',
        of: 'का',
        previous: 'पिछला',
        saveAndNext: 'सहेजें और अगला',
        clearResponse: 'उत्तर साफ़ करें',
        markForReview: 'समीक्षा के लिए चिह्नित करें',
      },
    },
  },
};
```

### Question Content Translation
- Questions are authored in a primary language
- Translations stored as related records or in a separate field
- Language preference: per-student setting

### Testing Checklist
- [ ] UI strings are translated correctly
- [ ] RTL languages supported if needed
- [ ] Language switching works without restart
- [ ] Number formats respect locale

### Acceptance Criteria
- Full i18n support for UI strings
- Question content supports multiple languages

---

## 52. Push Notifications

### Purpose
Notify students about test availability, results, and reminders.

### Notification Types

| Type | Trigger | Content |
|------|---------|---------|
| Test Available | When test is assigned/published | "New test: JEE Main 2025 is now available" |
| Result Ready | When result is released | "Your JEE Main result is ready! Score: 245/360" |
| Attempt Reminder | 24 hours before expiry | "Reminder: JEE Main test expires tomorrow" |
| Incomplete Attempt | 30 minutes after test start without activity | "You have an incomplete test. Resume now?" |
| Leaderboard Update | When rank changes | "Your rank improved to #42 in JEE Main" |

### Backend Dependency
- `notifications` table
- `notification_recipients` table
- Supabase Edge Function for sending push notifications
- Expo Push Notifications or Firebase Cloud Messaging

### Required APIs

| API | Method | Path | Purpose |
|-----|--------|------|---------|
| Register device | POST | `/api/notifications/register` | Register device for push |
| Get notifications | GET | `/api/notifications` | List notifications |
| Mark read | PUT | `/api/notifications/:id/read` | Mark notification as read |

### Testing Checklist
- [ ] Push notifications delivered
- [ ] Notification opens correct screen
- [ ] Marking as read works
- [ ] Notification preferences respected

### Acceptance Criteria
- Notifications are timely and relevant
- Notification navigation works correctly

---

## 53. Background Tasks

### Purpose
Perform necessary background operations without requiring the app to be open.

### Tasks

| Task | Trigger | Action |
|------|---------|--------|
| Autosave Queue Flush | Connectivity change | Flush pending answer sync |
| Timer Sync | Background heartbeat | Sync timer to server |
| New Test Check | Periodic (every 6 hours) | Check for new assignments |
| Result Check | Periodic (every hour) | Check if results are ready |

### Implementation

```typescript
// react-native-background-fetch for periodic tasks
// or Supabase Realtime subscriptions for instant updates

import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 60, // minutes
  stopOnTerminate: false,
  enableHeadless: true,
}, async (taskId) => {
  await flushSyncQueue();
  await checkForNewResults();
  BackgroundFetch.finish(taskId);
});
```

### Testing Checklist
- [ ] Background tasks run correctly
- [ ] Tasks don't drain battery
- [ ] Tasks complete within time budget

### Acceptance Criteria
- Background sync ensures data is never stale
- Battery impact is minimal

---

## 54. Crash Recovery

### Purpose
Handle app crashes gracefully, recovering as much state as possible.

### Strategy

1. **Local State Persistence**: Write critical state to AsyncStorage/MMKV on every autosave
2. **Crash Detection**: On app start, check for in-progress attempt in local cache
3. **State Restoration**: 
   - Load last autosaved state from local cache
   - Fetch latest state from server
   - Merge (server wins for answers, local wins for UI state)
   - Resume test or show recovery options
4. **Crash Reporting**: Log crash details via Sentry or similar

### Recovery Options

```
[App crash detected]
┌──────────────────────────────────┐
│  We detected a crash during your │
│  test. Your answers are safe.    │
│                                   │
│  [Resume Test]                    │
│  [Review Last Saved State]        │
│  [Contact Support]                │
└──────────────────────────────────┘
```

### Testing Checklist
- [ ] Crash recovery restores state
- [ ] No data loss in crash scenarios
- [ ] Recovery options are clear
- [ ] Crash reports are logged

### Acceptance Criteria
- Zero data loss from app crashes
- Recovery is automatic with clear user communication

---

## 55. Monitoring & Logging

### Purpose
Monitor test engine health, performance, and student behavior.

### Metrics to Monitor

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| API Response Times | DataDog/Sentry | > 3 seconds |
| Error Rate | Sentry | > 1% |
| Autosave Success Rate | Custom | < 95% |
| Timer Sync Drift | Custom | > 10 seconds |
| App Crash Rate | Sentry | > 0.1% |
| Submit Success Rate | Custom | < 99% |
| Image Load Failures | Custom | > 5% |
| Test Abandonment Rate | Custom | > 20% |

### Logging

```typescript
// Structured logging for all test engine events
interface TestEngineLog {
  event: string;
  attemptId: string;
  studentId: string;
  timestamp: string;
  metadata: Record<string, any>;
}

// Log categories:
// - navigation: question changes, section changes
// - interaction: answer selection, mark for review
// - timer: start, pause, resume, sync, correction
// - network: autosave, sync, submit
// - error: any failure
// - security: tab switch, screenshot, drift
```

### Testing Checklist
- [ ] Logs are generated for all events
- [ ] Metrics are collected
- [ ] Alerts are configured
- [ ] Dashboard shows real-time test activity

### Acceptance Criteria
- Monitoring provides full visibility into test engine health
- Alerts enable rapid response to issues

---

## 56. Scalability

### Purpose
Ensure the test engine architecture supports scale from 100 to 100,000+ concurrent test-takers.

### Database Scaling

| Strategy | Implementation |
|----------|---------------|
| **Table Partitioning** | `mock_attempts` range-partitioned by `startedAt` (monthly) |
| **Indexing** | All foreign keys, status columns, and timestamp columns indexed |
| **Read Replicas** | Result/analytics queries served from read replicas |
| **Connection Pooling** | Use PgBouncer for connection pooling |
| **Materialized Views** | Leaderboard rankings refreshed every 5 minutes |

### API Scaling

| Strategy | Implementation |
|----------|---------------|
| **Stateless API** | No server-side session state |
| **Horizontal Scaling** | API servers behind load balancer |
| **Caching Layer** | Redis for question snapshots, test metadata |
| **Rate Limiting** | Per-student: 100 req/min for autosave |
| **Batch Processing** | Autosave accepts batch payloads |

### Autosave Throttling

```typescript
// With 100,000 concurrent students, each autosaving every 30 seconds:
// Requests per second: 100,000 / 30 ≈ 3,333 requests/second
// With batch of 50 answers each: 3,333 * 50 = 166,650 answer writes/second

// Solution: Use Supabase's connection pooling + batch inserts
// Edge Function accepts array of answers, does single INSERT per batch
```

### Testing Checklist
- [ ] Load test with 10,000 concurrent users
- [ ] Autosave handles scale
- [ ] Submit handles scale
- [ ] Results generation handles backlog

### Acceptance Criteria
- System handles 10,000+ concurrent test-takers
- No degradation in response times under load

---

## 57. Future Features

### Planned Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| **AI Proctoring** | Use device camera + ML for real-time proctoring | High |
| **Adaptive Testing** | Question difficulty adapts based on performance | High |
| **Voice Commands** | Answer questions via voice input | Medium |
| **AR Questions** | Augmented reality question content | Low |
| **Peer Comparison** | Compare performance with specific peers | Medium |
| **Study Recommendations** | AI-generated study plan based on weak areas | High |
| **Gamification** | Streaks, badges, achievements for test practice | Medium |
| **Offline Full Mode** | Download entire test + results for offline completion | High |
| **Calculator Integration** | On-screen scientific calculator within test | Medium |
| **Notes Mode** | Take notes during test (visible only during attempt) | Low |
| **Time Banking** | Earn extra time by answering certain questions fast | Low |
| **Question Language Toggle** | Switch question language mid-test (if available) | Medium |
| **Annotation Tool** | Highlight and underline question text | Medium |
| **Brain Health Reminder** | Periodic reminders to blink, hydrate, and stretch | Low |

---

## 58. Implementation Priority Order

### Phase 1: Core Engine (MVP) — Weeks 1–4

| Priority | Feature | Dependencies | Effort |
|----------|---------|-------------|--------|
| P0 | Exam Assignment | Mock tests DB | 2 days |
| P0 | Question Loading | Snapshots | 2 days |
| P0 | Question Palette | Questions loaded | 2 days |
| P0 | Question Navigation | Palette | 1 day |
| P0 | Answer Selection (MCQ) | Options | 2 days |
| P0 | Timer | — | 2 days |
| P0 | Autosave | Timer + Answers | 3 days |
| P0 | Submit Flow | Autosave | 2 days |
| P0 | Result Generation | Submit | 3 days |
| P0 | Result Screen | Result Generated | 2 days |

### Phase 2: Enhanced Features — Weeks 5–8

| Priority | Feature | Dependencies | Effort |
|----------|---------|-------------|--------|
| P1 | Mark for Review | Answer Selection | 1 day |
| P1 | Clear Response | Answer Selection | 1 day |
| P1 | Section Navigation | Questions with sections | 2 days |
| P1 | Auto Submit | Timer | 2 days |
| P1 | Negative Marking | Result Generation | 1 day |
| P1 | MSQ Support | Answer Selection | 2 days |
| P1 | Numerical Questions | Answer Selection | 2 days |
| P1 | Attempt Limits | Exam Assignment | 1 day |
| P1 | Resume Rules | Autosave + Timer | 2 days |
| P1 | Detailed Solution Review | Result Generation | 3 days |

### Phase 3: Polish & Scale — Weeks 9–12

| Priority | Feature | Dependencies | Effort |
|----------|---------|-------------|--------|
| P2 | Security & Cheating Prevention | Timer, AppState | 3 days |
| P2 | Image Questions | Question Loading | 2 days |
| P2 | Offline Cache | Autosave | 3 days |
| P2 | Network Recovery | Offline Cache | 2 days |
| P2 | Background Sync | Autosave | 2 days |
| P2 | Accessibility | All UI | 2 days |
| P2 | Dark Mode | Theme system | 1 day |
| P2 | Landscape & Tablet | Layout system | 2 days |
| P2 | Performance Optimization | All features | 3 days |
| P2 | Large Test Handling (1000+) | Lazy Loading | 3 days |

### Phase 4: Analytics & Advanced — Weeks 13–16

| Priority | Feature | Dependencies | Effort |
|----------|---------|-------------|--------|
| P3 | Leaderboard | Result Generation | 3 days |
| P3 | Rank & Percentile | Leaderboard | 2 days |
| P3 | Subject Analysis | Subject breakdowns | 2 days |
| P3 | Chapter Analysis | Chapter breakdowns | 2 days |
| P3 | Topic Analysis | Topic breakdowns | 2 days |
| P3 | Performance Charts | Analytics data | 3 days |
| P3 | Attempt History | Submit | 2 days |
| P3 | Reattempt Rules | Attempt Limits | 1 day |
| P3 | Partial Marking | MSQ + Result | 1 day |
| P3 | Bookmarks | Answer Selection | 1 day |

### Phase 5: Infrastructure — Weeks 17–20

| Priority | Feature | Dependencies | Effort |
|----------|---------|-------------|--------|
| P4 | App Kill Recovery | Autosave + Cache | 2 days |
| P4 | Session Expiry | Auth | 1 day |
| P4 | Token Refresh | Auth | 1 day |
| P4 | Multiple Devices | Resume Rules | 2 days |
| P4 | Push Notifications | Notifications DB | 2 days |
| P4 | Background Tasks | Background fetch | 2 days |
| P4 | Crash Recovery | Local cache | 2 days |
| P4 | Monitoring & Logging | All features | 3 days |
| P4 | Scalability | All features | 5 days |
| P4 | i18n | All UI | 2 days |

### Critical Blockers

1. **Database migration for Assessment Domain (Domain 05)**: Must be complete before any backend work
2. **Question snapshot Edge Function**: Publishing a test must freeze snapshots; engine reads from snapshots
3. **Supabase Realtime**: Required for live timer sync; must be configured
4. **Edge Function for result generation**: Must be built before submit flow can complete

### Dependencies

```
Exam Assignment → Questions Loaded → Palette → Navigation → Answer Selection
                                                                  ↓
Timer → Autosave ← Answer Selection
  ↓
Auto Submit → Submit → Result Generation → Result Screen
                                                ↓
                                       Detailed Solution Review
                                                ↓
                                       Leaderboard → Analytics
```

### Testing Checklist (Final)

- [ ] End-to-end test: Assignment → Instructions → Start → Answer → Navigate → Submit → Result → Review
- [ ] All question types (MCQ, MSQ, True/False, Numerical)
- [ ] Timer accuracy and sync
- [ ] Autosave reliability
- [ ] Resume from crash
- [ ] Offline mode
- [ ] Network recovery
- [ ] 1000+ question performance
- [ ] Dark mode on all screens
- [ ] Accessibility screen reader
- [ ] Tablet and landscape layouts
- [ ] Security measures effectiveness
- [ ] Scalability load test

---

> **Document Status**: Complete  
> **Last Updated**: July 11, 2026  
> **Next Review**: After Phase 1 implementation  
