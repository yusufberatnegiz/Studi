-- Atomically records one graded answer. This prevents concurrent exam submissions
-- from reading the same counters and overwriting each other.
--
-- Backout:
--   DROP FUNCTION IF EXISTS public.increment_topic_stat(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.increment_topic_stat(
  p_course_id uuid,
  p_topic text,
  p_is_correct boolean
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  INSERT INTO public.topic_stats (
    user_id,
    course_id,
    topic,
    attempts,
    correct,
    updated_at
  )
  VALUES (
    auth.uid(),
    p_course_id,
    p_topic,
    1,
    CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, course_id, topic)
  DO UPDATE SET
    attempts = public.topic_stats.attempts + 1,
    correct = public.topic_stats.correct + CASE WHEN EXCLUDED.correct = 1 THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE public.topic_stats.user_id = auth.uid();
$$;
