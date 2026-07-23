-- ============================================================================
-- Migration: 062 — Fix content-pdfs Storage RLS (SELECT for students)
--
-- PostgreSQL 16 | Supabase Storage Compatible | Production Ready
--
-- Issue:
--   The current Storage SELECT policy `content_pdfs_select_teacher_own`
--   restricts SELECT to `owner = auth.uid()`. Since PDFs are uploaded by
--   teachers, the `owner` column contains the teacher's UUID. When a student
--   (whose `auth.uid()` differs) calls `createSignedUrl()` for a content PDF,
--   Supabase evaluates the SELECT policy, finds no matching row
--   (student UUID ≠ teacher UUID), and returns "Object not found" (404)
--   instead of the signed URL — even though the object exists in storage.
--
-- Fix:
--   1. Drops the overly restrictive `content_pdfs_select_teacher_own` policy.
--   2. Creates a new SELECT policy that allows any authenticated user who is
--      a student, teacher, or admin to read objects in the `content-pdfs`
--      bucket.
--
-- Why this is safe:
--   - The bucket remains PRIVATE (public = false). Only authenticated users
--     can interact with it.
--   - The table-level RLS on `public.content` (migration 021) already
--     restricts which specific content database rows a student can query:
--       - Only approved content
--       - Content assigned to their batch via batch_contents
--     The Storage-level policy does NOT need to duplicate this logic.
--   - INSERT/UPDATE/DELETE policies are completely untouched — teachers and
--     admins retain exclusive upload/edit/delete access.
--   - `createSignedUrl()` produces a time-limited URL (default 300s) which
--     further limits exposure.
--
-- Depends on:
--   Migration 022 (storage buckets and base policies)
--   Migration 021 (helper functions: public.is_student(), public.is_teacher(),
--                   public.is_admin())
--
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1 — Drop the restrictive owner-only SELECT policy
-- ════════════════════════════════════════════════════════════════════════════
-- This policy was causing createSignedUrl() to return 404 for any user who
-- is not the storage object owner (i.e., any student).

drop policy if exists "content_pdfs_select_teacher_own" on storage.objects;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2 — Create an inclusive SELECT policy for all authenticated roles
-- ════════════════════════════════════════════════════════════════════════════
-- Allows SELECT for:
--   - The uploader (teacher/admin matching owner = auth.uid())
--   - Any authenticated student (public.is_student())
--   - Any authenticated teacher (public.is_teacher())
--   - Any authenticated admin (public.is_admin())
--
-- This is intentionally not open to `to public` (anonymous users cannot read).
-- Fine-grained access control is enforced at the table level on
-- `public.content` (see migration 021).

create policy "content_pdfs_select_authenticated"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'content-pdfs'
    and (
      owner = auth.uid()
      or public.is_student()
      or public.is_teacher()
      or public.is_admin()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION — 062 Fix content-pdfs Storage RLS
-- ════════════════════════════════════════════════════════════════════════════
