import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Sidebar userEmail={user.email ?? null} courses={courses ?? []} />
      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}
