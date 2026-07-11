# Domain 16 — Course Management Architecture

## Phase 1: Architecture Analysis (Pre-Migration)

---

## 1. The Problem

The existing schema has **no Course entity**. The `content` table (Domain 03) stores individual learning materials (PDFs, videos, notes, assignments) — it is a **file catalog**, not a course catalog. It has no pricing, no enrollment tracking, no bundled curriculum, and no student purchase flow.

A **Course** is a top-level product that:
- Students browse in a catalog
- Students purchase or enroll into
- Has a defined curriculum (subjects, chapters)
- Owns batches, live classes, content, mock tests, and PYQs
- Tracks student progress
- Has reviews and ratings

The Course does **not replace** existing domains. It **organizes** them.

---

## 2. Integration with Existing Domains

### Which existing tables must **not** be modified

| Table (Domain) | Reason to NOT add a direct FK |
|---|---|
| `batches` (02) | A batch can exist without a course (pre-Course data). Adding `course_id` requires a migration that backfills all existing rows. |
| `live_classes` (04) | Same concern. `live_classes` is already referenced by `live_class_batch` and `live_sessions`. Adding another FK would require coordination across domains. |
| `content` (03) | Content items are self-standing; they can be assigned to a course but also exist independently for non-course usage. |
| `mock_tests` (05) | Same — tests can exist independently. Also already linked to batches via `batch_mock_tests`. |
| `pyq_packages` (06) | Standalone sellable items. Already have their own purchase flow (`student_pyq_purchases`). |

### Decision: Junction Tables

Following the same pattern as every existing M:M relationship in the schema:

| Existing Pattern | Domain 16 Equivalent |
|---|---|
| `batch_teachers` (teacher ↔ batch) | `course_teachers` (teacher ↔ course) |
| `batch_students` (student ↔ batch) | `course_enrollments` (student ↔ course) |
| `live_class_batch` (class ↔ batch) | `course_live_classes` (class ↔ course) |
| `batch_mock_tests` (test ↔ batch) | `course_mock_tests` (test ↔ course) |
| `content_tag` (content ↔ tag) | `course_content` (content ↔ course) |
| `pyq_mock_mappings` (paper ↔ test) | `course_pyq_packages` (package ↔ course) |
| `plan_unlocks` (plan ↔ feature) | `course_subjects` (course ↔ subject) |

**Why junction tables are the right choice:**
1. **Zero modifications** to existing tables — no FKs to backfill, no deployment risk
2. **Evolutionary**: A batch, class, or content item can optionally belong to a course without affecting non-course functionality
3. **Consistency**: Every existing M:M relationship in this schema uses a junction table. Adding direct FKs would break the established pattern.
4. **Scalability**: Junction tables support composite unique constraints that prevent duplicates elegantly

---

## 3. Proposed Tables

### Table 1: `courses` (Core Entity)

The central record — one row per purchasable educational product.

```
courses
├── course_id               UUID         PK, gen_random_uuid()
├── institute_id            UUID         NOT NULL, FK → institutes
├── stream_id               UUID         NOT NULL, FK → streams
├── name                    VARCHAR(300) NOT NULL       (e.g. "NEET 2026 Complete Preparation")
├── slug                    VARCHAR(300) NOT NULL       (e.g. "neet-2026-complete")
├── short_description       TEXT         NULL
├── long_description        TEXT         NULL
├── thumbnail_path          TEXT         NULL            (Supabase Storage path)
├── cover_image_path        TEXT         NULL            (hero/banner image)
├── price                   NUMERIC(10,2) NOT NULL      (0.00 for free courses)
├── original_price          NUMERIC(10,2) NULL          (strikethrough price)
├── currency                VARCHAR(3)    NOT NULL DEFAULT 'INR'
├── difficulty              difficulty_level NULL        (reuse Domain 01 enum)
├── language                VARCHAR(50)   NULL
├── duration_days           INTEGER       NULL           (expected completion days)
├── total_lectures          INTEGER       NOT NULL DEFAULT 0     (denormalized)
├── total_duration_seconds  INTEGER       NULL                (sum of all video durations)
├── avg_rating              NUMERIC(3,2)  NOT NULL DEFAULT 0.00 (denormalized from reviews)
├── review_count            INTEGER       NOT NULL DEFAULT 0   (denormalized from reviews)
├── total_enrollments       INTEGER       NOT NULL DEFAULT 0   (denormalized from enrollments)
├── is_featured             BOOLEAN       NOT NULL DEFAULT false
├── is_free                 BOOLEAN       NOT NULL DEFAULT false
├── status                  course_status NOT NULL DEFAULT 'draft'
├── published_at            TIMESTAMPTZ   NULL
├── created_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
├── updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
├── created_by              UUID          NOT NULL, FK → profiles
├── updated_by              UUID          NULL,     FK → profiles
├── deleted_at              TIMESTAMPTZ   NULL            (soft delete)

UNIQUE (institute_id, slug)
CHECK: price >= 0
CHECK: original_price IS NULL OR original_price >= price
CHECK: language IS NULL OR char_length(language) >= 2
CHECK: avg_rating >= 0.00 AND avg_rating <= 5.00
CHECK: (status = 'published'::course_status AND published_at IS NOT NULL)
       OR (status != 'published'::course_status AND published_at IS NULL)
```

