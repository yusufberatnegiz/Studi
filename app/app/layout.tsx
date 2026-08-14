import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";
import PaddleProvider from "@/components/paddle-provider";
import PaddleRetainInit from "@/components/paddle-retain-init";
import RememberMeGuard from "@/components/remember-me-guard";

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

  const [{ data: courses }, { data: profile }] = await Promise.all([
    supabase.from("courses").select("id, title").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("paddle_customer_id").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Sidebar userEmail={user.email ?? null} courses={courses ?? []} />
      <div className="flex-1 min-w-0">{children}</div>
      <RememberMeGuard />
      <PaddleProvider />
      {user.email && (
        <PaddleRetainInit
          email={user.email}
          paddleCustomerId={profile?.paddle_customer_id ?? null}
        />
      )}
    </div>
  );
}
