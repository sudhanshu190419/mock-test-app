/**
 * Student Live Class Service
 *
 * Fetches live classes assigned to the student's active batches via the
 * `live_class_batch` junction table.
 *
 * ## Query Pattern
 *
 * The teacher service queries `live_classes` directly by `teacher_id`.
 * The student service instead queries through `live_class_batch` filtered
 * by the student's batch IDs, then joins `live_classes` to get class
 * details.
 *
 * ## Tables Used
 *
 * - `live_class_batch`  — junction: class_id ↔ batch_id
 * - `live_classes`      — core table: title, status, scheduled_at, etc.
 * - `batches`           — batch name resolution
 * - `batch_teachers`    — teacher resolution per batch
 * - `teacher_details`   — teacher_id → profile_id
 * - `profiles`          — teacher display name
 * - `live_sessions`     — session status (live/ended) and timestamps
 *
 * ## Statuses
 *
 * | Tab          | live_classes.status       |
 * |--------------|--------------------------|
 * | Upcoming     | 'scheduled'              |
 * | Live Now     | 'live'                   |
 * | Completed    | 'completed', 'cancelled' |
 *
 * @module services/student/studentLiveClassService
 */

import { supabase } from '../../config/supabase';

// ═══════════════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════════════

/** Mirror of teacher's LiveClassStatus for students. */
export type StudentLiveClassStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