**New Enum: `course_status`**

Following the `lifecycle_status` pattern from Domain 01 and `mock_test_status` from Domain 05:

```sql
CREATE TYPE course_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'published',
    'archived'
);
```

**Why `status` alone (no `is_published` boolean):**
- Following the exact same pattern as `mock_tests` (Domain 05) which uses `mock_test_status` enum + `published_at` without a separate boolean
- The `questions` table (Domain 05) also uses only `question_status` enum + `approved_at` — no redundant boolean
- PostgreSQL enum comparisons in WHERE clauses (e.g. `WHERE status = 'published'`) are fast — no performance benefit to duplicating
- Removes the risk of `is_published` and `status` getting out of sync
- The CHECK constraint above enforces that `published_at` IS NOT NULL when and only when `status = 'published'`

**Denormalized columns on `courses`:**
- `avg_rating` / `review_count`: Updated by trigger on `course_reviews`. Avoids expensive `AVG()` queries on every catalog page load. Same pattern as `teacher_details.rating`.
- `total_enrollments`: Updated by trigger on `course_enrollments`. Same pattern as `pyq_packages.total_papers` (updated via trigger on `pyq_papers`).
- `total_lectures`: Denormalized for fast listing display without COUNT queries on junction tables.

---

### Table 2: `course_enrollments` (Student Enrollment)

One row per student per course. Mirrors `student_pyq_purchases` and `batch_students`.

```
course_enrollments
├── enrollment_id      UUID         PK, gen_random_uuid()
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── student_id         UUID         NOT NULL, FK → student_details RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── order_item_id      UUID         NULL,     FK → order_items SET NULL
├── enrollment_type    VARCHAR(20)  NOT NULL DEFAULT 'purchase'
│   VALUES: 'purchase', 'admin_grant', 'subscription', 'free'
├── enrolled_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── expires_at         TIMESTAMPTZ  NULL
├── is_active          BOOLEAN      NOT NULL DEFAULT true
├── completed_at       TIMESTAMPTZ  NULL            (when student completed all content)
├── progress_percent   NUMERIC(5,2) NOT NULL DEFAULT 0.00  (denormalized)
├── last_accessed_at   TIMESTAMPTZ  NULL
├── revoked_at         TIMESTAMPTZ  NULL
├── revoked_reason     TEXT         NULL
├── created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
├── updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()

UNIQUE (course_id, student_id)
CHECK: enrollment_type IN ('purchase', 'admin_grant', 'subscription', 'free')
CHECK: progress_percent >= 0 AND progress_percent <= 100
CHECK: (revoked_at IS NOT NULL AND revoked_reason IS NOT NULL) OR (is_active = true)
CHECK: expires_at IS NULL OR expires_at > enrolled_at
```

