import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmailConfirmedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4">
      <Card className="w-full max-w-md text-center shadow-lg border border-gray-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Email confirmed
          </CardTitle>
          <CardDescription className="text-gray-500 dark:text-zinc-400 mt-1">
            Your email address has been verified. You can now sign in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Link href="/auth">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
