-- Migration: create exam_files table with correct RLS policies
-- Stores metadata for past exam files uploaded per course.
-- Files are stored in the exam-uploads bucket under:
--   {user_id}/exam-files/{course_id}/{uuid}-{filename}
-- This keeps the user_id as the first path component, consistent with
-- the existing source-material upload policy on the same bucket.

-- ── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exam_files (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    uuid        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename     text        NOT NULL,
  storage_path text        NOT NULL,
  file_size    bigint,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE exam_files ENABLE ROW LEVEL SECURITY;

-- SELECT: users can only read their own rows
CREATE POLICY "exam_files: owner can select"
  ON exam_files
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: users can only insert rows where user_id matches their own uid
-- Course ownership is verified in the server action before this insert runs.
CREATE POLICY "exam_files: owner can insert"
  ON exam_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own rows
CREATE POLICY "exam_files: owner can delete"
  ON exam_files
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Storage policies (exam-uploads bucket) ─────────────────────────────────
-- The existing source-material policy already covers paths starting with
-- auth.uid(). Exam files now follow the same convention:
--   {user_id}/exam-files/{course_id}/...
-- so no additional storage policy is needed as long as the existing
-- bucket policy allows INSERT/SELECT/DELETE for paths where
-- (storage.foldername(name))[1] = auth.uid()::text.
--
-- If the bucket has no policy yet (fresh setup), add these:
--
-- INSERT:
-- CREATE POLICY "exam-uploads: owner insert"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (
--     bucket_id = 'exam-uploads'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- SELECT:
-- CREATE POLICY "exam-uploads: owner select"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (
--     bucket_id = 'exam-uploads'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
--
-- DELETE:
-- CREATE POLICY "exam-uploads: owner delete"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (
--     bucket_id = 'exam-uploads'
--     AND (storage.foldername(name))[1] = auth.uid()::text
--   );