**Design rationale:**
- `UNIQUE (course_id, student_id)` — same pattern as `student_pyq_purchases`; prevents duplicate enrollment
- `order_item_id` — links to the commerce order line item for purchase auditing; matches `student_pyq_purchases.order_item_id`
- `progress_percent` — denormalized for fast "continue learning" display; updated by **nightly batch job** (not a real-time trigger) to avoid write contention. Same pattern as `performance_reports` in Domain 08.
- `enrollment_type` — VARCHAR (not enum) following PYQ domain's `access_type` pattern for extensibility
- Soft-delete via `is_active` + `revoked_at`/`revoked_reason` — matches `student_pyq_purchases`

---

### Table 3: `course_reviews` (Ratings & Reviews)

One row per student per course. Students can leave exactly one review.

```
course_reviews
├── review_id          UUID         PK, gen_random_uuid()
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── student_id         UUID         NOT NULL, FK → student_details RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── rating             SMALLINT     NOT NULL          (1–5)
├── review_text        TEXT         NULL
├── is_approved        BOOLEAN      NOT NULL DEFAULT false
├── approved_at        TIMESTAMPTZ  NULL
├── approved_by        UUID         NULL,     FK → profiles SET NULL
├── helpful_count      INTEGER      NOT NULL DEFAULT 0
├── created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
├── updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()

UNIQUE (course_id, student_id)
CHECK: rating >= 1 AND rating <= 5
CHECK: review_text IS NULL OR char_length(review_text) >= 10
CHECK: (is_approved = true AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
       OR (is_approved = false)
```

**Why separate reviews from courses:**
- 1:M relationship — one course can have thousands of reviews
- Reviews need moderation (is_approved) — shouldn't live in the course row
- Matches the industry-standard normalized pattern

---

### Table 4: `course_teachers` (Teacher Assignment)

Junction table linking teachers to courses. Mirrors `batch_teachers`.

```
course_teachers
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── teacher_id         UUID         NOT NULL, FK → teacher_details RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── role               VARCHAR(50)  NULL      (e.g. 'lead_instructor', 'co_teacher', 'mentor')
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, teacher_id)
```

---

### Table 5: `course_batches` (Batch Assignment)

Junction table linking batches to courses.

```
course_batches
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── batch_id           UUID         NOT NULL, FK → batches RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, batch_id)
```

---

### Table 6: `course_live_classes` (Live Class Assignment)

Junction table linking live classes to courses.

```
course_live_classes
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── class_id           UUID         NOT NULL, FK → live_classes RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, class_id)
```

---

### Table 7: `course_content` (Content Assignment)

Junction table linking content to courses.

```
course_content
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── content_id         UUID         NOT NULL, FK → content RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── order_sequence     INTEGER      NOT NULL          (ordering within curriculum)
├── section_name       VARCHAR(100) NULL              (e.g. "Week 1", "Module A")
├── is_optional        BOOLEAN      NOT NULL DEFAULT false
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, content_id)
UNIQUE (course_id, order_sequence)
CHECK: order_sequence >= 1
```

---

### Table 8: `course_mock_tests` (Mock Test Assignment)

Junction table linking mock tests to courses. Mirrors `batch_mock_tests`.

```
course_mock_tests
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── test_id            UUID         NOT NULL, FK → mock_tests RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── order_sequence     INTEGER      NOT NULL
├── section_name       VARCHAR(100) NULL
├── is_optional        BOOLEAN      NOT NULL DEFAULT false
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, test_id)
UNIQUE (course_id, order_sequence)
CHECK: order_sequence >= 1
```

---

### Table 9: `course_pyq_packages` (PYQ Package Assignment)

Junction table linking PYQ packages to courses.

```
course_pyq_packages
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── package_id         UUID         NOT NULL, FK → pyq_packages RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── assigned_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
├── assigned_by        UUID         NULL,     FK → profiles SET NULL

PRIMARY KEY (course_id, package_id)
```

---

### Table 10: `course_subjects` (Subject/Curriculum Definition)

Defines which subjects are part of a course and their order. This creates the explicit curriculum.

```
course_subjects
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── subject_id         UUID         NOT NULL, FK → subjects RESTRICT
├── institute_id       UUID         NOT NULL, FK → institutes RESTRICT
├── order_sequence     INTEGER      NOT NULL
├── created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()

PRIMARY KEY (course_id, subject_id)
UNIQUE (course_id, order_sequence)
CHECK: order_sequence >= 1
```