/** A live class as displayed in the student dashboard. */
export interface StudentLiveClassItem {
  /** UUID from live_classes.class_id. */
  classId: string;
  /** Class title. */
  title: string;
  /** Current status. */
  status: StudentLiveClassStatus;
  /** ISO 8601 scheduled start time. */
  scheduledAt: string;
  /** Duration in minutes. */
  durationMin: number;
  /** Batch name(s) this class is assigned to (e.g. "Physics Batch"). */
  batchName: string;
  /** Teacher display name (resolved via profiles). */
  teacherName: string | null;
  /** Description, if available. */
  description: string | null;
  /** Whether recording is enabled. */
  isRecorded: boolean;
  /** LiveKit room name (from live_classes.room_name) for joining the live session. */
  roomName: string | null;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last update timestamp. */
  updatedAt: string;
  /** Session status if currently live. */
  sessionStatus: 'waiting' | 'live' | 'ended' | null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Raw DB Shape
// ═══════════════════════════════════════════════════════════════════════════

interface DbLiveClassBatchRow {
  class_id: string;
  batch_id: string;
  live_classes: {
    class_id: string;
    title: string;
    status: string;
    scheduled_at: string;
    duration_min: number;
    description: string | null;
    is_recorded: boolean;
    room_name: string | null;
    teacher_id: string;
    created_at: string;
    updated_at: string;
  };
  batches: {
    name: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Service
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a teacher name map from an array of teacher IDs.
 *
 * Query pattern: batch_teachers → teacher_details → profiles (name)
 * Mirrors the pattern used in getCourseBatches().
 */
async function buildTeacherNameMap(
  teacherIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (teacherIds.length === 0) return map;

  try {
    const { data } = await supabase
      .from('teacher_details')
      .select('teacher_id, profiles!inner (name)')
      .in('teacher_id', teacherIds);

    if (data) {
      for (const row of data as any[]) {
        map.set(row.teacher_id, row.profiles?.name ?? '');
      }
    }
  } catch (err) {
    console.warn('[LiveClassService] Failed to fetch teacher names:', err);
  }

  return map;
}

/**
 * Fetch live classes for the given batch IDs, optionally filtered by status.
 *
 * Queries through `live_class_batch` with nested joins on `live_classes`
 * and `batches`. Results are deduplicated by class_id since a class may
 * be assigned to multiple batches the student belongs to.
 *
 * Also fetches the latest `live_sessions` status for 'live' classes.
 *
 * @param batchIds - Array of batch UUIDs the student is enrolled in.
 * @param statuses - Optional array of statuses to filter by (e.g. ['scheduled']).
 *                   When omitted, ALL statuses are returned.
 * @returns Deduplicated StudentLiveClassItem array.
 */
async function getStudentLiveClassesByStatus(
  batchIds: string[],
  statuses?: StudentLiveClassStatus[],
): Promise<StudentLiveClassItem[]> {
  if (batchIds.length === 0) return [];

  try {
    // 1. Query live_class_batch with joins
    let query = supabase
      .from('live_class_batch')
      .select(
        `
          class_id,
          batch_id,
          live_classes!inner (
            class_id,
            title,
            status,
            scheduled_at,
            duration_min,
            description,
            is_recorded,
            room_name,
            teacher_id,
            created_at,
            updated_at
          ),
          batches!inner (name)
        `,
      )
      .in('batch_id', batchIds);

    // If statuses are specified, apply to nested live_classes
    if (statuses && statuses.length > 0) {
      query = query.in('live_classes.status', statuses);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[LiveClassService] Query error:', error.code, error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const rows = data as unknown as DbLiveClassBatchRow[];

    // 2. Deduplicate by class_id (a class may appear in multiple batches)
    const classMap = new Map<string, StudentLiveClassItem>();
    const teacherIds = new Set<string>();

    for (const row of rows) {
      const c = row.live_classes;
      if (classMap.has(c.class_id)) continue;

      teacherIds.add(c.teacher_id);

      classMap.set(c.class_id, {
        classId: c.class_id,
        title: c.title,
        status: c.status as StudentLiveClassStatus,
        scheduledAt: c.scheduled_at,
        durationMin: c.duration_min,
        batchName: row.batches?.name ?? 'Unknown Batch',
        teacherName: null, // resolved in step 3
        description: c.description,
        isRecorded: c.is_recorded ?? false,
        roomName: c.room_name ?? null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        sessionStatus: null, // resolved in step 4
      });
    }

    // 3. Resolve teacher names
    const teacherNameMap = await buildTeacherNameMap([...teacherIds]);
    for (const [classId, item] of classMap) {
      // Find the teacher_id from a row (reverse lookup)
      const row = rows.find((r) => r.live_classes.class_id === classId);
      if (row) {
        item.teacherName = teacherNameMap.get(row.live_classes.teacher_id) ?? null;
      }
    }

    // 4. For 'live' classes, fetch session status
    const liveClassIds = [...classMap.values()]
      .filter((item) => item.status === 'live')
      .map((item) => item.classId);

    if (liveClassIds.length > 0) {
      try {
        const { data: sessions } = await supabase
          .from('live_sessions')
          .select('class_id, status')
          .in('class_id', liveClassIds)
          .eq('status', 'live')
          .limit(liveClassIds.length);

        if (sessions) {
          const sessionMap = new Map(
            (sessions as any[]).map((s) => [s.class_id, s.status as 'waiting' | 'live' | 'ended']),
          );
          for (const classId of liveClassIds) {
            const item = classMap.get(classId);
            if (item) {
              item.sessionStatus = sessionMap.get(classId) ?? null;
            }
          }
        }
      } catch (sessionErr) {
        console.warn('[LiveClassService] Failed to fetch session status:', sessionErr);
      }
    }

    return [...classMap.values()];
  } catch (err) {
    console.error('[LiveClassService] Unexpected error:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch UPCOMING scheduled live classes for the student's batches.
 *
 * Returns classes with status = 'scheduled' and where scheduled_at is in
 * the future, sorted by scheduled_at ascending (nearest first).
 *
 * @param batchIds - Array of batch UUIDs the student is enrolled in.
 * @returns Upcoming live classes, newest upcoming first.
 */
export async function getStudentUpcomingClasses(
  batchIds: string[],
): Promise<StudentLiveClassItem[]> {
  const classes = await getStudentLiveClassesByStatus(batchIds, ['scheduled']);

  const now = new Date().toISOString();
  const nowMs = Date.now();

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('[DEBUG] getStudentUpcomingClasses()');
  console.log('═══════════════════════════════════════');
  console.log('now (toISOString):', now);
  console.log('now (Date.now()):', nowMs);
  console.log('total classes received from DB:', classes.length);

  classes.forEach((c, i) => {
    const scheduledMs = new Date(c.scheduledAt).getTime();
    const isoCompare = c.scheduledAt >= now;
    const msCompare = scheduledMs >= nowMs;
    const kept = isoCompare;

    console.log('');
    console.log(`--- Class ${i + 1} ---`);
    console.log('title:', c.title);
    console.log('classId:', c.classId);
    console.log('raw scheduledAt from Supabase:', JSON.stringify(c.scheduledAt));
    console.log('typeof scheduledAt:', typeof c.scheduledAt);
    console.log('scheduledAt length:', c.scheduledAt?.length);
    console.log('scheduledAt chars:', c.scheduledAt?.split('').map(ch => ch.charCodeAt(0)).join(',') || 'N/A');
    console.log('scheduledAs Date.parse():', Date.parse(c.scheduledAt));
    console.log('scheduledAs .getTime():', scheduledMs);
    console.log('new Date(scheduledAt):', new Date(c.scheduledAt).toString());
    console.log('str compare  "' + c.scheduledAt + '" >= "' + now + '"  =>', isoCompare);
    console.log('ms compare   ' + scheduledMs + ' >= ' + nowMs + '  =>', msCompare);
    console.log('KEPT:', kept ? 'YES' : 'FILTERED OUT ❌');
  });

  const filtered = classes.filter((c) => c.scheduledAt >= now);

  console.log('');
  console.log('--- RESULT ---');
  console.log('classes after filter:', filtered.length);
  console.log('kept classIds:', filtered.map((c) => c.classId));
  console.log('═══════════════════════════════════════');
  console.log('');

  // Filter to future classes and sort by soonest first
  return filtered
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
}

/**
 * Fetch currently LIVE classes for the student's batches.
 *
 * Returns classes with status = 'live', sorted by scheduled_at descending
 * (most recently started first).
 *
 * @param batchIds - Array of batch UUIDs the student is enrolled in.
 * @returns Currently live classes.
 */
export async function getStudentLiveNowClasses(
  batchIds: string[],
): Promise<StudentLiveClassItem[]> {
  const classes = await getStudentLiveClassesByStatus(batchIds, ['live']);
  return classes.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );
}

/**
 * Fetch COMPLETED or CANCELLED live classes for the student's batches.
 *
 * Returns classes with status = 'completed' or 'cancelled', sorted by
 * scheduled_at descending (newest first).
 *
 * @param batchIds - Array of batch UUIDs the student is enrolled in.
 * @returns Completed live classes.
 */
export async function getStudentCompletedClasses(
  batchIds: string[],
): Promise<StudentLiveClassItem[]> {
  const classes = await getStudentLiveClassesByStatus(batchIds, [
    'completed',
    'cancelled',
  ]);
  return classes.sort(
    (a, b) =>
      new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
  );
}
