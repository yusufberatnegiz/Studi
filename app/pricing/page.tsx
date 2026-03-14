import Link from "next/link";
import { Button } from "@/components/ui/button";

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const FREE_FEATURES = [
  "3 courses",
  "Up to 10 questions per generation",
  "PDF and text uploads",
  "Practice mode with AI grading",
  "Weak topic tracking",
];

const PREMIUM_FEATURES = [
  "Unlimited courses",
  "Up to 30 questions per generation",
  "No file size limit on uploads",
  "All current and future premium features",
];

const COURSE_FEATURES = [
  "30 questions per generation for that course",
  "No file size limit for that course",
  "Unlimited materials for that course",
  "One-time payment — no subscription",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Exai" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-gray-900 dark:text-white tracking-tight">Exai</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth">Sign in</Link>
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link href="/auth?mode=signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
          Pricing
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-zinc-400 max-w-xl mx-auto">
          Start free. Upgrade a single course for $4, or go fully unlimited for $8/month.
        </p>
      </section>

      {/* Plans */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-6 items-stretch">

          {/* Free */}
          <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-7 flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Free forever</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800" asChild>
              <Link href="/auth?mode=signup">Get started free</Link>
            </Button>
          </div>

          {/* Course Upgrade */}
          <div className="rounded-2xl border-2 border-blue-500 bg-white dark:bg-zinc-900 p-7 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Pay per course</span>
            </div>
            <div className="mb-6">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Course Upgrade</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$4</span>
                <span className="text-sm text-gray-400 dark:text-zinc-500 mb-1.5">/ course</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">One-time per course</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {COURSE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" asChild>
              <Link href="/auth?mode=signup">Upgrade a course</Link>
            </Button>
          </div>

          {/* Premium */}
          <div className="rounded-2xl border-2 border-emerald-500 bg-white dark:bg-zinc-900 p-7 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</span>
            </div>
            <div className="mb-6">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Premium</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$8</span>
                <span className="text-sm text-gray-400 dark:text-zinc-500 mb-1.5">/ month</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Cancel anytime</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-zinc-300">
                <IconCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                Everything in Free
              </li>
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-zinc-300">
                  <IconCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
              <Link href="/auth?mode=signup">Get Premium</Link>
            </Button>
          </div>

        </div>

        {/* FAQ-style note */}
        <p className="text-center text-sm text-gray-400 dark:text-zinc-500 mt-10">
          All plans include AI-powered question generation, practice mode, and weak topic tracking.
          <br />
          Questions? Email us at{" "}
          <a href="mailto:support@exai.study" className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors">
            support@exai.study
          </a>
        </p>
      </section>
    </div>
  );
}