**Why this exists:**
- A course's curriculum is defined by which subjects it covers
- This table allows explicit ordering of subjects in the course curriculum (e.g., Physics → Chemistry → Biology)
- Without this, the subject set would need to be derived by joining through content/chapters, which is expensive
- Enables "this course covers Physics, Chemistry, and Biology" display without subqueries

---

### Table 11: `course_prerequisites` (Prerequisite Courses)

Self-referencing junction for prerequisite chains.

```
course_prerequisites
├── course_id          UUID         NOT NULL, FK → courses RESTRICT
├── prerequisite_id    UUID         NOT NULL, FK → courses RESTRICT
├── created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()

PRIMARY KEY (course_id, prerequisite_id)
CHECK: course_id != prerequisite_id       (no self-prerequisite)
```

---

### Table 12: `course_progress` (Student Course Progress)

Tracks per-student completion status for each content item/mock test within a course.

```
course_progress
├── progress_id           UUID         PK, gen_random_uuid()
├── enrollment_id         UUID         NOT NULL, FK → course_enrollments CASCADE
├── course_id             UUID         NOT NULL, FK → courses RESTRICT
├── student_id            UUID         NOT NULL, FK → student_details RESTRICT
├── institute_id          UUID         NOT NULL, FK → institutes RESTRICT
├── resource_type         VARCHAR(20)  NOT NULL     ('content', 'mock_test', 'live_class')
├── resource_id           UUID         NOT NULL
├── is_completed          BOOLEAN      NOT NULL DEFAULT false
├── completed_at          TIMESTAMPTZ  NULL
├── time_spent_seconds    INTEGER      NOT NULL DEFAULT 0
├── score                 NUMERIC(7,2) NULL          (for mock tests; source of truth is mock_results)
├── created_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
├── updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()

UNIQUE (enrollment_id, resource_type, resource_id)
CHECK: resource_type IN ('content', 'mock_test', 'live_class')
CHECK: time_spent_seconds >= 0
```

**Why polymorphic `resource_type` + `resource_id`:**
- A course has multiple resource types (content items, mock tests, live classes)
- Having separate tables for each would multiply complexity (3 tables instead of 1)
- Same polymorphic pattern used by `notifications.reference_type`/`reference_id` (Domain 09) and `approval_requests.resource_type`/`resource_id` (Domain 03)
- `course_id` and `student_id` are denormalized on this table for query performance (same as `chapter_performances.subject_id` denormalization in Domain 08)
- The `enrollment_id` FK with ON DELETE CASCADE means when an enrollment is removed, all progress rows are auto-cleaned

**Performance note:** `course_progress` is a write-heavy table. The `time_spent_seconds` column is designed for atomic increment via `SET time_spent_seconds = time_spent_seconds + :delta` (no need to read before write). The `progress_percent` on `course_enrollments` is **not** updated by a per-row trigger — instead it is recalculated by a nightly batch job (same pattern as `performance_reports` in Domain 08), avoiding write contention during exam sessions.

---

## 4. How Data Flows (Key Use Cases)

### Trending Courses (Home Screen)
```
SELECT * FROM courses
WHERE status = 'published'::course_status
  AND institute_id = :instituteId
ORDER BY published_at DESC
LIMIT 10
```
No joins needed for the listing — everything a card needs is on `courses` (name, price, thumbnail, avg_rating, total_enrollments). Formerly used `content` table which lacked pricing, ratings, and enrollment data.

### Course Detail (Purchase Page)
```
SELECT c.*, ct.role, p.name as instructor_name
FROM courses c
LEFT JOIN course_teachers ct ON ct.course_id = c.course_id
LEFT JOIN teacher_details td ON td.teacher_id = ct.teacher_id
LEFT JOIN profiles p ON p.profile_id = td.profile_id
WHERE c.course_id = :courseId
```
Plus: fetch subjects (via `course_subjects`), batches (via `course_batches`), and a preview of content sections (via `course_content`).

