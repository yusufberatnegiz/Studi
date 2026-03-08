import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PracticeClient from "./practice-client";
import { submitAttempt } from "./actions";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: questionSet } = await supabase
    .from("question_sets")
    .select("id, title, course_id, courses(title)")
    .eq("id", setId)
    .eq("user_id", user.id)
    .single();

  if (!questionSet) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, solution_text, topic, difficulty, index_in_set")
    .eq("question_set_id", setId)
    .order("index_in_set", { ascending: true });

  if (!questions || questions.length === 0) notFound();

  const courseTitle =
    Array.isArray(questionSet.courses) && questionSet.courses.length > 0
      ? (questionSet.courses[0] as { title: string }).title
      : "Course";

  return (
    <PracticeClient
      questionSet={{
        id: questionSet.id,
        title: questionSet.title,
        courseId: questionSet.course_id,
        courseTitle,
      }}
      questions={questions}
      action={submitAttempt}
    />
  );
}
