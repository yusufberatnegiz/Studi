"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "signin" | "signup";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin"
  );

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup" || m === "signin") setMode(m);
    if (searchParams.get("notice") === "password-updated") {
      setNotice("Your password has been updated.");
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/app");
    });
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setShowResend(false);
  }

  async function handleResend() {
    setResendLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    if (error) {
      setError("Could not resend confirmation email. Please try again.");
    } else {
      setShowResend(false);
      setNotice("Confirmation email resent. Check your inbox.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!agreedToTerms) {
        setError("You must agree to the Terms of Service and Privacy Policy to create an account.");
        return;
      }
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password") || msg.includes("no user")) {
          setError("Invalid email or password.");
        } else if (msg.includes("email not confirmed")) {
          setError("Please confirm your email address before signing in.");
          setShowResend(true);
        } else {
          setError("Sign in failed. Please try again.");
        }
        setLoading(false);
        return;
      }
      if (rememberMe) {
        localStorage.removeItem("exai_no_remember");
      } else {
        localStorage.setItem("exai_no_remember", "1");
        sessionStorage.setItem("exai_session_alive", "1");
      }
      router.push("/app");
      router.refresh();
    } else {
      const exists = await checkEmailExists(email);
      if (exists) {
        setError("An account with this email already exists. Try signing in.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: "https://www.exai.study/auth/confirmed" },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("user already") ||
          msg.includes("email already") ||
          msg.includes("already in use") ||
          msg.includes("duplicate") ||
          (error as { status?: number }).status === 422
        ) {
          setError("An account with this email already exists. Try signing in.");
        } else if (msg.includes("password") && msg.includes("weak")) {
          setError("Password is too weak. Use at least 8 characters.");
        } else {
          setError("Could not create account. Please try again.");
        }
        setLoading(false);
        return;
      }
      if (!data.session) {
        setNotice("Check your email to confirm your account, then sign in.");
        setLoading(false);
        return;
      }
      router.push("/app");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="Exai" className="h-8 w-8 object-contain" />
        <span className="font-semibold text-gray-900 dark:text-white tracking-tight text-lg">Exai</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to your Exai account."
              : "Start practising smarter today."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <div className="space-y-1">
              <Input
                type="password"
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              {mode === "signin" && (
                <div className="text-right">
                  <Link
                    href="/reset-password"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {mode === "signin" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="shrink-0 accent-blue-600"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground">Remember me</span>
              </label>
            )}

            {mode === "signup" && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 shrink-0 accent-blue-600"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="underline underline-offset-2 text-foreground hover:text-foreground/80">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" target="_blank" className="underline underline-offset-2 text-foreground hover:text-foreground/80">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {showResend && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="text-sm text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {resendLoading ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-xs text-center text-muted-foreground">
            {mode === "signin"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              className="underline underline-offset-2 text-foreground"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