### Student Dashboard: "My Courses"
```
SELECT c.*, ce.progress_percent, ce.last_accessed_at
FROM course_enrollments ce
JOIN courses c ON c.course_id = ce.course_id
WHERE ce.student_id = :studentId
  AND ce.is_active = true
ORDER BY ce.last_accessed_at DESC NULLS LAST
```

### Continue Learning
```
SELECT cp.*, c.name as course_title, c.thumbnail_path
FROM course_progress cp
JOIN course_enrollments ce ON ce.enrollment_id = cp.enrollment_id
JOIN courses c ON c.course_id = ce.course_id
WHERE ce.student_id = :studentId
  AND cp.is_completed = false
ORDER BY cp.updated_at DESC
LIMIT 5
```

---

## 5. Indexing Strategy

Following the existing patterns (partial indexes, composite indexes for query patterns):

### `courses`
```sql
-- Catalog listing: published courses, newest first
CREATE INDEX idx_courses_institute_published
  ON courses (institute_id, published_at DESC)
  WHERE status = 'published'::course_status;

-- Featured courses for homepage
CREATE INDEX idx_courses_institute_featured
  ON courses (institute_id, is_featured)
  WHERE is_featured = true AND status = 'published'::course_status;

-- Price filtering for store
CREATE INDEX idx_courses_institute_price
  ON courses (institute_id, price)
  WHERE status = 'published'::course_status;

-- Soft-delete exclusion (all active queries exclude deleted rows)
CREATE INDEX idx_courses_deleted_at
  ON courses (deleted_at)
  WHERE deleted_at IS NULL;

-- Catalog search by name (trigram index for ILIKE queries)
CREATE INDEX idx_courses_name_trgm
  ON courses USING gin (name gin_trgm_ops);
```

### `course_enrollments`
```sql
-- "My Courses" query: student's active enrollments
CREATE INDEX idx_course_enrollments_student_active
  ON course_enrollments (student_id, is_active);

-- Student enrollment count per course (for total_enrollments trigger)
CREATE INDEX idx_course_enrollments_course_active
  ON course_enrollments (course_id, is_active);

-- Expiry job for time-limited enrollments
CREATE INDEX idx_course_enrollments_expires
  ON course_enrollments (expires_at)
  WHERE expires_at IS NOT NULL AND is_active = true;
```

### `course_progress`
```sql
-- Resume / continue learning: find incomplete items for an enrollment
CREATE INDEX idx_course_progress_enrollment_incomplete
  ON course_progress (enrollment_id, is_completed, updated_at DESC);

-- Student-wide progress queries (for dashboard)
CREATE INDEX idx_course_progress_student_resource
  ON course_progress (student_id, resource_type, is_completed);
```

### Junction tables (all follow same pattern)
```sql
CREATE INDEX idx_course_teachers_course ON course_teachers (course_id);
CREATE INDEX idx_course_teachers_teacher ON course_teachers (teacher_id);
CREATE INDEX idx_course_batches_course ON course_batches (course_id);
CREATE INDEX idx_course_batches_batch ON course_batches (batch_id);
CREATE INDEX idx_course_live_classes_course ON course_live_classes (course_id);
CREATE INDEX idx_course_live_classes_class ON course_live_classes (class_id);
CREATE INDEX idx_course_content_course ON course_content (course_id);
CREATE INDEX idx_course_mock_tests_course ON course_mock_tests (course_id);
CREATE INDEX idx_course_pyq_packages_course ON course_pyq_packages (course_id);
CREATE INDEX idx_course_subjects_course ON course_subjects (course_id);
```

---

## 6. RLS Policies

Following the same role-based pattern as every existing domain (see `021_rls_policies.sql`):

