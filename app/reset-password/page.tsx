"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await sendPasswordReset(email);

    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="Exai" className="h-8 w-8 object-contain" />
        <span className="font-semibold text-gray-900 dark:text-white tracking-tight text-lg">Exai</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{sent ? "Reset Link Sent" : "Reset password"}</CardTitle>
          {!sent && (
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link.
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Check your inbox for a password reset link. It may take a minute to arrive.
              </p>
              <Link
                href="/auth"
                className="block text-center text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Remember your password?{" "}
                <Link
                  href="/auth"
                  className="underline underline-offset-2 text-foreground"
                >
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