### `courses`
```sql
-- Admins: full CRUD within their institute
CREATE POLICY "Admins have full access to courses"
  ON courses FOR ALL TO authenticated
  USING (institute_id = get_my_institute_id() AND is_admin())
  WITH CHECK (institute_id = get_my_institute_id() AND is_admin());

-- Teachers: read published courses, manage courses they teach
CREATE POLICY "Teachers can read published courses"
  ON courses FOR SELECT TO authenticated
  USING (status = 'published'::course_status AND institute_id = get_my_institute_id());

CREATE POLICY "Teachers can manage courses they teach"
  ON courses FOR ALL TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_teachers WHERE teacher_id = get_my_teacher_id()
  ))
  WITH CHECK (course_id IN (
    SELECT course_id FROM course_teachers WHERE teacher_id = get_my_teacher_id()
  ));

-- Students: read enrolled courses
CREATE POLICY "Students can read their enrolled courses"
  ON courses FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_enrollments WHERE student_id = get_my_student_id()
  ));

-- All authenticated: browse published catalog
CREATE POLICY "All authenticated can browse published courses"
  ON courses FOR SELECT TO authenticated
  USING (status = 'published'::course_status AND institute_id = get_my_institute_id());
```

### `course_enrollments`
```sql
-- Students: read own enrollments
CREATE POLICY "Students can read their own enrollments"
  ON course_enrollments FOR SELECT TO authenticated
  USING (student_id = get_my_student_id());

-- Admins: full access within institute
CREATE POLICY "Admins have full access to course_enrollments"
  ON course_enrollments FOR ALL TO authenticated
  USING (institute_id = get_my_institute_id() AND is_admin())
  WITH CHECK (institute_id = get_my_institute_id() AND is_admin());

-- Teachers: read enrollments for courses they teach
CREATE POLICY "Teachers can read enrollments for their courses"
  ON course_enrollments FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_teachers WHERE teacher_id = get_my_teacher_id()
  ));
```

### `course_reviews`
```sql
-- Students: CRUD their own reviews
CREATE POLICY "Students can manage their own reviews"
  ON course_reviews FOR ALL TO authenticated
  USING (student_id = get_my_student_id())
  WITH CHECK (student_id = get_my_student_id());

-- All authenticated: read approved reviews
CREATE POLICY "All authenticated can read approved reviews"
  ON course_reviews FOR SELECT TO authenticated
  USING (is_approved = true);

-- Admins: manage all reviews (for moderation)
CREATE POLICY "Admins have full access to course_reviews"
  ON course_reviews FOR ALL TO authenticated
  USING (institute_id = get_my_institute_id() AND is_admin())
  WITH CHECK (institute_id = get_my_institute_id() AND is_admin());
```

### `course_progress`
```sql
-- Students: manage their own progress rows
CREATE POLICY "Students can manage their own course_progress"
  ON course_progress FOR ALL TO authenticated
  USING (student_id = get_my_student_id())
  WITH CHECK (student_id = get_my_student_id());

-- Admins: full access
CREATE POLICY "Admins have full access to course_progress"
  ON course_progress FOR ALL TO authenticated
  USING (institute_id = get_my_institute_id() AND is_admin())
  WITH CHECK (institute_id = get_my_institute_id() AND is_admin());

-- Teachers: read progress for students in courses they teach
CREATE POLICY "Teachers can read course_progress for their courses"
  ON course_progress FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_teachers WHERE teacher_id = get_my_teacher_id()
  ));
```

### Junction tables (all follow same pattern)
```sql
-- Admins: full CRUD
CREATE POLICY "Admins have full access to {table}"
  ON {table} FOR ALL TO authenticated
  USING (institute_id = get_my_institute_id() AND is_admin())
  WITH CHECK (institute_id = get_my_institute_id() AND is_admin());

-- Teachers: read for courses they teach
CREATE POLICY "Teachers can read {table} for their courses"
  ON {table} FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_teachers WHERE teacher_id = get_my_teacher_id()
  ));

-- Students: read for courses they are enrolled in
CREATE POLICY "Students can read {table} for their enrolled courses"
  ON {table} FOR SELECT TO authenticated
  USING (course_id IN (
    SELECT course_id FROM course_enrollments WHERE student_id = get_my_student_id()
  ));
```

---

## 7. Triggers

### Standard `set_updated_at` triggers
Applied to: `courses`, `course_enrollments`, `course_reviews`, `course_progress`.
```sql
CREATE TRIGGER trg_courses_set_updated_at
  BEFORE UPDATE ON courses FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

### `trg_courses_set_published_at`
Auto-sets `published_at` when `status` transitions to 'published'. Same pattern as the notification soft-delete trigger (`trg_notifications_set_deleted_at`):
```sql
CREATE OR REPLACE FUNCTION public.trgfn_courses_set_published_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published'::course_status
     AND (OLD.status IS DISTINCT FROM 'published'::course_status) THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  ELSIF NEW.status IS DISTINCT FROM 'published'::course_status THEN
    NEW.published_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_courses_set_published_at
  BEFORE UPDATE ON courses FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trgfn_courses_set_published_at();
```

### Rating denormalization triggers
A pair of triggers on `course_reviews` that update `courses.avg_rating` and `courses.review_count`. Mirror of the `pyq_packages.total_papers` denormalization pattern:
```sql
CREATE OR REPLACE FUNCTION public.trgfn_courses_maintain_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.courses
  SET avg_rating = COALESCE(
    (SELECT ROUND(AVG(rating)::numeric, 2) FROM public.course_reviews
     WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) AND is_approved = true),
  0.00),
    review_count = (
      SELECT COUNT(*) FROM public.course_reviews
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id) AND is_approved = true
    )
  WHERE course_id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_course_reviews_maintain_course_rating
  AFTER INSERT OR UPDATE OR DELETE ON course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trgfn_courses_maintain_rating();
```

### Enrollment count denormalization trigger
Updates `courses.total_enrollments` when enrollments change. Same pattern as the rating trigger above.

**Note on `course_progress`:** Unlike early designs, there is **no trigger** that recomputes `progress_percent` on every progress row update. During a 180-minute mock test, a student could generate 100+ `time_spent_seconds` updates. A trigger per update would cause write amplification. Instead, `progress_percent` on `course_enrollments` is recalculated by a **nightly batch job** — matching the `performance_reports` pattern in Domain 08. For near-real-time progress display, the frontend can calculate `is_completed` ratio from `course_progress` directly (which only queries a few rows per student).

---

## 8. Soft Delete Strategy

- **`courses`**: `deleted_at` timestamp. Non-null = soft-deleted. Courses are audit records and should never be hard-deleted. All application queries filter `WHERE deleted_at IS NULL`. ON DELETE RESTRICT on enrollment FKs prevents accidental deletion of courses with active enrollments.
- **`course_enrollments`**: `is_active` boolean + `revoked_at`/`revoked_reason`. Same pattern as `student_pyq_purchases`. Revocation preserves the enrollment record for audit; students simply lose active access.
- **`course_reviews`**: Hard-delete allowed — student can delete their own review. Admin can soft-hide via `is_approved = false` (moderation flag).
- **All junction tables**: Hard-delete allowed — unlinking a resource from a course should clean up the junction row. No audit trail needed for the link.

---

## 9. Migration File Structure

Following the exact same structure as existing domains. The migration file should be numbered to follow the latest migration chronologically:

```
supabase/migrations/032_domain_16_course_management.sql
```

(Current latest is `025_phone_format_supabase.sql` in the React app. Number `032` provides gap room and aligns with the website project's migration numbering which goes up to `031`.)

**Order of DDL within the migration:**
1. New enum types (idempotent DO blocks)
2. Tables (dependency order: parent → child → junction):
   a. `courses` (no external dependencies besides institutes, streams)
   b. `course_subjects`, `course_prerequisites` (depends on courses)
   c. `course_teachers`, `course_batches` (junction tables)
   d. `course_live_classes`, `course_content`, `course_mock_tests`, `course_pyq_packages`
   e. `course_enrollments` (depends on courses + student_details)
   f. `course_reviews` (depends on courses + student_details)
   g. `course_progress` (depends on enrollments)
3. Indexes (after all tables exist)
4. Functions (table-referencing triggers)
5. Triggers (after all functions exist)
6. Comments (every table, column, and constraint)

RLS policies will follow in an updated `021_rls_policies.sql` (or a dedicated migration) — same as the existing pattern where all policies live in migration `021`.

---

## 10. Summary

### Tables (12 total)

| # | Table | Type | Purpose |
|---|---|---|---|
| 1 | `courses` | Core | The course entity — pricing, metadata, status |
| 2 | `course_enrollments` | Core | Student enrollment and progress summary |
| 3 | `course_reviews` | Core | Student ratings and reviews |
| 4 | `course_teachers` | Junction | M:M teachers ↔ courses |
| 5 | `course_batches` | Junction | M:M batches ↔ courses |
| 6 | `course_live_classes` | Junction | M:M live_classes ↔ courses |
| 7 | `course_content` | Junction | M:M content ↔ courses (ordered) |
| 8 | `course_mock_tests` | Junction | M:M mock_tests ↔ courses (ordered) |
| 9 | `course_pyq_packages` | Junction | M:M pyq_packages ↔ courses |
| 10 | `course_subjects` | Junction | M:M subjects ↔ courses (curriculum) |
| 11 | `course_prerequisites` | Junction | Self-referencing prerequisite chain |
| 12 | `course_progress` | Event Log | Per-student item-level progress tracking |

### Stats

| Metric | Count |
|---|---|
| **New tables** | 12 |
| **Existing domains modified** | 0 |
| **New enums** | 1 (`course_status`) |
| **New functions** | 3 (`set_published_at`, `maintain_rating`, `maintain_enrollment_count`) |
| **New triggers** | ~6 (updated_at × 4, published_at, rating, enrollment) |
| **New RLS policies** | ~30 (across 12 tables × 2–3 policies each) |

### Existing Patterns Reused

| Pattern | Source | Used In |
|---|---|---|
| `gen_random_uuid()` PK | All domains | All 12 tables |
| `institute_id` denormalization | All domains | All 12 tables |
| `set_updated_at()` trigger | Domain 01 | 4 tables |
| `lifecycle_status` enum pattern | Domain 01, 05 | `course_status` |
| Soft delete via `deleted_at` | Domain 02 (batches) | `courses` |
| Junction table pattern | Domains 02–06 | 7 junction tables |
| Composite PK on junctions | Domains 02, 04, 05 | All junction tables |
| `published_at` auto-setter trigger | Domain 09 (notifications) | `courses` |
| `is_active` + revocation audit | Domain 06 (student_pyq_purchases) | `course_enrollments` |
| `enrollment_type` VARCHAR (not enum) | Domain 06 (`access_type`) | `course_enrollments` |
| `avg_rating` denormalization | Domain 01 (teacher_details) | `courses` |
| Denormalized counters via trigger | Domain 06 (`pyq_packages.total_papers`) | `courses.total_enrollments` |
| Polymorphic resource reference | Domain 03 (approval_requests), 09 (notifications) | `course_progress` |
| ON DELETE CASCADE for aggregations | Domain 08 (analytics children) | `course_progress` → enrollment |
| Partial indexes | All domains | `idx_courses_*` |
| RLS: admin full + role-scoped read | Domain 03, 05, etc. | All tables |

---

## 11. How This Unblocks the App Integration

The current Trending Courses implementation (`courseService.ts`) uses the `content` table as a placeholder. With `courses` in place:

| Requirement | Current (`content` table) | Future (`courses` table) |
|---|---|---|
| Title | ✅ `title` | ✅ `name` |
| Description | ✅ `description` | ✅ `short_description` |
| Price | ❌ `0` (default) | ✅ `price`, `original_price` |
| Rating | ❌ `0` (default) | ✅ `avg_rating` (from reviews) |
| Student count | ❌ `view_count` (wrong metric) | ✅ `total_enrollments` (from enrollments) |
| Instructor name | ❌ `""` (requires 2 joins) | ✅ Via `course_teachers` → `teacher_details` → `profiles` |
| Category | ❌ `""` (requires subject join) | ✅ `stream_id` direct FK |
| Thumbnail | ✅ `thumbnail_bucket/path` | ✅ `thumbnail_path` (simplified) |
| Bestseller badge | ❌ `false` (default) | ✅ `is_featured` |
| Language | ❌ Not available | ✅ `language` column |
| Difficulty | ❌ Not available | ✅ `difficulty` (Domain 01 enum) |
